# Plan: Dependency Graph Overhaul

## Decision

**Approach**: Incrementally enhance `DependencyGraph.tsx` in 5 ordered phases -- each phase produces a working graph before the next begins. All work stays in the single file unless it exceeds ~700 lines, in which case the custom node component and layout utilities split into sibling files.

**Why**: The features have natural dependency ordering (layout must come before search-highlight, drag must come before pin-and-reset). Phasing avoids a big-bang rewrite and keeps each step reviewable.

**Risk Level**: Medium -- ELK subgraph partitioning and 60+ node hover/dim interactions are the two hardest parts.

---

## Implementation Steps

### Phase 1: Wider nodes, show all instances, subgraph clustering

**Goal**: Fix the visual foundation before adding interactivity.

1. **Increase `NODE_WIDTH` to 240**, `NODE_HEIGHT` stays 52. Remove `textOverflow: 'ellipsis'` on className -- let it wrap or use a second line only if truly needed. Audit the `BlocNode` inline styles: set `width` to `NODE_WIDTH` (now 240), verify padding is sufficient.

2. **Remove the `connectedIds` filter** (lines 176-185) and the `.filter((inst) => connectedIds.has(inst.id))` on line 190. Instead, build ALL instances into `rfNodes`. Tag each node's data with `isConnected: boolean` so the node renderer can dim unconnected ones (opacity 0.45, dashed border).

3. **Partition the graph into disconnected subgraphs before ELK**. In `computeELKLayout`:
   - Build an adjacency set from `rfEdges`. Union-Find or BFS to identify connected components.
   - Separate orphan nodes (zero edges) into their own group.
   - Run ELK independently on each connected component (one `elk.layout()` call per subgraph).
   - Position subgraphs side-by-side horizontally with a `SUBGRAPH_GAP = 80` between bounding boxes.
   - Place the orphan group as a simple grid (4 columns, `NODE_WIDTH + 20` spacing) below all subgraphs, preceded by a React Flow "group" node labeled "Unconnected" (type `'group'` or a custom node acting as a section header).

4. **Increase ELK spacing**: `elk.spacing.nodeNode` -> `'60'`, `elk.layered.spacing.nodeNodeBetweenLayers` -> `'100'`.

5. **Remove the "No dependencies detected" early return** (lines 347-395). The graph now always renders -- if there are zero edges, every node appears in the orphan grid.

**Files**: `DependencyGraph.tsx` lines 28-29 (constants), 62-109 (BlocNode), 125-163 (computeELKLayout), 176-203 (rfNodes memo), 325-405 (outer component).

### Phase 2: Drag-and-drop with pinning + reset layout

1. **Set `nodesDraggable={true}`** (line 271). Add `nodesConnectable={false}` (already present).

2. **Track pinned nodes** in a `useRef<Set<string>>` called `pinnedNodesRef`. On `onNodeDragStop`, add the node ID to the pinned set.

3. **Modify `computeELKLayout`** to accept a `pinnedIds: Set<string>` parameter. Before feeding nodes to ELK, remove pinned nodes from `children` and their edges from `edges`. After layout, merge pinned nodes back at their current positions (read from current `nodes` state via a ref).

4. **Add "Reset Layout" button** using `<Panel position="top-right">`. On click: clear `pinnedNodesRef`, re-run layout by bumping a `layoutVersion` counter state. Style the button to match the existing Controls panel (T.bg3, T.border1, T.radius, fontSize 11, T.text1).

5. **Wire `onNodesChange`** to detect position changes from drag and update the pinned set accordingly.

**Files**: `DependencyGraph.tsx` -- `DependencyGraphFlow` component (lines 165-322). New import: `Panel` from `@xyflow/react`.

### Phase 3: Search/filter toolbar + minimap

1. **Add `<Panel position="top-left">` containing a search input**. Style: `T.bg3` background, `T.border1` border, `T.fontMono`, fontSize 11, width 200px, `T.radius`. Debounce input with a 150ms timeout (inline `useRef`+`setTimeout`, no library).

2. **Search behavior**: `searchQuery` state in `DependencyGraphFlow`. On change, iterate `nodes` and set `data.isHighlighted = true/false` based on case-insensitive match against `className` or `instanceName`. Non-matching nodes get `opacity: 0.2` in `BlocNode`. Matching nodes get a `boxShadow: '0 0 0 2px ' + T.textAccent` highlight ring.

3. **Filter toggle**: Add a small "Show unconnected" checkbox/toggle next to search. Default ON. When OFF, filter orphan nodes out of the rendered nodes array. Store as `showOrphans` state.

4. **Fit view to matches**: When search query changes and has matches, call `fitView({ nodes: matchingNodeIds, padding: 0.2, duration: 300 })`.

5. **Add `<MiniMap />`** from `@xyflow/react`. Position bottom-right. Pass `nodeColor` callback that returns `data.color` for each node. Style override: `background: T.bg3`, `border: 1px solid ${T.border1}`, `borderRadius: T.radius`. Dimensions: `width={160} height={100}`.

**Files**: `DependencyGraph.tsx`. New imports: `MiniMap`, `Panel` from `@xyflow/react`.

### Phase 4: Visual hierarchy -- sized nodes, badges, colored edges

1. **Compute connection count per node** in a `useMemo`: for each node, count inbound + outbound edges. Store as `data.connectionCount` on node data.

2. **Scale node dimensions**: `width = NODE_WIDTH + Math.min(connectionCount * 8, 60)`, height stays fixed. Pass computed width as `data.nodeWidth` so `BlocNode` can use it. This keeps high-connectivity nodes visually larger without being extreme.

