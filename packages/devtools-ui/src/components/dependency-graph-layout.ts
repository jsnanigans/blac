import type { Node, Edge } from '@xyflow/react';
import ELKBundled from 'elkjs/lib/elk.bundled.js';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 52;

const SUBGRAPH_GAP = 80;
const ORPHAN_COLS = 5;
const ORPHAN_GAP_X = 24;
const ORPHAN_GAP_Y = 20;
const ORPHAN_SECTION_GAP = 80;

const elk = new ELKBundled();

export type BlocNodeData = {
  className: string;
  instanceName: string;
  color: string;
  isConnected: boolean;
  connectionCount: number;
  nodeWidth: number;
  highlighted: boolean;
};

export function classColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
}

export function instanceKey(id: string): string {
  const i = id.indexOf(':');
  return i !== -1 ? id.slice(i + 1) : id;
}

export function getSubgraph(nodeId: string, edges: Edge[]): Set<string> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  const visited = new Set<string>();
  const queue = [nodeId];
  visited.add(nodeId);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of adj.get(cur) || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited;
}

function findComponents(nodeIds: string[], edges: Edge[]): string[][] {
  const nodeSet = new Set(nodeIds);
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) adj.set(id, new Set());
  for (const e of edges) {
    if (nodeSet.has(e.source) && nodeSet.has(e.target)) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  }
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const comp: string[] = [];
    const queue = [id];
    visited.add(id);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      comp.push(cur);
      for (const nb of adj.get(cur) || []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

export async function computeLayout(
  rfNodes: Node<BlocNodeData>[],
  rfEdges: Edge[],
  pinnedIds: Set<string>,
  currentPositions: Map<string, { x: number; y: number }>,
): Promise<Node<BlocNodeData>[]> {
  if (rfNodes.length === 0) return rfNodes;

  const connectedIds = new Set<string>();
  for (const e of rfEdges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  const connectedUnpinned = rfNodes.filter(
    (n) => connectedIds.has(n.id) && !pinnedIds.has(n.id),
  );
  const orphanUnpinned = rfNodes.filter(
    (n) => !connectedIds.has(n.id) && !pinnedIds.has(n.id),
  );

  const unpinnedSet = new Set(connectedUnpinned.map((n) => n.id));
  const unpinnedEdges = rfEdges.filter(
    (e) => unpinnedSet.has(e.source) && unpinnedSet.has(e.target),
  );

  const components = findComponents(
    connectedUnpinned.map((n) => n.id),
    unpinnedEdges,
  );
  components.sort((a, b) => b.length - a.length);

  const positions = new Map<string, { x: number; y: number }>();
  let offsetX = 0;
  let maxHeight = 0;

  for (const comp of components) {
    if (comp.length === 0) continue;
    const compSet = new Set(comp);
    const compEdges = unpinnedEdges.filter(
      (e) => compSet.has(e.source) && compSet.has(e.target),
    );
    const compNodes = connectedUnpinned.filter((n) => compSet.has(n.id));

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '50',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      },
      children: compNodes.map((n) => ({
        id: n.id,
        width: n.data.nodeWidth,
        height: NODE_HEIGHT,
      })),
      edges: compEdges.map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
    };

    const layouted = await elk.layout(graph);
    const children = (layouted.children || []) as {
      id: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }[];

    let minX = Infinity,
      minY = Infinity,
      bbMaxX = 0,
      bbMaxY = 0;
    for (const c of children) {
      const x = c.x ?? 0,
        y = c.y ?? 0;
      const w = c.width ?? NODE_WIDTH,
        h = c.height ?? NODE_HEIGHT;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      bbMaxX = Math.max(bbMaxX, x + w);
      bbMaxY = Math.max(bbMaxY, y + h);
    }

    for (const c of children) {
      positions.set(c.id, {
        x: (c.x ?? 0) - minX + offsetX,
        y: (c.y ?? 0) - minY,
      });
    }

    offsetX += bbMaxX - minX + SUBGRAPH_GAP;
    maxHeight = Math.max(maxHeight, bbMaxY - minY);
  }

  for (const n of rfNodes) {
    if (pinnedIds.has(n.id)) {
      const pos = currentPositions.get(n.id);
      if (pos) positions.set(n.id, pos);
    }
  }

  const orphanY =
    connectedUnpinned.length > 0 ? maxHeight + ORPHAN_SECTION_GAP : 0;
  orphanUnpinned.forEach((n, i) => {
    positions.set(n.id, {
      x: (i % ORPHAN_COLS) * (n.data.nodeWidth + ORPHAN_GAP_X),
      y: orphanY + Math.floor(i / ORPHAN_COLS) * (NODE_HEIGHT + ORPHAN_GAP_Y),
    });
  });

  return rfNodes.map((n) => ({
    ...n,
    position: positions.get(n.id) ?? n.position,
  }));
}
