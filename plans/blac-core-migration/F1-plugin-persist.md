# F1 — Update `plugin-persist` for new plugin event + path-level persist

**Phase:** F (parallel after E0; safe alongside F0, F2)
**Model:** Sonnet 4.6
**Effort:** medium (signature update + optional perf optimization)
**Estimated touch:** 3-5 files

---

## Goal

`@9amhealth/blac-plugin-persist` writes container state to IndexedDB. C2 changed `onStateChange` to include `paths: PathSet`. Update the plugin and — as a perf win — optionally **persist only changed paths** instead of the whole state object.

---

## Inputs — read these first

1. `packages/plugin-persist/src/IndexedDbPersistPlugin.ts`.
2. `packages/plugin-persist/src/types.ts`.
3. Any helper modules under `packages/plugin-persist/src/`.
4. `packages/blac-core/src/plugin/BlacPlugin.ts` (after C2).
5. `packages/dirtytalk-structural/src/diff.ts` — `pathsFromPatch` / `getAt` for inverse lookup.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

Minimum: update the signature to accept `paths`.

```ts
onStateChange(ctx, prev, next, paths: PathSet): void {
  this.scheduleWrite(ctx.container, next);
}
```

**Bonus (recommended but optional)**: write a partial doc when `paths !== ALL_PATHS` and `paths.size` is small. Use IndexedDB's per-key writes if the persisted structure is keyed.

Skip the partial-write optimization if:

- The persisted schema is a single blob per container.
- The bonus is non-trivial — leave a TODO.

The required path is signature update only.

---

## Owned files (write set)

```
packages/plugin-persist/src/**
```

**Do not touch:** any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - E0 committed.

2. **Implement.**
   - Update `onStateChange` signature.
   - Add the partial-write optimization if straightforward; otherwise just preserve full-state writes.
   - Update tests.

3. **Verify.**
   - `vp run typecheck` from `packages/plugin-persist/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — green.

5. **Commit.**

   ```
   feat(plugin-persist): accept PathSet in onStateChange
   ```

   Body (optional, if partial writes added):

   ```
   - Plugin signature aligned with @blac/core C2 changes.
   - Partial-write optimization: when paths is a small set, only the
     changed branches are written (instead of the whole state blob).
   ```

---

## Acceptance criteria

- [ ] `onStateChange` accepts `paths: PathSet`.
- [ ] Existing persistence behavior preserved by default.
- [ ] All tests green.

---

## Pitfalls

- **IndexedDB writes are async.** Don't `await` inside `onStateChange` — it must return synchronously. Queue the write.
- **Microtask flush coalescing.** Today's plugin might write once per `emit`. Now it writes once per flush. That's likely a perf win, but if a test counted writes-per-emit, update the expectation.
- **`paths === ALL_PATHS`** path: always do a full-state write.
- **Hydration races**. If the plugin hydrates state from IndexedDB at construct time, hydration should fire before any consumer subscribes. Verify with a unit test that hydration completes before `useBloc` returns the hydrated state.
- **`ctx.container.state`** post-flush. Don't trust the `next` argument over `ctx.container.state` if you're queuing writes asynchronously — by the time the queued write runs, state may have moved again.
