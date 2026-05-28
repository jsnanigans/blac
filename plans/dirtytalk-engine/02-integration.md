# 02 — Integration pass

**Phase:** 2 (sequential — runs after **all** Phase 1 commits land)
**Model:** Sonnet 4.6
**Effort:** medium (toolchain verification + one cross-unit test; expect some plumbing fixes)
**Estimated touch:** 1–3 files

---

## Goal

Confirm the four Phase 1 units integrate cleanly:
1. The full `vp check` + `vp test` pass for the package.
2. The build (`vp run build`) emits the expected dual ESM/CJS + dual `.d.ts`/`.d.cts` for both `index` and `primitives` entries.
3. `publint` (via `vp run verify`) is clean.
4. **One** end-to-end integration test exercises `Signal` + `DirtyChannel` + a real `Scheduler` (`SyncScheduler`) together, proving the three units compose at the package surface.

This task is also the only opportunity (in this plan) to make small cross-cutting fixes that fell through the cracks — e.g. if `src/index.ts` is missing an export, or if two test files have conflicting global setup.

---

## Inputs — read these first

1. The four Phase 1 commits (`git log --oneline -- packages/dirtytalk-engine`).
2. `dirtytalk/01-engine.md` § "API sketch" — the surface should match exactly.
3. `packages/dirtytalk-engine/src/index.ts` — barrel exports.
4. `~/.claude/CLAUDE.md` — commit format.

---

## Permitted write set

This is the **only** task that may touch any file in `packages/dirtytalk-engine/`, but the expected scope is small:

```
packages/dirtytalk-engine/src/integration.test.ts        (CREATE — required)
packages/dirtytalk-engine/src/index.ts                   (edit only if exports are missing/wrong)
```

If any other file needs editing (e.g. a typo in one of the impl files), prefer a **separate follow-up commit** with `fix(dirtytalk-engine):` scope so the integration commit stays tight.

If you need to touch `package.json`, `vite.config.ts`, or `tsconfig*.json`, **stop and report first** — those were locked in Phase 0 and changes here suggest a scaffolding bug worth surfacing.

---

## Integration test — `src/integration.test.ts`

One test file. Three test cases minimum. Use the real exports from the package barrel (`import { Signal, DirtyChannel, SyncScheduler } from '..'` or `'./index'`).

### Test 1 — `Signal` is a usable observable

- Construct `new Signal(0)`.
- Subscribe with a spy.
- Set value to 1, then to 1 again, then to 2.
- Assert spy called twice with values `[1, 2]` (the second `=1` should be deduped by default `Object.is`).

### Test 2 — `DirtyChannel` with a hand-rolled bitset Space + `SyncScheduler`

Reuse the `NumberBitsetSpace` shape from `dirty-channel.test.ts`:

```ts
const NumberBitsetSpace = {
  empty: () => 0,
  isEmpty: (r: number) => r === 0,
  union: (a: number, b: number) => a | b,
  intersects: (i: number, d: number) => (i & d) !== 0,
};
```

- Construct `new DirtyChannel(NumberBitsetSpace, new SyncScheduler())`.
- Subscribe two consumers with interests `0b001` and `0b010`.
- `mark(0b001)` synchronously (SyncScheduler flushes immediately).
- Assert only the first consumer's cb was invoked, with dirty value `0b001`.
- `mark(0b010)` → only the second consumer fires.
- `mark(0b011)` → both fire.

### Test 3 — `Signal` driving `DirtyChannel` (the realistic shape)

This is the headline test: a Signal change propagates into a DirtyChannel which then notifies subscribers. This is roughly how a Bloc consumer would wire things up.

- One `Signal<number>` for a counter.
- One `DirtyChannel<number>` with `SyncScheduler`.
- Signal subscriber: on each new value, `channel.mark(1)`.
- Channel subscriber with interest `() => 1`: on flush, push the current Signal `peek()` into an array.
- Drive the Signal: set 1, set 2, set 3.
- Assert the channel subscriber observed values `[1, 2, 3]`.

(With `SyncScheduler`, each `mark` flushes immediately, so each Signal write produces one channel notification. With `MicrotaskScheduler` we'd see coalescing; that's not exercised here — leave to consumer tests.)

---

## Cycle (check → verify → test → fix-if-needed → commit)

1. **Check.**
   - `git status` clean.
   - `git log --oneline packages/dirtytalk-engine | head -10` — expect 5 commits in order: scaffold, then signal/schedulers/dirty-channel/readme (any order).
   - All four Phase 1 commits present? If not, **stop and report** — Phase 2 cannot run partially.

2. **Verify package shape.**
   - `cd packages/dirtytalk-engine`.
   - `vp run typecheck` — must pass.
   - `vp run lint` — must pass. (Fix any newly-introduced cross-file lint issues here; expected to be zero.)
   - `vp run format:check` — must pass.

3. **Write the integration test.** Per spec above.

4. **Test.**
   - `vp run test` — full suite, all files, all green. (This includes primitives.test, scheduler.test, dirty-channel.test, integration.test.)
   - If any pre-existing test is flaky/broken, identify which Phase 1 commit introduced it and either: (a) fix here with a separate `fix(...)` commit, or (b) stop and report.

5. **Verify build.**
   - `vp run build` — produces `dist/index.{js,cjs,d.ts,d.cts}` and `dist/primitives.{js,cjs,d.ts,d.cts}`. Confirm both sets exist.
   - `vp run verify` (publint) — clean.
   - `vp run clean` to drop `dist/` before commit.

6. **Cross-check the surface.** Compare exports in `dist/index.d.ts` (build it locally to inspect; clean again before commit) against `dirtytalk/01-engine.md` § "API sketch". Required exports:
   - `Observable` (type)
   - `Signal` (class)
   - `Space` (type)
   - `Scheduler` (type)
   - `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, `RAFScheduler` (classes)
   - `DirtyChannel` (class)

   If anything is missing, edit `src/index.ts` to add it. Document in commit body if you did.

7. **Commit(s).**
   - **Main commit:**

     ```
     test(dirtytalk-engine): add cross-unit integration test
     ```

   - If you had to make a fix during the pass, that goes in a separate commit before the test commit:

     ```
     fix(dirtytalk-engine): <what>
     ```

   - No co-author on any commit.

---

## Acceptance criteria

- [ ] `vp run typecheck`, `vp run lint`, `vp run format:check`, `vp run test`, `vp run verify` all pass.
- [ ] `vp run build` produces both `index.*` and `primitives.*` outputs in both ESM + CJS, with matching `.d.ts` and `.d.cts`.
- [ ] All test cases (across all four test files) pass.
- [ ] The integration test imports only from the public package barrel (no deep imports into source files).
- [ ] Surface exports match `01-engine.md` § "API sketch" exactly.

---

## Pitfalls

- **Don't replace any Phase 1 implementation.** This task validates and integrates; it doesn't rewrite. If something is wrong, surface it (open a follow-up task) rather than silently fixing complex logic.
- **Real schedulers in the integration test.** Use `SyncScheduler` from the package, not a hand-rolled stub — the whole point is to prove the published units compose.
- **No new runtime deps.** If the integration test makes you want to install a polyfill, you've taken a wrong turn.
- **`dist/` must not be in the commit.** Run `vp run clean` before commit. The `.gitignore` should cover it, but verify with `git status` before `git commit`.
- **Don't add an `examples/` directory or a `docs/` directory in this pass.** That's not in scope and bloats the package.
- **Don't bump the version.** Stays at `0.0.1`. Versioning + changesets are out of scope.
