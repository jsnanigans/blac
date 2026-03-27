# DX Polish — Copy, Keyboard Nav, Export, State Search

Quality-of-life improvements that make the devtools feel professional and efficient for daily use.

---

## Phase 1: Copy to Clipboard

**Goal:** Let developers quickly grab state values, diffs, and log entries without manually selecting text.

### Tasks

- [ ] **Create a shared `copyToClipboard` utility**
  - Use `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')` (for non-secure contexts like extension panels)
  - Show brief visual feedback: "Copied!" toast or icon change (checkmark for 1.5s)
  - Place in `devtools-ui/src/utils/clipboard.ts`

- [ ] **Add copy button to CurrentStateView**
  - Small icon button in the section header (top-right)
  - Copies the full current state as formatted JSON (`JSON.stringify(state, null, 2)`)

- [ ] **Add copy button to StateDiffView**
  - Copy the diff output (changes-only or full, depending on active mode)
  - Format as readable text diff, not raw JSON

- [ ] **Add copy button to StateHistoryView entries**
  - Per-entry copy button: copies that snapshot's state as JSON
  - "Copy all history" button in section header: copies full history array

- [ ] **Add copy button to LogsView entries**
  - Per-entry: copies the log entry as formatted text (timestamp, type, class, data)
  - "Copy filtered logs" button: copies all currently visible (filtered) logs

- [ ] **Add copy button to individual JSON values in the tree viewer**
  - Right-click or hover-reveal copy icon on any node in `@uiw/react-json-view`
  - Copies the subtree value as JSON

### Files to modify

| File                   | Change                              |
| ---------------------- | ----------------------------------- |
| `utils/clipboard.ts`   | New utility                         |
| `CurrentStateView.tsx` | Copy button                         |
| `StateDiffView.tsx`    | Copy button                         |
| `StateHistoryView.tsx` | Copy buttons (per-entry + all)      |
| `LogsView.tsx`         | Copy buttons (per-entry + filtered) |

---

## Phase 2: Keyboard Navigation

**Goal:** Navigate the devtools entirely via keyboard for power users.

### Tasks

- [ ] **Instance list keyboard navigation**
  - Arrow Up/Down to move selection through the instance list
  - Enter to select/expand the currently highlighted instance
  - Home/End to jump to first/last instance
  - Focus trap: Tab into the list, Escape to blur back to search

- [ ] **Search bar keyboard shortcuts**
  - `/` or `Ctrl+K` to focus the search bar from anywhere in the panel
  - Escape to clear search and blur
  - Arrow Down from search bar moves focus into the filtered instance list

- [ ] **Tab switching**
  - `Ctrl+1` / `Ctrl+2` / `Ctrl+3` to switch between Instances / Logs / (future) tabs
  - Or `[` / `]` to cycle tabs

- [ ] **State viewer keyboard shortcuts**
  - `c` to copy current state when an instance is selected
  - `h` to toggle history section
  - `d` to toggle diff section
  - `e` to enter edit mode
  - `Escape` to cancel edit mode

- [ ] **Global shortcuts**
  - `?` to show keyboard shortcut help overlay
  - `Alt+D` already toggles the panel (keep as-is)

