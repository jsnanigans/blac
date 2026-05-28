# 05 — Integration pass

**Phase:** 5 (sequential — runs after **all** prior commits land)
**Model:** Sonnet 4.6
**Effort:** medium (toolchain verification + one cross-unit test; expect some plumbing fixes)
**Estimated touch:** 1–3 files

---

## Goal

Confirm the package's five implementation units integrate cleanly end-to-end:

1. Full `vp run {typecheck,lint,format:check,test,build,verify}` pass.
2. Build emits the expected dual ESM/CJS + dual `.d.ts`/`.d.cts` for both `index` and `react` entries.
3. `publint` clean.
4. **One** cross-unit integration test exercises a real `StructuralContainer` instance with `useStructural` driving the channel and the React tree, proving the units compose at the package surface.

This is also the only opportunity (in this plan) to make small cross-cutting fixes that fell through the cracks.

---

## Inputs — read these first

1. `git log --oneline -- packages/dirtytalk-structural` — expect at least: scaffold, path-interner, path-set, readme, tracker, diff, container, react-adapter (plus possibly a prep commit for React deps). 8–10 commits.
2. `dirtytalk/03-blac.md` § "API sketch" (the file doesn't have an explicit section by that name — derive the surface from the React adapter sketch + the `Bloc<S>` class shape).
3. `packages/dirtytalk-structural/src/index.ts` and `src/react.ts` — final barrel state.
4. `~/.claude/CLAUDE.md` — commit format.

---

## Permitted write set

```
packages/dirtytalk-structural/src/integration.test.ts   (CREATE — required)
packages/dirtytalk-structural/src/index.ts              (edit only if exports missing/wrong)
packages/dirtytalk-structural/src/react.ts              (edit only if exports missing/wrong)
```

Any other touch (typo fixes in implementation files, vite.config corrections, package.json fixes) must be a **separate `fix(dirtytalk-structural):` commit** preceding the integration commit. Don't bundle.

If `package.json`, `tsconfig*.json`, or `vite.config.ts` need editing, **stop and report** — those were locked in Phase 0 and any change suggests a scaffolding bug worth surfacing.

---

## Integration test — `src/integration.test.ts`

One file, three test cases minimum. Use public package barrel imports only (`from './index'` and `from './react'`), no deep imports into implementation files.

Test environment: `jsdom` (the test contains React).

### Test 1 — Core flow without React

Container + tracker + diff + channel, no React.

- Define `class TodoStore extends StructuralContainer<{ todos: Array<{ id: number; text: string; done: boolean }>; filter: 'all' | 'active' }>`.
- Construct with `SyncScheduler` so writes flush immediately.
- Manually `subscribe(() => interestSet, cb)` with two distinct interests. Track received dirty sets in arrays.
- `patch({ filter: 'active' })` → only the filter-interested subscriber fires.
- `patch({ todos: [...newList] })` → only the todos-interested subscriber fires.
- `emit({ ...state, filter: 'all' })` with two consumers registered (via `registerConsumerPaths` mock) → the filter-interested consumer fires, the todos one does not.

### Test 2 — React flow

`useStructural` + React tree + container + real path tracking.

- `class CounterStore extends StructuralContainer<{ count: number; label: string }>`.
- Mount a component reading `state.count` only (a render-counter ref tracks re-renders).
- `c.patch({ count: 1 })` → component re-renders.
- `c.patch({ label: 'x' })` → component does **not** re-render.
- `c.patch({ count: 2 })` → component re-renders.
- Final render count: 3 (initial mount + 2 count patches).
- Final visible state in the DOM reflects the latest count.

### Test 3 — Two consumers, source-diff isolation

- `class UserStore extends StructuralContainer<{ profile: { name: string; email: string }; preferences: { theme: 'light' | 'dark' } }>`.
- Mount two components: `ProfileCard` reads `state.profile.name`; `ThemeBadge` reads `state.preferences.theme`.
- `c.patch({ profile: { name: 'new' } })` → `ProfileCard` re-renders, `ThemeBadge` does NOT.
- `c.patch({ preferences: { theme: 'dark' } })` → `ThemeBadge` re-renders, `ProfileCard` does NOT.
- `c.emit({ profile: { name: 'newer', email: c.state.profile.email }, preferences: c.state.preferences })` → with two consumers, source-diff runs; only `ProfileCard` re-renders.

---

## Cycle (check → verify → test → fix-if-needed → commit)

1. **Check.**
   - `git status` clean.
   - All prior phases' commits present in `git log packages/dirtytalk-structural --oneline`.
   - `grep -r "not implemented" packages/dirtytalk-structural/src/` returns empty.

2. **Verify package shape.**
   - `vp run typecheck` — pass.
   - `vp run lint` — pass.
   - `vp run format:check` — pass.

3. **Write the integration test.** Per spec above.

4. **Test.**
   - `vp run test src/integration.test.ts` — your tests pass.
   - `vp run test` — full suite (interner + path-set + tracker + diff + container + react-hook + integration) all green.

5. **Verify build.**
   - `vp run build` — produces `dist/index.{js,cjs,d.ts,d.cts}` and `dist/react.{js,cjs,d.ts,d.cts}`. Confirm all eight files exist.
   - `vp run verify` (publint) — clean.
   - `vp run clean`.

6. **Cross-check the surface.** Compare exports against `plans/dirtytalk-structural/README.md` § "Acceptance criteria":
   - **Core:** `StructuralContainer`, `PathInterner`, `PathSet`, `PathSetSpace`, `ALL_PATHS`, `pathSetUnion`, `pathSetEquals`, `trackRender`, `diffAlongSkeleton`, `pathsFromPatch`, `getAt`.
   - **React:** `useStructural`.
   - **Types:** `PathId`, `ConsumerId`, `AllPaths`, `TrackResult`, `StructuralContainerOptions`.

   If anything is missing, edit the relevant barrel and document in the commit body.

7. **Commit(s).**

   - **Main commit:**
     ```
     test(dirtytalk-structural): add cross-unit integration test
     ```
   - Any fixes from step 6 go in a separate prior commit:
     ```
     fix(dirtytalk-structural): <what>
     ```

   No co-author on any commit.

---

## Acceptance criteria

- [ ] `vp run {typecheck,lint,format:check,test,build,verify}` all pass.
- [ ] `vp run build` produces both `index.*` and `react.*` outputs in ESM + CJS, with matching `.d.ts` and `.d.cts`.
- [ ] All test files green: `path-interner.test.ts`, `path-set.test.ts`, `tracker.test.ts`, `diff.test.ts`, `container.test.ts`, `react-hook.test.ts`, `integration.test.ts`.
- [ ] Integration test imports only from `./index` and `./react` (no deep paths into source modules).
- [ ] Surface exports match the plan README's listed surface.

---

## Pitfalls

- **Don't replace any prior implementation.** This task validates and integrates; it doesn't rewrite. If something is wrong, surface it via a `fix(...)` commit, not a silent rewrite.
- **Real `SyncScheduler` in the core test.** Use the engine's actual `SyncScheduler`. The whole point is to prove published units compose end-to-end.
- **No new runtime deps.** If the integration test needs a polyfill or extra library, you've taken a wrong turn.
- **`dist/` must not be committed.** `vp run clean` before commit; verify with `git status`.
- **Don't add `examples/` or `docs/`.** Out of scope.
- **Don't bump versions.** Stays at `0.0.1`. Changesets are out of scope.
- **Don't import from `@dirtytalk/structural`** (the published name) in the test — use relative `./index`. Self-import via published name fails publint.
- **If `react-hook.test.ts` flakes under jsdom but `integration.test.ts` is stable**, suspect the test runner's environment-per-file config in `vite.config.ts`. The integration test reuses the same jsdom-pattern config; if integration is fine and the unit test isn't, fix the unit test config in a `fix(...)` commit.
