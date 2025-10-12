/**
 * BlocGraphVisualizer Component (visx-based)
 *
 * Production-ready visualization component for Bloc/Cubit instances using visx.
 * Displays a real-time hierarchical tree of:
 * - Blac (root)
 * - Blocs/Cubits
 * - State (expanded recursively showing objects, arrays, primitives)
 */

import React, { useMemo } from 'react';
import { Group } from '@visx/group';
import { hierarchy, tree } from 'd3-hierarchy';
import { LinkHorizontal } from '@visx/shape';
import { Zoom } from '@visx/zoom';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useBlocGraph } from '@blac/react';
import type { GraphNode, GraphSnapshot } from '@blac/plugin-graph';

export interface BlocGraphVisualizerProps {
  /** Width of the visualization */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Custom class name */
  className?: string;
}

// Tree layout configuration
const LAYOUT_CONFIG = {
  nodeRadius: 8, // Small circular nodes
  labelOffset: 15, // Distance from node to label
  levelSpacing: 200, // Horizontal spacing between levels
  siblingSpacing: 10, // Vertical spacing between siblings
};

/**
 * Converts flat graph snapshot to hierarchical structure for visx
 */
function transformToHierarchy(snapshot: GraphSnapshot): GraphNode {
  const nodeMap = new Map<string, GraphNode & { children?: GraphNode[] }>();

  // Add all nodes to map
  snapshot.nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Build parent-child relationships using edges
  snapshot.edges.forEach((edge) => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);
    if (parent && child) {
      parent.children!.push(child);
    }
  });

  // Find root node
  const rootNode = snapshot.nodes.find((n) => n.type === 'root');
  if (!rootNode) {
    // Create synthetic root if none exists
    return {
      id: 'blac-root',
      type: 'root',
      stats: {
        totalBlocs: 0,
        activeBlocs: 0,
        disposedBlocs: 0,
        totalConsumers: 0,
        memoryStats: {
          registeredBlocs: 0,
          isolatedBlocs: 0,
          keepAliveBlocs: 0,
        },
      },
    } as GraphNode;
  }

  return nodeMap.get(rootNode.id) as GraphNode;
}

/**
 * Renders a single node in the tree
 */
function Node({ node }: { node: any }) {
  const data = node.data as GraphNode;

  // Node colors by type
  const getNodeColor = () => {
    if (data.type === 'root') return '#3b82f6'; // Blue
    if (data.type === 'bloc') return '#a855f7'; // Purple
    if (data.type === 'cubit') return '#ec4899'; // Pink
    if (data.type === 'state-root') return '#64748b'; // Slate
    if (data.type === 'state-object') return '#f59e0b'; // Amber
    if (data.type === 'state-array') return '#06b6d4'; // Cyan
    if (data.type === 'state-array-item') return '#14b8a6'; // Teal
    if (data.type === 'state-primitive') {
      // Color primitives by their type
      if ('valueType' in data) {
        const valueType = (data as any).valueType;
        if (valueType === 'number') return '#10b981'; // Green
        if (valueType === 'string') return '#f472b6'; // Pink
        if (valueType === 'boolean') return '#8b5cf6'; // Violet
      }
    }
    return '#6b7280'; // Gray default
  };

  const color = getNodeColor();

  // Determine node label
  const getLabel = () => {
    if (data.type === 'root') return 'Blac';
    if (data.type === 'bloc' || data.type === 'cubit') {
      return (data as any).name || data.type;
    }
    if (data.type === 'state-root') return 'state';
    if (
      data.type === 'state-object' ||
      data.type === 'state-array' ||
      data.type === 'state-array-item' ||
      data.type === 'state-primitive'
    ) {
      return (data as any).propertyKey || 'value';
    }
    return data.type;
  };

  // Get tooltip content
  const getTooltip = () => {
    if (data.type === 'root') {
      return `Total Blocs: ${(data as any).stats.totalBlocs}\nActive: ${(data as any).stats.activeBlocs}`;
    }
    if (data.type === 'bloc' || data.type === 'cubit') {
      return `${(data as any).name}\nConsumers: ${(data as any).consumerCount}\nLifecycle: ${(data as any).lifecycle}`;
    }
    if (
      data.type === 'state-object' ||
      data.type === 'state-array' ||
      data.type === 'state-array-item' ||
      data.type === 'state-primitive'
    ) {
      const propertyData = data as any;
      const path = propertyData.path?.join('.') || '';
      return `Path: ${path}\nType: ${propertyData.valueType}\n\nValue:\n${propertyData.fullValue || propertyData.displayValue}`;
    }
    return '';
  };

  const label = getLabel();
  const tooltip = getTooltip();

  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger asChild>
          <g>
            {/* Small circular node */}
            <circle
              r={LAYOUT_CONFIG.nodeRadius}
              fill={color}
              stroke="none"
              className="transition-all duration-200"
              style={{
                opacity: (data as any).hasChanged ? 0.8 : 1,
                filter: (data as any).hasChanged
                  ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))'
                  : undefined,
              }}
            />

            {/* Label text to the right of the node */}
            <text
              x={LAYOUT_CONFIG.labelOffset}
              dy=".35em"
              fontSize={14}
              fontFamily="'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
              textAnchor="start"
              fill="#e2e8f0"
              className="pointer-events-none select-none"
            >
              {label}
            </text>
          </g>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg max-w-md whitespace-pre-wrap z-50"
            sideOffset={5}
          >
            {tooltip}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/**
 * Main visualization component
 */