- [ ] **Create a `useKeyboardNav` hook**
  - Centralized keyboard event handling
  - Manages focus state and active element tracking
  - Respects input focus (don't trigger shortcuts when typing in search/edit)

- [ ] **Visual focus indicators**
  - Add visible focus ring on the currently keyboard-focused element
  - Use `:focus-visible` equivalent styling (2px blue outline)

### Files to modify

| File                          | Change                          |
| ----------------------------- | ------------------------------- |
| `hooks/useKeyboardNav.ts`     | New hook                        |
| `InstanceList.tsx`            | Arrow nav, focus management     |
| `SearchBar.tsx`               | Shortcut focus, escape handling |
| `DevToolsHeader.tsx`          | Tab switching shortcuts         |
| `StateViewer.tsx`             | Section toggle shortcuts        |
| `DevToolsPanel.tsx`           | Global shortcut registration    |
| `components/KeyboardHelp.tsx` | New help overlay                |

---

## Phase 3: State Search & Filter

**Goal:** Search _within_ state values to find specific data across all instances.

### Tasks

- [ ] **Add a global state search bar**
  - New search input above or alongside the instance search
  - Distinct visual treatment (e.g., "Search state values..." placeholder)
  - Toggled with `Ctrl+Shift+F` or a toolbar button

- [ ] **Implement deep value search**
  - Recursively search all instance states for matching keys or values
  - Support string matching (substring, case-insensitive)
  - Support path matching (e.g., `user.name` to find nested keys)
  - Return results as: `{ instanceId, path: string[], matchedValue: unknown }`

- [ ] **Display search results**
  - Results panel showing: instance name → key path → matched value
  - Click a result to navigate to that instance and highlight the matched path
  - Show match count per instance in the instance list

- [ ] **Highlight matched paths in JSON viewer**
  - When a state search result is selected, expand the JSON tree to the matched path
  - Apply highlight styling (yellow background) to the matched node

- [ ] **Create `DevToolsSearchBloc` enhancement**
  - Extend existing search bloc or create a sibling `DevToolsStateSearchBloc`
  - Debounce search input (300ms) to avoid hammering on large state trees
  - Cache search results, invalidate on state changes

### Files to modify

| File                                | Change               |
| ----------------------------------- | -------------------- |
| `components/StateSearchBar.tsx`     | New component        |
| `components/StateSearchResults.tsx` | New component        |
| `blocs/DevToolsStateSearchBloc.ts`  | New bloc             |
| `CurrentStateView.tsx`              | Path highlighting    |
| `DevToolsPanel.tsx`                 | Search bar placement |

---

## Phase 4: Export / Import

**Goal:** Save and restore full devtools snapshots for bug reports, sharing, and offline analysis.

### Tasks

- [ ] **Export current state**
  - "Export" button in DevToolsHeader
  - Exports a JSON file containing:
    - All instance states and metadata
    - State history (all snapshots)
    - Event log (filtered or full)
    - Dependency edges (if Phase 2 of data-richness is done)
    - Timestamp and BlaC version
  - File naming: `blac-devtools-{timestamp}.json`
  - Use `URL.createObjectURL()` + `<a download>` pattern

- [ ] **Import snapshot**
  - "Import" button next to Export
  - Parse and validate the JSON file structure
  - Load into devtools UI in a read-only "replay" mode
  - Clearly indicate that the panel is showing imported data (banner: "Viewing imported snapshot from {date}")

- [ ] **Export filtered logs**
  - Separate export for just the logs view
  - Support JSON and CSV formats
  - Respects current filter state (only exports visible logs)

- [ ] **Share link (stretch goal)**
  - Generate a shareable URL with base64-encoded compressed state
  - Only viable for small state trees — show warning if payload > 100KB
  - Opens in a standalone HTML viewer (no extension required)

### Data format

```typescript
interface DevToolsExport {
  version: string; // export format version
  blacVersion: string; // @blac/core version
  exportedAt: number; // timestamp
  instances: ExportedInstance[];
  logs: ExportedLogEntry[];
  dependencies?: DependencyEdge[];
}

interface ExportedInstance {
  id: string;
  className: string;
  name: string;
  currentState: unknown;
  history: StateSnapshot[];
  createdAt: number;
  isDisposed: boolean;
}
```

### Files to modify

| File                          | Change                   |
| ----------------------------- | ------------------------ |
| `utils/export.ts`             | Export logic             |
| `utils/import.ts`             | Import + validation      |
| `DevToolsHeader.tsx`          | Export/Import buttons    |
| `components/ImportBanner.tsx` | Read-only mode indicator |
| `blocs/DevToolsImportBloc.ts` | Manages imported state   |

---

## Phase 5: Snapshot Comparison

**Goal:** Compare any two history snapshots side-by-side, not just previous vs current.

### Tasks

- [ ] **Add snapshot selection UI in StateHistoryView**
  - Checkbox or radio-select on history entries
  - "Compare selected" button appears when exactly 2 entries are selected
  - Clear selection button

- [ ] **Render comparison in StateDiffView**
  - Reuse existing json-diff-kit integration
  - Label panes with snapshot timestamps instead of "Previous" / "Current"
  - Support both "changes only" and "full diff" modes

- [ ] **Add "Compare with current" shortcut**
  - Per-history-entry button: compares that snapshot against current state
  - Useful for "how did state drift from this point?"

### Files to modify

| File                        | Change                                |
| --------------------------- | ------------------------------------- |
| `StateHistoryView.tsx`      | Selection UI                          |
| `StateDiffView.tsx`         | Accept arbitrary left/right snapshots |
| `blocs/DevToolsDiffBloc.ts` | Store comparison pair                 |

---

## Success Criteria

- A developer can copy any state value in 1 click
- The entire devtools panel is navigable without a mouse
- Deep state values can be found across all instances with a single search
- A full devtools snapshot can be exported, shared, and re-imported for offline debugging
- Any two history snapshots can be compared side-by-side
