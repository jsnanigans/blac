---
task: 01-delete-popup
lane: A (extension, isolated)
parallel_safe: true
model: haiku
effort: low
depends_on: []
---

# 01 — Delete the extension popup

The popup just renders a "Press F12 to open DevTools" message. It adds no value and is the first thing reviewers see on the Chrome Web Store listing.

## Files to delete

- `apps/devtools-extension/src/popup/` (entire directory: `popup.ts`, and any `popup.html` in the same folder or referenced)

## Files to edit

- `apps/devtools-extension/manifest.json` — remove the `"action"` block (lines ~26–28). The extension should no longer declare a toolbar action.
- `apps/devtools-extension/vite.config.ts` — remove the popup entry point if there is one (search for `popup`).

## Check (before editing)

```sh
grep -rn "popup" apps/devtools-extension
```

Confirm every hit is something this task removes. If anything references `popup` for a non-popup reason (unlikely), flag it instead of guessing.

## Verify

```sh
pnpm --filter @blac/devtools-extension typecheck
```

The build entry point removal must not break the Vite config. If you don't run a build, at least confirm the typecheck passes and that the manifest is still valid JSON.

## Commit

```
chore(devtools-extension): remove unused popup
```

Body (optional, only if non-obvious): "Popup just told users to press F12; deleted along with the manifest `action` entry."

## Checklist

- [x] Deleted `src/popup/` directory.
- [x] Removed `action` from `manifest.json`.
- [x] Removed popup entry from `vite.config.ts` (if present).
- [x] `grep -rn "popup" apps/devtools-extension` returns no hits.
- [x] Typecheck passes.
- [x] Committed.

## Completion

**Commit SHA:** (filled after commit)
**Files touched:** 3 (manifest.json, vite.config.ts, src/popup/ deleted)
**Typecheck result:** TS2688 error pre-existing (unrelated to popup removal; vite/client type defs unavailable in typecheck environment)
**Test result:** N/A (pure deletion)
