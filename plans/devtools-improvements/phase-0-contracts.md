# Phase 0 — Contracts & shared primitives

**Model:** Sonnet 4.6 · **Effort:** low · **Runs:** first, alone (blocks Phase 1+)
**Changeset:** ✔ (touches `@blac/devtools-connect` + `@blac/devtools-ui`)

## Why this phase exists

Phase 1 lanes run in parallel. To keep them from fighting over shared files, this
phase takes **sole ownership** of every type-file edit, every new
`DevToolsLayoutBloc` state field, and the shared `CopyButton`. After Phase 0,
later lanes only read these — they never edit type files or layout state.

## Files (read first, then edit/create)

- `packages/devtools-ui/src/components/CopyButton.tsx` _(new)_
- `packages/devtools-ui/src/utils/clipboard.ts` _(new)_
- `packages/devtools-ui/src/types.ts` — `ConsumerInfo`, `RefHolderInfo`, `InstanceData`
- `packages/devtools-ui/src/blocs/DevToolsLayoutBloc.ts` — UI-pref state
- `packages/devtools-connect/src/types/index.ts` — `ConsumerInfo`, `RefHolderInfo`
- `apps/devtools-extension/src/panel/comm.ts` — wire types `ConsumerInfo`, `RefHolderInfo`, `PanelInstance`
- `packages/devtools-ui/src/theme.ts` — read for token names (don't edit)

## Tasks

### 1. Clipboard util + CopyButton

`utils/clipboard.ts`: a `copyText(value: string): Promise<boolean>` helper using
`navigator.clipboard.writeText` with a `try/catch` returning `false` on failure
(the panel runs in a devtools iframe — clipboard can reject).

`components/CopyButton.tsx`: a tiny `FC<{ value: string | (() => string); title?: string; size?: number }>`
that renders a clickable 📋-style glyph (use a unicode clipboard char or a small
inline SVG), calls `copyText`, and shows a transient ✓ for ~1s on success. Style
with `T` tokens (`T.text2` idle, `T.success` on copied), `fontSize` ~10px,
`cursor: pointer`, `background: transparent`. `value` may be a thunk so callers
can defer `JSON.stringify` until click. Stop event propagation on click (rows are
clickable).

### 2. Add `componentLabel` to the consumer/ref-holder contracts

A best-effort human label (component name / source frame) populated by Phase 1A.
Add the **optional** field in all three layers, keeping shapes identical:

- `packages/devtools-connect/src/types/index.ts` — on `ConsumerInfo` and `RefHolderInfo`:
  ```ts
  /** Best-effort source label (component name / top app frame). */
  componentLabel?: string;
  ```
- `packages/devtools-ui/src/types.ts` — same field on its `ConsumerInfo` and `RefHolderInfo`.
- `apps/devtools-extension/src/panel/comm.ts` — same field on its `ConsumerInfo` and `RefHolderInfo`.

### 3. Pre-add all new `DevToolsLayoutBloc` state + toggles

So Phase 1C / Phase 2 / Phase 3 only _call_ these, never edit the bloc.
Add to `LayoutState` (with sensible defaults in the constructor) and add matching
setters/togglers:

```ts
// detail panel sections (Phase 2 / Phase 3)
isDebugInfoExpanded: boolean;     // default false
isRefHoldersExpanded: boolean;    // default false
isChurnExpanded: boolean;         // default false
// instance list controls (Phase 1C)
instanceSort: 'created' | 'updated' | 'size' | 'updateRate' | 'className'; // default 'created'
quickFilters: string[];           // active toggle keys, default []
```

Provide: `toggleDebugInfoExpanded`, `toggleRefHoldersExpanded`,
`toggleChurnExpanded`, `setInstanceSort(sort)`, `toggleQuickFilter(key)`.
Mutate via `this.patch({ ... })` exactly like the existing toggles.

> If `quickFilters`/search already live in `DevToolsSearchBloc`, put
> `quickFilters` + `instanceSort` there instead and note it at the top of
> `phase-1c-instance-list.md` so 1C reads the right bloc. Check before deciding.

## Cycle

Follow the **Shared agent protocol** in `README.md`:
CHECK → IMPLEMENT → VERIFY (`format` → `format:check` → `lint` → `typecheck` for
**both** `@blac/devtools-ui` and `@blac/devtools-connect`) → TEST
(`pnpm --filter @blac/devtools-ui test`) → COMMIT.

- Changeset (`.changeset/devtools-contracts.md`): bump `@blac/devtools-ui` and
  `@blac/devtools-connect` `patch` — "Add CopyButton primitive and optional
  componentLabel field to consumer/ref-holder devtools metadata."
- Commit: `feat(devtools-ui): add CopyButton and component-label contract`
- Stage explicit paths only.

## Done when

- New files compile and export cleanly; types added in all 3 layers stay in sync.
- Layout bloc exposes the new state + actions; existing tests pass.
- No other devtools file changed.
