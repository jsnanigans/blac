# F0 — Update `logging-plugin` for new plugin event payload

**Phase:** F (parallel after E0; safe alongside F1, F2)
**Model:** Sonnet 4.6
**Effort:** medium (plugin event signature change + `PathSet` decoding)
**Estimated touch:** 4-5 files

---

## Goal

`@9amhealth/blac-logging-plugin` consumes `BlacPlugin` events. C2 changed the `onStateChange` signature to include `paths: PathSet`. Update the plugin and its formatters to:

1. Accept the new signature.
2. Optionally log which paths changed (using `container.interner.lookup(id)` to decode).
3. Keep existing log output shape stable by default (paths logging is opt-in via plugin config).

---

## Inputs — read these first

1. `packages/logging-plugin/src/LoggingPlugin.ts`.
2. `packages/logging-plugin/src/formatters/{Grouped,Simple}Formatter.ts`.
3. `packages/logging-plugin/src/types.ts`.
4. `packages/blac-core/src/plugin/BlacPlugin.ts` (after C2) — new interface.
5. `packages/dirtytalk-structural/src/index.ts` — `ALL_PATHS`, `PathSet`, `PathInterner` exports.
6. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

Add `logPaths?: boolean` to the plugin config (default `false`). When `true`, the formatter includes the changed path strings in the log line.

```ts
onStateChange(ctx: PluginContext, prev: unknown, next: unknown, paths: PathSet): void {
  const decoded = this.config.logPaths
    ? decodePaths(paths, ctx.container.interner)
    : undefined;
  this.formatter.formatStateChange({ ctx, prev, next, paths: decoded });
}

function decodePaths(paths: PathSet, interner: PathInterner): string[] {
  if (paths === ALL_PATHS) return ['<all>'];
  return Array.from(paths).map(id => interner.lookup(id));
}
```

Formatters add an optional `paths?: string[]` field to their input.

---

## Owned files (write set)

```
packages/logging-plugin/src/**
```

**Do not touch:** any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - E0 committed (`@blac/adapter` is gone). `vp install` passes.
   - `@blac/core` exports the new `BlacPlugin` interface.

2. **Implement.**
   - Update `onStateChange` signature.
   - Decode paths only when `logPaths` is enabled.
   - Add `logPaths` to plugin config + types.
   - Update formatters.

3. **Verify.**
   - `vp run typecheck` from `packages/logging-plugin/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test` — existing tests + add at least one test asserting `paths` decoded correctly when `logPaths: true`.

5. **Commit.**

   ```
   feat(logging-plugin)!: accept PathSet in onStateChange
   ```

   Body:
   ```
   - Plugin signature aligned with @blac/core C2 changes.
   - New config `logPaths` (default false) opts into path-name logging.
   - Decoded via container.interner.lookup.
   ```

---

## Acceptance criteria

- [ ] `onStateChange` accepts `paths: PathSet`.
- [ ] `logPaths: true` produces a log line containing changed path names.
- [ ] `logPaths: false` (default) keeps log output unchanged from pre-migration.
- [ ] All tests green.

---

## Pitfalls

- **`ALL_PATHS` is a symbol.** `paths === ALL_PATHS` works because it's the same `Symbol.for('@dirtytalk/structural/ALL_PATHS')` re-imported. Don't compare as string.
- **Interner per-class.** `ctx.container.interner` returns the per-class interner — IDs are stable across instances of the same class but not across classes. That's correct; decoding is always relative to the container's class.
- **Don't log paths by default.** Existing tests assert on log output shape; preserving the default avoids breaking them.
- **No need to filter `ALL_PATHS` from the count** — when the diff returned `ALL_PATHS` (single consumer skip), every path is implicitly dirty. Logging shows `<all>` to match.
