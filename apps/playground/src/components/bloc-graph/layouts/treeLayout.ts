/**
 * Tree Layout Algorithm using d3-hierarchy
 *
 * Creates a hierarchical tree visualization of the Bloc graph.
 * Inspired by Redux DevTools chart view with compact, vertical layout.
 */

import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import type { Node } from '@xyflow/react';
import type { GraphNode } from '@blac/plugin-graph';

export interface TreeLayoutOptions {
  /** Width of each node */
  nodeWidth?: number;
  /** Height of each node */
  nodeHeight?: number;
  /** Horizontal spacing between sibling nodes */
  siblingSpacing?: number;
  /** Vertical spacing between levels */
  levelSpacing?: number;
  /** Orientation of the tree */
  orientation?: 'vertical' | 'horizontal';
}

const DEFAULT_OPTIONS: Required<TreeLayoutOptions> = {
  nodeWidth: 200,
  nodeHeight: 80,
  siblingSpacing: 60,
  levelSpacing: 80,
  orientation: 'vertical',
};

/**
 * Convert flat node/edge structure to a hierarchical tree structure
 */
function buildHierarchy(nodes: Node[]): Node | null {
  if (nodes.length === 0) return null;

  // Create a map for quick lookup
  const nodeMap = new Map<string, Node & { children?: Node[] }>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Find root node (type === 'root' or no parent)
  let root: (Node & { children?: Node[] }) | null = null;
  const childNodes: (Node & { children?: Node[] })[] = [];

  nodes.forEach((node) => {
    const nodeData = node.data as unknown as GraphNode;
    const enrichedNode = nodeMap.get(node.id)!;

    if (nodeData.type === 'root') {
      root = enrichedNode;
    } else if (nodeData.parentId) {
      const parent = nodeMap.get(nodeData.parentId);
      if (parent) {
        parent.children!.push(enrichedNode);
      }
    } else {
      childNodes.push(enrichedNode);
    }
  });

  // If no explicit root found, create a synthetic one
  if (!root && nodes.length > 0) {
    root = {
      id: 'synthetic-root',
      type: 'rootNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'root',
        id: 'synthetic-root',
        stats: {
          totalBlocs: nodes.length,
          activeBlocs: 0,
          disposedBlocs: 0,
          totalConsumers: 0,
          memoryStats: {
            registeredBlocs: 0,
            isolatedBlocs: 0,
            keepAliveBlocs: 0,
          },
        },
      },
      children: childNodes,
    } as Node & { children?: Node[] };
  }

  return root as Node;
}

/**
 * Apply tree layout to React Flow nodes using d3-hierarchy
 */
export function applyTreeLayout(
  nodes: Node[],
  options: TreeLayoutOptions = {}
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return [];

  // Build hierarchical structure
  const rootNode = buildHierarchy(nodes);
  if (!rootNode) return nodes;

  // Create d3 hierarchy
  const root = hierarchy(rootNode, (d) => (d as any).children);

  // Calculate tree dimensions based on node sizes
  const treeLayout = tree<Node>()
    .nodeSize([
      opts.nodeWidth + opts.siblingSpacing,
      opts.nodeHeight + opts.levelSpacing,
    ])
    .separation((a, b) => {
      // Increase separation for nodes at the same level
      return a.parent === b.parent ? 1 : 1.2;
    });

  // Apply tree layout
  const treeData = treeLayout(root);

  // Convert back to React Flow nodes with positioned coordinates
  const layoutedNodes: Node[] = [];

  treeData.each((d: HierarchyPointNode<Node>) => {
    const node = d.data;
    const nodeData = node.data as unknown as GraphNode;

    // Calculate position based on orientation
    let x: number, y: number;

    if (opts.orientation === 'vertical') {
      // Vertical tree: root at top, children below
      x = d.x;
      y = d.y;
    } else {
      // Horizontal tree: root at left, children to the right
      x = d.y;
      y = d.x;
    }

    // Skip synthetic root if it was created
    if (nodeData.type === 'root' && node.id === 'synthetic-root') {
      return;
    }

    layoutedNodes.push({
      ...node,
      position: { x, y },
    });
  });

  // Center the tree horizontally
  if (layoutedNodes.length > 0) {
    const minX = Math.min(...layoutedNodes.map((n) => n.position.x));
    const maxX = Math.max(...layoutedNodes.map((n) => n.position.x));
    const centerOffset = -(minX + maxX) / 2;

    layoutedNodes.forEach((node) => {
      node.position.x += centerOffset + opts.nodeWidth / 2;
    });
  }

  return layoutedNodes;
}

/**
 * Calculate bounding box for tree layout
 */
export function calculateTreeBounds(nodes: Node[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { x, y } = node.position;
    const width = (node.width as number) || 200;
    const height = (node.height as number) || 80;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
