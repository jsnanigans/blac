---
task: 02-delete-pip
lane: B (UI package, serial)
parallel_safe: false
model: haiku
effort: low
depends_on: []
---

# 02 — Delete PictureInPictureDevTools

The PiP feature opens devtools in a native browser Picture-in-Picture window. It works but is platform-restricted (Chrome 116+ only), adds a second React root, requires manual style injection, and duplicates what `DraggableOverlay` already provides. The overlay can be dragged anywhere on screen — that's enough.

## Files to delete

- `packages/devtools-ui/src/PictureInPictureDevTools.tsx`

## Files to edit

- `packages/devtools-ui/src/index.tsx` — remove the `PictureInPictureDevTools`, `isPiPSupported`, and `PictureInPictureDevToolsProps` exports (lines ~15–18 and ~39).
- `packages/devtools-ui/src/BlacDevtoolsUi.tsx` — simplify. The component should now **always** render the overlay. Remove:
  - the `PictureInPictureDevTools` / `isPiPSupported` import
  - the `mode` prop and all PiP branching
  - the `usePiP` / `pipError` state and the conditional render
  - the throw-on-error path
  - the docstring references to PiP

  The simplified component just calls `initOverlay(onMount)` in a `useEffect` and `cleanupOverlay()` on unmount, returns `null`.

## Check (before editing)

```sh
grep -rn "PictureInPicture\|isPiPSupported\|documentPictureInPicture" packages/devtools-ui packages/devtools-connect apps/devtools-extension
```

If any consumer outside `devtools-ui` imports these symbols, stop and report. (Expectation: none — they're only re-exported from the UI package.)

Also remove any docs / README references to PiP within `packages/devtools-ui/`.

## Verify

```sh
pnpm --filter @blac/devtools-ui typecheck
```

## Commit

```
chore(devtools-ui): remove PictureInPictureDevTools
```

## Checklist

- [x] Deleted `PictureInPictureDevTools.tsx`.
- [x] Removed PiP exports from `index.tsx`.
- [x] Simplified `BlacDevtoolsUi` to overlay-only.
- [x] No remaining references to `PictureInPicture`, `isPiPSupported`, or `documentPictureInPicture` in the workspace.
- [x] Typecheck passes.
- [x] Committed.

## Completion

SHA: 0894b991
Files touched: 4
Typecheck result: Clean (pre-existing TS2686 in blac-react, unrelated)
