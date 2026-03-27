# UI Overhaul — Theming, Diff View, Instance Grouping & Layout

Evolve the devtools UI from "functional dark panel" to a polished, customizable developer tool.

---

## Phase 1: Theming System

**Goal:** Replace hardcoded inline styles with a token-based system that supports dark/light themes and future customization.

### Tasks

- [ ] **Define design tokens**
  - Create `devtools-ui/src/theme/tokens.ts`
  - Token categories:
    - `color.bg.primary`, `color.bg.secondary`, `color.bg.surface`, `color.bg.hover`
    - `color.text.primary`, `color.text.secondary`, `color.text.muted`, `color.text.accent`
    - `color.border.default`, `color.border.subtle`
    - `color.semantic.success`, `color.semantic.warning`, `color.semantic.error`, `color.semantic.info`
    - `color.syntax.string`, `color.syntax.number`, `color.syntax.boolean`, `color.syntax.null`, `color.syntax.key`
    - `spacing.xs` (4px), `spacing.sm` (8px), `spacing.md` (12px), `spacing.lg` (16px), `spacing.xl` (24px)
    - `radius.sm` (3px), `radius.md` (6px)
    - `font.mono`, `font.size.xs`, `font.size.sm`, `font.size.md`

- [ ] **Create dark and light theme definitions**
  - `themes/dark.ts` — migrate current hardcoded colors (keep existing look)
  - `themes/light.ts` — light counterpart with good contrast ratios (WCAG AA)
  - Each theme is a flat object mapping token names to CSS values

- [ ] **Implement theme provider**
  - `ThemeProvider` component that injects CSS custom properties on a root `<div>`
  - `useTheme()` hook returning current theme + toggle function
  - `DevToolsThemeBloc` to manage theme selection (persisted to localStorage)
  - System preference detection via `prefers-color-scheme` media query (default)

- [ ] **Migrate all inline styles to use CSS custom properties**
  - This is the bulk of the work — every component has inline styles
  - Strategy: replace `style={{ background: '#1e1e1e' }}` with `style={{ background: 'var(--dt-bg-primary)' }}`
  - Do this component-by-component, one PR per ~3 components
  - Order: DevToolsPanel → DevToolsHeader → InstanceList → StateViewer → remaining

- [ ] **Add theme toggle to DevToolsHeader**
  - Small sun/moon icon button in the header bar
  - Tooltip: "Switch to light/dark theme"

- [ ] **Update JSON viewer theme**
  - Map `@uiw/react-json-view` CSS variables (`--w-rjv-*`) to devtools theme tokens
  - Ensure syntax colors have good contrast in both themes

- [ ] **Update json-diff-kit theme**
  - Override json-diff-kit's default styles to match active theme
  - Ensure diff colors (additions green, deletions red) work in both themes

### Migration order (inline styles → CSS vars)

1. `DevToolsPanel.tsx` — root container, background, layout
2. `DevToolsHeader.tsx` — header bar, tabs, status
3. `InstanceList.tsx` + `InstanceListItem.tsx` — sidebar
4. `SearchBar.tsx` — search input
5. `StateViewer.tsx` — detail panel, metrics bar
6. `CurrentStateView.tsx` — JSON viewer wrapper
7. `StateDiffView.tsx` — diff viewer wrapper
8. `StateHistoryView.tsx` — history timeline
9. `CallStackView.tsx` — callstack display
10. `LogsView.tsx` — log entries and filters
11. `DraggableOverlay.tsx` — overlay chrome

### Files to create

| File                         | Purpose                |
| ---------------------------- | ---------------------- |
| `theme/tokens.ts`            | Token name constants   |
| `theme/dark.ts`              | Dark theme values      |
| `theme/light.ts`             | Light theme values     |
| `theme/ThemeProvider.tsx`    | CSS variable injection |
| `theme/useTheme.ts`          | Theme hook             |
| `blocs/DevToolsThemeBloc.ts` | Theme state management |

### Files to modify

Every component file in `devtools-ui/src/components/` — inline `style={{}}` objects get updated to reference CSS custom properties.

---

## Phase 2: Instance Grouping & Organization

**Goal:** Scale the instance list from "flat searchable list" to "organized, groupable, foldable panel" that works with 50+ instances.

### Tasks

- [ ] **Group instances by class name**
  - Collapsible groups in the instance list
  - Group header shows: class name, instance count, colored indicator
  - Expand/collapse individual groups
  - "Collapse all" / "Expand all" buttons in the list header

- [ ] **Sort options**
  - Dropdown or toggle in the list header
  - Options: by class name (alphabetical), by creation time (newest/oldest first), by last update (most recent first), by update frequency
  - Persist selection in `DevToolsLayoutBloc`

- [ ] **Instance badges and status indicators**
  - Improve existing badges: make them more compact and scannable
  - Add a small activity indicator (pulsing dot) for instances that updated in the last 2 seconds
  - Show disposed instances in a separate "Disposed" group at the bottom (collapsed by default)
  - Count badge on group headers showing active update count

- [ ] **Virtual scrolling for large lists**
  - When instance count > 100, switch to virtualized rendering
  - Implement a simple virtual list (fixed row height, calculate visible range)
  - No external library — the list items are uniform height, so a simple implementation works
  - Keep it behind a threshold check: below 100 instances, render normally

- [ ] **Instance pinning**
  - Pin icon on instance rows: pinned instances stay at the top regardless of sort/filter
  - Pinned state stored in `DevToolsLayoutBloc`
  - Visual distinction: subtle pin icon + slight background tint

### Files to modify

