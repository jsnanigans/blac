/**
 * Grid Layout Algorithm for Bloc Graph Visualization
 *
 * Arranges Bloc/Cubit nodes in a grid pattern, grouping by instance pattern
 * (shared, isolated, keep-alive) for better visual organization.
 */

import type { Node } from '@xyflow/react';
import type { BlocGraphNode } from '@blac/plugin-graph';

export interface GridLayoutOptions {
  /** Number of columns in the grid */
  columns?: number;
  /** Horizontal spacing between nodes */
  horizontalSpacing?: number;
  /** Vertical spacing between nodes */
  verticalSpacing?: number;
  /** Vertical spacing between groups */
  groupSpacing?: number;
  /** Whether to group by instance pattern */
  groupByPattern?: boolean;
}

const DEFAULT_OPTIONS: Required<GridLayoutOptions> = {
  columns: 5,
  horizontalSpacing: 250,
  verticalSpacing: 200,
  groupSpacing: 60,
  groupByPattern: true,
};

/**
 * Apply grid layout to React Flow nodes
 */
export function applyGridLayout(
  nodes: Node[],
  options: GridLayoutOptions = {}
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!opts.groupByPattern) {
    // Simple grid layout without grouping
    return applySimpleGrid(nodes, opts);
  }

  // Group nodes by instance pattern
  const grouped = groupNodesByPattern(nodes);

  let yOffset = 0;
  const layouted: Node[] = [];

  // Layout each group
  const groupOrder: Array<'shared' | 'isolated' | 'keepAlive'> = [
    'shared',
    'isolated',
    'keepAlive',
  ];

  for (const pattern of groupOrder) {
    const groupNodes = grouped[pattern];
    if (groupNodes.length === 0) continue;

    // Add group header space (for potential group label)
    yOffset += 50;

    // Layout nodes in this group
    groupNodes.forEach((node, idx) => {
      const col = idx % opts.columns;
      const row = Math.floor(idx / opts.columns);

      layouted.push({
        ...node,
        position: {
          x: col * opts.horizontalSpacing,
          y: yOffset + row * opts.verticalSpacing,
        },
      });
    });

    // Move to next group
    const rows = Math.ceil(groupNodes.length / opts.columns);
    yOffset += rows * opts.verticalSpacing + opts.groupSpacing;
  }

  return layouted;
}

/**
 * Group nodes by instance pattern
 */
function groupNodesByPattern(nodes: Node[]): {
  shared: Node[];
  isolated: Node[];
  keepAlive: Node[];
} {
  const grouped = {
    shared: [] as Node[],
    isolated: [] as Node[],
    keepAlive: [] as Node[],
  };

  for (const node of nodes) {
    const data = node.data as any as BlocGraphNode;
    if (data.keepAlive) {
      grouped.keepAlive.push(node);
    } else if (data.isIsolated) {
      grouped.isolated.push(node);
    } else {
      grouped.shared.push(node);
    }
  }

  return grouped;
}

/**
 * Apply simple grid layout without grouping
 */
function applySimpleGrid(
  nodes: Node[],
  opts: Required<GridLayoutOptions>
): Node[] {
  return nodes.map((node, idx) => {
    const col = idx % opts.columns;
    const row = Math.floor(idx / opts.columns);

    return {
      ...node,
      position: {
        x: col * opts.horizontalSpacing,
        y: row * opts.verticalSpacing,
      },
    };
  });
}

/**
 * Calculate bounding box for a set of nodes
 */
export function calculateBoundingBox(nodes: Node[]): {
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
    // Assume default node size of 300x200 if not specified
    const width = (node.width as number) || 300;
    const height = (node.height as number) || 200;

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
