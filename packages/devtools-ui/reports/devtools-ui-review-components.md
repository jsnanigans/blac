# Investigation: DevTools UI Component/UX Review

## Bottom Line
**Root Cause**: The list/tree views mix virtualized and non-virtualized rendering inconsistently, drag/resize use raw `mousemove`/`mouseup` without pointer capture (breaks over iframes and off-window drags), and read-only JSON display is pinned to an alpha dependency used only for display (easily replaceable).
**Fix Location**: `src/components/InstanceList.tsx:123` (no virtualization), `src/DraggableOverlay.tsx:337-357` (drag), `src/components/CurrentStateView.tsx:3` (alpha dep usage)
**Confidence**: High

## What's Happening
`InstanceList` and `StateHistoryView` render every item with plain `.map()` while `LogsView` correctly uses `@tanstack/react-virtual`. Drag/resize handlers in `DraggableOverlay.tsx` and `DevToolsPanel.tsx`'s `ResizeDivider` attach `mousemove`/`mouseup` to `window` with no pointer capture and no viewport clamping, so a `mouseup` over a cross-origin iframe in the host page never fires and the panel keeps following the cursor; dragging past the viewport edge has no clamp, so the panel (and its only drag handle, the header) can be pushed fully off-screen with no reset.

## Why It Happens
**Primary Cause**: `@tanstack/react-virtual` (`package.json:70`) is only wired into `LogsView.tsx:497`; `InstanceList.tsx` and `StateHistoryView.tsx` were never migrated, so any host app with hundreds of bloc instances/snapshots renders them all synchronously on every `instance-updated`/`instance-created` event.
**Trigger**: `src/DraggableOverlay.tsx:340-345` — `handleMouseMove` unconditionally calls `setPosition` from a `window` listener; nothing calls `e.target.setPointerCapture` or clamps to `window.innerWidth/innerHeight`.
**Decision Point**: `src/components/EditableJsonTree.tsx:184-274` — `JsonNode` is a plain (non-memoized) recursive component; every keystroke-commit or host state emit gives `CurrentStateView` a new `state` reference, so the whole expanded tree re-renders (bounded only by the `depth > 2` auto-collapse default).

## Evidence
- **Key File**: `src/components/InstanceList.tsx:123` — `group.instances.map(...)` with no window/virtualizer, despite the package depending on `@tanstack/react-virtual`.
- **Key File**: `src/DraggableOverlay.tsx:290-325` — global `keydown` listener toggles/closes on `Alt+D`/`Escape` for the whole host page; only `Escape` checks `isEditableTarget`, so `Alt+D` can collide with host/browser shortcuts.
- **Key File**: `src/components/InstanceList.tsx:38-61` and `src/components/StateDiffView.tsx:38-95` — raw `<style>` blocks with unscoped global selectors (`.sweep-line`, `.json-diff-viewer td.line-modify`, etc.) injected wherever the component renders; combined with the unscoped `json-diff-kit/dist/viewer.css` import, this can leak into or collide with host-app CSS since there's no Shadow DOM/CSS Modules boundary.
- **Search Used**: `rg "react-virtual|useVirtualizer" src` — only one hit, confirming `InstanceList`/`StateHistoryView` don't virtualize.
- **Key File**: `src/components/CurrentStateView.tsx:2-3,189,246,175` — `@uiw/react-json-view` (`2.0.0-alpha.43`) is used purely as a read-only tree renderer (editing goes through the in-house `EditableJsonTree`), so it's a low-effort swap for an in-house/stable replacement.

## Next Steps
1. Virtualize `InstanceList` (and cap/virtualize `StateHistoryView`, which is bounded to 50 but still renders 50 full `JsonView` trees at once) using the already-installed `@tanstack/react-virtual`.
2. Add pointer capture (`onPointerDown`/`setPointerCapture`) and viewport clamping to `DraggableOverlay`'s drag/resize and `DevToolsPanel.tsx`'s `ResizeDivider`; add a "reset position" affordance.
3. Wrap `JsonNode` in `React.memo` (or debounce state prop updates while a JSON tree is expanded) to avoid full-tree re-renders on rapid host emits.
4. Replace `@uiw/react-json-view` read-only usages with a non-editable variant of the existing `EditableJsonTree` renderer to drop the alpha dependency.