| File                           | Change                                   |
| ------------------------------ | ---------------------------------------- |
| `InstanceList.tsx`             | Grouping, sorting, virtual scroll        |
| `InstanceListItem.tsx`         | Badges, pin button, activity indicator   |
| `components/InstanceGroup.tsx` | New — group header component             |
| `blocs/DevToolsSearchBloc.ts`  | Grouping logic (already partially there) |
| `blocs/DevToolsLayoutBloc.ts`  | Sort preference, pinned instances        |

---

## Phase 3: Improved Diff View

**Goal:** Replace the side-by-side json-diff-kit view with a more intuitive inline tree diff that matches the JSON viewer's interaction model.

### Tasks

- [ ] **Inline tree diff mode**
  - Render a single JSON tree (like CurrentStateView) with change annotations
  - Added values: green background + "+" indicator
  - Removed values: red background + strikethrough + "–" indicator
  - Changed values: show old → new with amber highlight
  - Unchanged values: normal rendering (collapsible)
  - This becomes the default diff mode; keep side-by-side as an option

- [ ] **Diff navigation**
  - "Next change" / "Previous change" buttons (or `n` / `p` keys)
  - Auto-scroll to the next changed node
  - Change count indicator: "Change 3 of 7"

- [ ] **Diff summary header**
  - Compact summary above the diff: "3 added, 2 changed, 1 removed"
  - Clickable: clicking "2 changed" filters to show only changed nodes

- [ ] **Deep object diffing improvements**
  - Current diff shows full replacement for nested objects even when only one leaf changed
  - Implement recursive structural diff that walks both trees and marks individual leaf changes
  - Handle array diffs better: detect insertions/deletions vs. replacements using LCS or similar

- [ ] **Keep side-by-side as alternative view**
  - Toggle between "Inline" and "Side-by-side" modes
  - Side-by-side uses existing json-diff-kit integration
  - Persist preference

### Files to modify

| File                            | Change                             |
| ------------------------------- | ---------------------------------- |
| `StateDiffView.tsx`             | Mode toggle, inline diff rendering |
| `components/InlineTreeDiff.tsx` | New — recursive tree diff renderer |
| `utils/deepDiff.ts`             | New — structural diff algorithm    |
| `blocs/DevToolsDiffBloc.ts`     | Diff mode preference               |

---

## Phase 4: Layout & Responsiveness

**Goal:** Make the panel work well at all sizes, from narrow Chrome DevTools sidebars to wide standalone windows.

### Tasks

- [ ] **Responsive breakpoints**
  - < 500px: single column layout (list and detail stack vertically, detail replaces list on selection, back button)
  - 500px–900px: current side-by-side with adjustable divider
  - \> 900px: wider detail panel with more room for diff and history side-by-side

- [ ] **Collapsible sidebar**
  - Button to fully collapse the instance list into an icon strip
  - Shows only class color indicators and first letter of class name
  - Click to expand back
  - Useful in narrow panels to maximize detail space

- [ ] **Improve resize divider**
  - Current: 4px invisible divider with cursor change
  - Better: 1px visible line with 8px hit target, drag handle dots in center
  - Snap points: fully collapsed (0px), compact (150px), default (300px)
  - Double-click to reset to default width

- [ ] **Panel size persistence**
  - Save panel width, collapsed state, and section expand states to localStorage
  - Restore on next open
  - Per-context: different saved states for overlay vs. extension panel vs. PiP

- [ ] **Overflow handling audit**
  - Review all text truncation (instance names, class names, state paths)
  - Ensure monospace text doesn't break layout
  - Add horizontal scroll on code/JSON blocks that exceed container width
  - Tooltip on truncated text showing full value

### Files to modify

| File                           | Change                         |
| ------------------------------ | ------------------------------ |
| `DevToolsPanel.tsx`            | Responsive layout, breakpoints |
| `InstanceList.tsx`             | Collapsible mode               |
| `components/ResizeDivider.tsx` | Enhanced divider               |
| `blocs/DevToolsLayoutBloc.ts`  | Persistence, responsive state  |
| All components                 | Overflow audit                 |

---

## Phase 5: Visual Polish Pass

**Goal:** Small refinements that elevate the overall feel.

### Tasks

- [ ] **Consistent spacing**
  - Audit all padding/margin values and align to the spacing token scale
  - Current code uses arbitrary values (3px, 6px, 8px, 10px, 12px, 16px, 20px, 24px)
  - Normalize to token scale: 4, 8, 12, 16, 24

- [ ] **Improved empty states**
  - "No instances found" when search returns nothing — add illustration or hint text
  - "Select an instance" placeholder in detail panel — make it more helpful
  - "No state history" — explain what triggers history recording

- [ ] **Micro-animations**
  - Smooth expand/collapse for sections (max-height transition or `details`/`summary`)
  - Fade-in for new instances appearing in the list
  - Subtle pulse on the state change sweep animation (already exists, but refine timing)

- [ ] **Accessibility improvements**
  - Add `aria-label` to all icon buttons
  - Ensure color is not the only indicator (add icons/text alongside colored badges)
  - Tab order follows logical flow: search → list → detail sections
  - Screen reader text for status indicators

- [ ] **Tooltip system**
  - Simple tooltip component (CSS-only, no library)
  - Add tooltips to: all icon buttons, truncated text, badge abbreviations, keyboard shortcuts

### Files to modify

All component files — this is a polish pass across the board.

---

## Success Criteria

- Devtools works in both dark and light mode with good contrast
- 100+ instances are navigable without scrolling through a flat list
- State diffs are understandable at a glance with inline annotations
- Panel is usable from 400px to 1200px+ width
- Visual consistency: all spacing, colors, and typography follow the token system