3. **Add badge to `BlocNode`**: Small circle (16x16) at top-right corner showing `connectionCount`. Style: `background: data.color`, `color: '#fff'`, `fontSize: 9`, `borderRadius: '50%'`, `position: absolute`, `top: -6`, `right: -6`. Only show if `connectionCount > 0`.

4. **Color edges by source**: Change edge `style.stroke` from `T.text2` to `classColor(sourceClassName)` with 60% opacity. Change `markerEnd.color` to match. This creates visual grouping by dependency source.

5. **Update ELK `children` width** to use the per-node computed width so layout accounts for wider hub nodes.

**Files**: `DependencyGraph.tsx` -- `BlocNodeData` type (add `connectionCount`, `nodeWidth`), `BlocNode` component, `rfEdges` memo, `rfNodes` memo, `computeELKLayout`.

### Phase 5: Hover tooltips + click subgraph highlighting

1. **Hover tooltip**: Add `onNodeMouseEnter` and `onNodeMouseLeave` handlers on `<ReactFlow>`. Track `hoveredNodeId` state. Render an absolutely-positioned tooltip `<div>` inside the ReactFlow wrapper (not as a Panel -- use a portal or absolute div at mouse position). Tooltip content:
   - Full `className` (no truncation)
   - Instance name (`instanceKey`)
   - Current state summary: get from `instances.find(i => i.id === hoveredNodeId)?.state`, show `JSON.stringify(state).slice(0, 120)` with ellipsis
   - Connection count: "N dependencies, M dependents"
   - Style: `T.bg4`, `T.border2`, `T.text0`, `T.fontMono`, fontSize 11, `padding: 8px 12px`, `maxWidth: 320px`, `zIndex: 10`, `pointerEvents: 'none'`.

2. **Tooltip positioning**: Track mouse position via `onNodeMouseEnter` event's `clientX`/`clientY`. Convert to flow coordinates using `screenToFlowPosition` from `useReactFlow()`, or simpler: position the tooltip div relative to the ReactFlow container using clientX/clientY offset from the container's `getBoundingClientRect()`.

3. **Click subgraph highlighting**: Replace the current `onNodeClick` (which navigates away). On single click:
   - Set `selectedNodeId` state.
   - Compute the full connected subgraph (BFS from selected node, following edges in both directions).
   - Dim all nodes/edges NOT in the subgraph: set `opacity: 0.15` via node/edge style updates.
   - Highlight the selected node with `boxShadow: '0 0 0 2px ' + T.textAccent`.
   - Click on empty canvas (use `onPaneClick`) clears the selection and restores all opacities.

4. **Double-click to navigate**: Add `onNodeDoubleClick` handler that calls `layoutBloc.setActiveTab('Instances')` + `layoutBloc.setSelectedId(node.id)`. This replaces the old single-click navigation.

**Files**: `DependencyGraph.tsx` -- event handlers in `DependencyGraphFlow`, new state variables, `BlocNode` style modifications.

---

## Files to Change

- `packages/devtools-ui/src/components/DependencyGraph.tsx` -- all changes
  - Lines 28-29: constants
  - Lines 44-49: `BlocNodeData` type (add `isConnected`, `connectionCount`, `nodeWidth`, `isHighlighted`)
  - Lines 62-109: `BlocNode` component (wider, badge, dimming, highlight ring)
  - Lines 125-163: `computeELKLayout` (subgraph partitioning, pinned node support)
  - Lines 165-322: `DependencyGraphFlow` (new state, event handlers, toolbar, minimap)
  - Lines 325-405: outer `DependencyGraph` (remove zero-edges early return)

If the file exceeds ~700 lines after all phases, extract:

- `DependencyGraphNode.tsx` -- BlocNode + tooltip rendering
- `dependency-graph-layout.ts` -- computeELKLayout, subgraph partitioning, union-find

---

## Acceptance Criteria

- [ ] All instances appear in the graph, including orphans (dimmed, in a grid zone)
- [ ] Disconnected subgraphs lay out side-by-side, not in a single column
- [ ] Nodes are draggable; dragged nodes stay pinned across re-layouts
- [ ] "Reset Layout" button clears pins and re-runs ELK
- [ ] Node width is 240px base; hub nodes are wider (up to +60px)
- [ ] Search input highlights matching nodes and fits view to them
- [ ] MiniMap renders in bottom-right corner
- [ ] Hover shows tooltip with full name, state preview, connection counts
- [ ] Single click highlights the connected subgraph, dims the rest
- [ ] Double click navigates to Instances tab (old single-click behavior)
- [ ] Edge colors match their source node's `classColor`
- [ ] Connection count badge shows on nodes with edges
- [ ] Works smoothly with 60+ instances (no layout jank -- ELK runs per-subgraph, not on full graph)

---

## Risks & Mitigations

**Main Risk**: ELK layout with subgraph partitioning + pinned nodes becomes slow at 60+ nodes.
**Mitigation**: Run ELK per-subgraph (smaller inputs). Debounce relayout with `graphKey` check (already in place). Memoize subgraph detection. Only re-layout unpinned subgraphs.

**Secondary Risk**: Hover tooltip + subgraph dimming causes excessive re-renders.
**Mitigation**: Use refs for tooltip position (not state). Apply dimming via `setNodes`/`setEdges` style updates (batch), not per-node re-renders. Keep `BlocNode` as a memoized FC.

**Tertiary Risk**: File grows past 700 lines.
**Mitigation**: Plan includes extraction points. Phase 5 is the growth phase -- evaluate after Phase 4.

---

## Out of Scope

- Edge labels (showing dependency key name)
- Animated layout transitions between states
- Persistent layout storage (saving node positions)
- Export/screenshot functionality
- Grouping nodes by class name
- Any new npm dependencies
