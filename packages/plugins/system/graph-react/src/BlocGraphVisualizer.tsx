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
import { linkHorizontal } from 'd3-shape';
import { Zoom } from '@visx/zoom';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
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
  labelOffset: 12, // Distance from node to label
  levelSpacing: 250, // Horizontal spacing between levels (increased for left labels)
  siblingSpacing: 30, // Vertical spacing between siblings
  minLabelWidth: 120, // Minimum space reserved for labels
};

/**
 * Converts flat graph snapshot to hierarchical structure for visx
 * Flattens state-root nodes to connect blocs directly to state properties
 */
function transformToHierarchy(snapshot: GraphSnapshot): GraphNode {
  const nodeMap = new Map<string, GraphNode & { children?: GraphNode[] }>();

  // Add all nodes to map
  snapshot.nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Build parent-child relationships using edges, skipping state-root nodes
  snapshot.edges.forEach((edge) => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (parent && child) {
      // If child is a state-root node, skip it and connect parent directly to state-root's children
      if (child.type === 'state-root') {
        // Don't add state-root as a child
        // We'll handle its children separately
      } else {
        parent.children!.push(child);
      }
    }
  });

  // Now connect blocs/cubits directly to state properties (skip state-root)
  snapshot.edges.forEach((edge) => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (parent && child && child.type === 'state-root') {
      // Find all children of the state-root node
      const stateRootChildren = snapshot.edges
        .filter((e) => e.source === child.id)
        .map((e) => nodeMap.get(e.target))
        .filter((n): n is GraphNode & { children?: GraphNode[] } => n !== undefined);

      // Add state-root's children directly to the parent (bloc/cubit)
      parent.children!.push(...stateRootChildren);
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
  const textRef = React.useRef<SVGTextElement>(null);

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
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: 0.3,
              ease: 'easeOut',
            }}
          >
            {/* Label text to the LEFT of the node */}
            <motion.text
              ref={textRef}
              x={-LAYOUT_CONFIG.labelOffset}
              dy=".35em"
              fontSize={14}
              fontFamily="'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
              textAnchor="end"
              fill="#e2e8f0"
              className="pointer-events-none select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {label}
            </motion.text>

            {/* Small circular node */}
            <motion.circle
              r={LAYOUT_CONFIG.nodeRadius}
              fill={color}
              stroke="none"
              animate={{
                opacity: (data as any).hasChanged ? 0.8 : 1,
                scale: (data as any).hasChanged ? 1.2 : 1,
              }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
              }}
              style={{
                filter: (data as any).hasChanged
                  ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))'
                  : undefined,
              }}
            />
          </motion.g>
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
      .nodeSize([LAYOUT_CONFIG.siblingSpacing, LAYOUT_CONFIG.levelSpacing])
      .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 1.2));

    return treeLayout(hierarchyData);
  }, [hierarchyData, width, height]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Zoom
        width={width}
        height={height}
        scaleXMin={0.1}
        scaleXMax={3}
        scaleYMin={0.1}
        scaleYMax={3}
        wheelDelta={(event) => {
          // Slower, smoother zoom with scroll (multiplicative factor)
          // Default is ~1.05, we use 1.02 for smoother control
          const factor = -event.deltaY > 0 ? 1.02 : 0.98;
          return { scaleX: factor, scaleY: factor };
        }}
        initialTransformMatrix={{
          scaleX: 1,
          scaleY: 1,
          translateX: 200, // More space for left-aligned labels
          translateY: height / 2, // Center vertically
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
                {/* Render links with animation */}
                <AnimatePresence mode="sync">
                  {treeData.links().map((link: any) => {
                    const linkId = `link-${link.source.data.id}-${link.target.data.id}`;

                    // Create the path generator for horizontal links
                    const pathGenerator = linkHorizontal<any, any>()
                      .x((d) => d.y)
                      .y((d) => d.x);

                    const linkPath = pathGenerator(link);

                    // For initial render, use a path from the parent to itself (start point)
                    const initialPath = pathGenerator({
                      source: link.source,
                      target: link.source,
                    });

                    return (
                      <motion.path
                        key={linkId}
                        stroke="#4a5568"
                        strokeWidth="1.5"
                        fill="none"
                        initial={{
                          d: initialPath || '',
                          opacity: 0,
                          pathLength: 0,
                        }}
                        animate={{
                          d: linkPath || '',
                          opacity: 0.6,
                          pathLength: 1,
                        }}
                        exit={{
                          d: initialPath || '',
                          opacity: 0,
                          pathLength: 0,
                        }}
                        transition={{
                          d: { duration: 0.5, ease: 'easeInOut' },
                          opacity: { duration: 0.3, ease: 'easeInOut' },
                          pathLength: { duration: 0.5, ease: 'easeInOut' },
                        }}
                      />
                    );
                  })}
                </AnimatePresence>

                {/* Render nodes (swap x/y for horizontal layout) */}
                <AnimatePresence mode="sync">
                  {treeData.descendants().map((node: any) => (
                    <motion.g
                      key={`node-${node.data.id}`}
                      initial={{ x: node.y, y: node.x, opacity: 0, scale: 0.3 }}
                      animate={{ x: node.y, y: node.x, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1], // Custom easing for smooth movement
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.3 },
                      }}
                    >
                      <Group top={0} left={0}>
                        <Node node={node} />
                      </Group>
                    </motion.g>
                  ))}
                </AnimatePresence>
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
