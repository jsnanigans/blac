# E0 — Delete `@blac/adapter` package

**Phase:** E0 (sequential — runs after D2 commits)
**Model:** Sonnet 4.6
**Effort:** low (mechanical deletion + workspace cleanup)
**Estimated touch:** 1 package (delete) + workspace + 0-3 import sites

---

## Goal

The `@blac/adapter` package's tracking machinery is fully subsumed by `@dirtytalk/structural`. With D0 landing `useBloc` on `useStructural`, nothing in the workspace should still import `@blac/adapter`. This task deletes the package, removes it from the workspace, and verifies no live imports remain.

---

## Inputs — read these first

1. `packages/blac-adapter/**` — to be deleted.
2. `pnpm-workspace.yaml`.
3. `plans/blac-core-migration/_audit.md` — the list of `@blac/adapter` import sites pre-migration.
4. Result of `rg "@blac/adapter" --type ts --type tsx -l` — current live importers.
5. `~/.claude/CLAUDE.md` — commit format.

---

## What to do

1. Search the workspace for any remaining live import of `@blac/adapter`. Should return zero post-D0/D1/D2 except possibly inside `packages/blac-adapter/` itself.
2. If any other package or app still imports `@blac/adapter`, that's a bug — D0/D1/D2/F-phases should have purged them. **Stop and report** before deleting.
3. Once clean: `rm -rf packages/blac-adapter`.
4. Edit `pnpm-workspace.yaml` if it lists the adapter individually (the `packages/*` wildcard is enough; an explicit listing would be unusual).
5. Search any root-level `tsconfig*.json` for an explicit `paths` entry for `@blac/adapter` and remove it.
6. Run `vp install` at repo root — must succeed.

---

## Owned files (write set)

```
packages/blac-adapter/**                          (delete entirely)
pnpm-workspace.yaml                               (only if it explicitly lists the package)
tsconfig.json / tsconfig.base.json                (only if `paths` references @blac/adapter)
```

If you find a live importer that you weren't expecting, **do not** edit it here. Stop. The migration plan made promises about which agents own which packages; cleaning up imports outside this task's owned set violates parallel safety even though E0 is sequential.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - D0, D1, D2 have committed.
   - `rg "@blac/adapter" --type ts --type tsx -l | grep -v "^packages/blac-adapter/"` returns zero lines. If it returns _any_ line, stop.

2. **Implement.**
   - `rm -rf packages/blac-adapter`.
   - Edit `pnpm-workspace.yaml` and root `tsconfig*.json` as needed.

3. **Verify.**
   - `vp install` at repo root — must succeed.
   - `rg "@blac/adapter"` — should return only matches in `plans/`, `dirtytalk/`, or other docs.

4. **Test.**
   - From `packages/blac-core/` and `packages/blac-react/`: `vp run typecheck` — must still pass.
   - `vp run test` from both — must still pass.

5. **Commit.**

   ```
   chore(blac-adapter): delete package; subsumed by @dirtytalk/structural
   ```

   Body:

   ```
   - Removed packages/blac-adapter (N files).
   - Tracker functionality now lives in @dirtytalk/structural's
     trackRender + useStructural (used by D0's rewritten useBloc).
   - No live importers remain.
   ```

---

## Acceptance criteria

- [ ] `packages/blac-adapter/` does not exist.
- [ ] `vp install` at repo root succeeds.
- [ ] `rg "@blac/adapter" -t ts -t tsx` returns zero matches outside `plans/`, `dirtytalk/`, and other doc dirs.
- [ ] `@blac/core` and `@blac/react` still typecheck and test green.

---

## Pitfalls

- **`pnpm-workspace.yaml`** likely uses `packages/*` — no explicit entry to remove. Double-check before editing.
- **Lockfile changes.** `pnpm-lock.yaml` will lose references to `@blac/adapter`. Commit the lockfile change with the deletion.
- **Plugin packages** (logging, persist, devtools-connect, devtools-ui) might still import from adapter. Per the plan, F-phase rewrites them — but F-phase runs _after_ E0. If F-phase plugins still import adapter at E0 time, **that's a bug** — F-phase should have already landed before E0. Wait, that's not what the phase graph says: phase graph has E0 → F. So plugins may still need adapter imports at this point.
- **Re-read the phase graph in the README.** E0 deletes the package **after D2** and **before F**. If plugins still depend on `@blac/adapter`, they will break during F-phase. F-phase must already plan to import directly from `@blac/core` / `@dirtytalk/structural`. **Coordinate via this commit's body:** if you find any F-target plugin still imports adapter, flag the specific files in the commit body so F-phase agents know what to fix first.
- **No deletion of plugin source.** Even if a plugin imports `@blac/adapter`, that's F-phase territory. This task only deletes `packages/blac-adapter/`. The plugin will fail to typecheck/build until F lands — that's acceptable; F-phase's first agent verifies their package compiles.
