---
task: 03-delete-callstack
lane: B (UI package, serial)
parallel_safe: false
model: haiku
effort: low
depends_on: [02-delete-pip]
---

# 03 — Delete CallStackView

`CallStackView` tries to fetch `${baseUrl}.map` to resolve source positions. In production builds, source maps are typically not served, so it silently 404s and shows minified positions anyway. The cost (~290 LOC + `source-map-js` dependency) is not justified.

We **keep** the callstack capture itself in `@blac/devtools-connect` (it's cheap and useful in dev). We only delete the in-UI source-map resolution view. Consumers can read the raw stack from the log entry's data.

## Files to delete

- `packages/devtools-ui/src/components/CallStackView.tsx`

## Files to edit

- `packages/devtools-ui/src/components/index.ts` — remove the `CallStackView` re-export (line ~11).
- `packages/devtools-ui/src/components/LogsView.tsx` — remove the import (line ~7) and the `<CallStackView ... />` render (around line ~199). If the surrounding container becomes empty / pointless, simplify it. If the log entry has a `callstack` field, render it as a collapsible `<pre>` with raw stack text — keep it minimal (no source-map resolution).
- `packages/devtools-ui/src/components/StateHistoryView.tsx` — same treatment as `LogsView`: remove the import (line ~4) and the render (around line ~227). Either drop the callstack display entirely or replace with a plain `<pre>` of raw stack text.
- `packages/devtools-ui/package.json` — remove `source-map-js` from `dependencies` if no other file still imports it (verify with `grep -rn "source-map-js" packages/devtools-ui`).

## Check (before editing)

```sh
grep -rn "CallStackView\|source-map-js\|SourceMapConsumer" packages/devtools-ui
```

Every hit should be something this task removes.

## Decision: keep raw stack or drop entirely?

Default: keep a minimal raw-stack `<pre>` in both `LogsView` and `StateHistoryView` (gated on `entry.callstack` truthiness). That preserves the debugging value without the source-map machinery. If the raw stack is unreadable enough to be useless, drop it — note the choice in the commit body.

## Verify

```sh
pnpm --filter @blac/devtools-ui typecheck
```

## Commit

```
chore(devtools-ui): remove CallStackView and source-map resolution
```

## Checklist

- [ ] Deleted `CallStackView.tsx`.
- [ ] Removed `CallStackView` export from `components/index.ts`.
- [ ] Removed/replaced usage in `LogsView.tsx`.
- [ ] Removed/replaced usage in `StateHistoryView.tsx`.
- [ ] Removed `source-map-js` from `package.json` (if unused).
- [ ] No remaining references to `CallStackView` or `source-map-js`.
- [ ] Typecheck passes.
- [ ] Committed.

## Completion

(Agent fills in after committing.)