export function BlocGraphVisualizer({
  width = 1200,
  height = 800,
  className = '',
}: BlocGraphVisualizerProps) {
  // Subscribe to graph updates
  const graphSnapshot = useBlocGraph();

  // Transform to hierarchy
  const hierarchyData = useMemo(() => {
    const root = transformToHierarchy(graphSnapshot);
    return hierarchy(root, (d: any) => d.children);
  }, [graphSnapshot]);

  // Create tree layout (horizontal: swap width/height for left-to-right orientation)
  const treeData = useMemo(() => {
    const treeLayout = tree<GraphNode>()
      .size([height - 100, width - 100])
      .separation((a: any, b: any) => (a.parent === b.parent ? 0.8 : 1));

    return treeLayout(hierarchyData);
  }, [hierarchyData, width, height]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Zoom
        width={width}
        height={height}
        scaleXMin={0.1}
        scaleXMax={2}
        scaleYMin={0.1}
        scaleYMax={2}
        initialTransformMatrix={{
          scaleX: 0.8,
          scaleY: 0.8,
          translateX: 50,
          translateY: 50,
          skewX: 0,
          skewY: 0,
        }}
      >
        {(zoom) => (
          <div className="relative">
            <svg
              width={width}
              height={height}
              style={{
                cursor: zoom.isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              ref={zoom.containerRef as React.Ref<SVGSVGElement>}
            >
              {/* Define gradient */}
              <defs>
                <linearGradient id="links-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>
              <rect width={width} height={height} rx={14} fill="#2d3748" />
              <Group transform={zoom.toString()}>
                {/* Render links */}
                {treeData.links().map((link: any, i: number) => (
                  <LinkHorizontal
                    key={`link-${i}`}
                    data={link}
                    stroke="#4a5568"
                    strokeWidth="1.5"
                    fill="none"
                    opacity={0.6}
                  />
                ))}

                {/* Render nodes (swap x/y for horizontal layout) */}
                {treeData.descendants().map((node: any, i: number) => (
                  <Group key={`node-${i}`} top={node.x} left={node.y}>
                    <Node node={node} />
                  </Group>
                ))}
              </Group>
            </svg>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-700">
              <button
                onClick={() => zoom.scale({ scaleX: 1.2, scaleY: 1.2 })}
                className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
              >
                Zoom In
              </button>
              <button
                onClick={() => zoom.scale({ scaleX: 0.8, scaleY: 0.8 })}
                className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
              >
                Zoom Out
              </button>
              <button
                onClick={zoom.reset}
                className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Stats panel */}
            <div className="absolute top-4 left-4 bg-gray-800 rounded-lg shadow-lg p-3 text-xs text-gray-300 border border-gray-700">
              <div className="font-bold mb-2 text-gray-100">Graph Stats</div>
              <div>Total Nodes: {graphSnapshot.nodes.length}</div>
              <div>
                Blocs:{' '}
                {
                  graphSnapshot.nodes.filter(
                    (n) => n.type === 'bloc' || n.type === 'cubit'
                  ).length
                }
              </div>
              <div>
                State Properties:{' '}
                {
                  graphSnapshot.nodes.filter(
                    (n) =>
                      n.type === 'state-object' ||
                      n.type === 'state-array' ||
                      n.type === 'state-array-item' ||
                      n.type === 'state-primitive'
                  ).length
                }
              </div>
            </div>
          </div>
        )}
      </Zoom>
    </div>
  );
}
