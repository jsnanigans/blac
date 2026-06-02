# C4 — Port `@blac` decorator, `configureBlac`, and static-prop helpers

**Phase:** C (parallel after C0; safe alongside C1, C2, C3)
**Model:** Sonnet 4.6
**Effort:** low (mostly preservation; light verification)
**Estimated touch:** 4-5 files

---

## Goal

Verify and patch the `@blac()` class decorator, `configureBlac()` global config, `shallowEqualState`, and the static-prop reader utilities (`isKeepAliveClass`, `isExcludedFromDevTools`, `isIsolatedClass`) so they keep working with C0's new container. Mostly mechanical: signatures and runtime behavior preserved.

---

## Inputs — read these first

1. `packages/blac-core/src/decorators/index.ts` and any nested files.
2. `packages/blac-core/src/config.ts` — `configureBlac`, `getBlacConfig`, `resetBlacConfig`, `shallowEqualState`.
3. `packages/blac-core/src/utils/static-props.ts` — `isKeepAliveClass`, `isExcludedFromDevTools`, `isIsolatedClass`.
4. `packages/blac-core/src/constants.ts`.
5. `packages/blac-core/src/core/StateContainer.ts` (after C0) — how static props are read at construct-time.
6. `~/.claude/CLAUDE.md` — commit format.

---

## What's likely to need updating

- **`@blac({ keepAlive, excludeFromDevTools, instanceId })`** sets static fields on the class that `StateContainer` reads. C0's constructor must still respect them. If C0 already reads via `getClassEquality`/`isKeepAliveClass` etc., no change here. If C0 inlined the reads, factor back into helpers and keep this file thin.
- **`configureBlac({ debug, equality, ... })`** — drop `equality` if A2 audit shows no caller uses it (the new model puts per-path equality on `StructuralContainerOptions.equality`, not global config). Keep `debug`.
- **`shallowEqualState`** — likely **delete**. Structural uses `Object.is` per path; shallow-state-level equality is no longer the comparison primitive. Verify no test or production caller relies on it. Audit will say.
- **Static-prop helpers** — likely unchanged. They just read `Ctor.__keepAlive` etc. Verify each one is still called from somewhere; delete any orphans.

---

## Owned files (write set)

```
packages/blac-core/src/decorators/**
packages/blac-core/src/config.ts
packages/blac-core/src/utils/static-props.ts
packages/blac-core/src/constants.ts
```

**Do not touch:** `core/*` (C0), `registry/*` (C1), `plugin/*` (C2), `watch/*` and `tracking/*` (C3), `src/index.ts` (C0 owns).

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - C0 has committed.
   - A2 audit doc exists.

2. **Implement.**
   - Re-read each owned file.
   - Verify each export is still imported by something post-C0/C1/C2/C3. Delete orphans.
   - Update JSDoc on `configureBlac` if `equality` was removed.
   - `@blac()` decorator: keep `keepAlive`, `excludeFromDevTools`, `instanceId`, `isolated` if they still exist (they did pre-migration). If `isolated` was removed previously (per memory: "isolated was removed — use instanceId"), don't reintroduce it.
   - `shallowEqualState`: delete if audit shows no caller, OR keep and mark `@deprecated` if a caller exists in `@blac/compat`.

3. **Verify.**
   - `vp run typecheck` from `packages/blac-core/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - If `decorators/` has tests, run them: `vp run test src/decorators/`.
   - Otherwise, this task has no dedicated tests — C5 covers via the broader suite.

5. **Commit.**

   ```
   refactor(blac-core): port @blac decorator and configureBlac
   ```

   Body if symbols removed:

   ```
   - shallowEqualState removed (no consumers post-migration).
   - configureBlac({ equality }) option removed; per-path equality lives on
     StructuralContainerOptions per A1/A3.
   ```

---

## Acceptance criteria

- [ ] `@blac()` decorator with documented options (`keepAlive`, `excludeFromDevTools`, `instanceId`) works against the new `StateContainer`.
- [ ] `configureBlac` / `getBlacConfig` / `resetBlacConfig` keep their public signatures (minus removed options).
- [ ] Static-prop readers (`isKeepAliveClass` etc.) still return correct values.
- [ ] No orphaned exports.
- [ ] Decorator tests pass.

---

## Pitfalls

- **`@blac()` is a class decorator** — TS decorator semantics changed between TC39 stage 2 and stage 3. Don't migrate decorator syntax versions in this commit; preserve whatever pattern blac-core uses today.
- **Static fields set by decorator** — must be set on the _original_ class, not on a wrapper. Verify the decorator doesn't return a subclass that hides static props from `instance.constructor` lookups.
- **`isolated` was removed** — per the memory note. Don't reintroduce. If `apps/examples` still uses it, that's a G0 fix.
- **`configureBlac` reset semantics** — `resetBlacConfig` is used between tests. Verify the reset clears whatever fields you kept.
- **`shallowEqualState` deletion**. Check `@blac/compat/src/`. If compat imports it, keep + mark `@deprecated`. The "don't touch compat" rule applies to compat's source, but if compat needs this export, you must keep exporting it.
