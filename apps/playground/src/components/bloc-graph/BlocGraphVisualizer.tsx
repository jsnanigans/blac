/**
 * BlocGraphVisualizer Component
 *
 * Production-ready visualization component for Bloc/Cubit instances.
 * Displays a real-time graph of all Bloc instances, their states, lifecycle,
 * and relationships.
 *
 * Features:
 * - Real-time updates (throttled to 100ms)
 * - Custom grid layout grouping by instance pattern
 * - Expandable nodes showing detailed state
 * - Color-coded by concept type, lifecycle, and instance pattern
 * - Zoom, pan, and minimap controls
 * - Responsive and accessible
 *
 * @example
 * ```tsx
 * <BlocGraphVisualizer
 *   layout="grid"
 *   showConsumerEdges={false}
 *   highlightLifecycle={true}
 * />
 * ```
 */

import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBlocGraph } from '@blac/react';
import { customNodeTypes } from './nodes';
import { applyGridLayout, type GridLayoutOptions } from './layouts';

export interface BlocGraphVisualizerProps {
  /** Layout algorithm to use */
  layout?: 'grid';
  /** Whether to show consumer edges (Bloc → Component relationships) */
  showConsumerEdges?: boolean;
  /** Whether to highlight lifecycle transitions with animations */
  highlightLifecycle?: boolean;
  /** Custom class name */
  className?: string;
  /** Grid layout options */
  gridOptions?: GridLayoutOptions;
  /** Whether to show controls */
  showControls?: boolean;
  /** Whether to show minimap */
  showMinimap?: boolean;
  /** Callback when a node is clicked */
  onNodeClick?: (node: any) => void;
}

/**
 * Convert graph nodes to React Flow nodes
 * Now handles root, bloc/cubit, and state nodes from the new plugin
 */
function convertToReactFlowNodes(graphNodes: any[]): Node[] {
  return graphNodes.map((node) => {
    // Determine node type for React Flow
    let nodeType = 'blocNode'; // Default

    if (node.type === 'root') {
      nodeType = 'rootNode';
    } else if (node.type === 'state') {
      nodeType = 'stateNode';
    } else if (node.type === 'bloc' || node.type === 'cubit') {
      nodeType = 'blocNode';
    }

    return {
      id: node.id,
      type: nodeType,
      position: { x: 0, y: 0 }, // Will be set by layout algorithm
      data: node,
    };
  });
}

/**
 * Convert graph edges to React Flow edges
 */
function convertToReactFlowEdges(graphEdges: any[]): Edge[] {
  return graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  }));
}

/**
 * Main visualization component
 */
export function BlocGraphVisualizer({
  layout = 'grid',
  showConsumerEdges = false,
  highlightLifecycle = true,
  className = '',
  gridOptions,
  showControls = true,
  showMinimap = true,
  onNodeClick,
}: BlocGraphVisualizerProps) {
  // Subscribe to graph updates
  const graphSnapshot = useBlocGraph();

  // Convert to React Flow format and apply layout
  const reactFlowNodes = useMemo(() => {
    const nodes = convertToReactFlowNodes(graphSnapshot.nodes);
    return layout === 'grid' ? applyGridLayout(nodes, gridOptions) : nodes;
  }, [graphSnapshot.nodes, layout, gridOptions]);

  // Convert edges from graph
  const reactFlowEdges: Edge[] = useMemo(() => {
    return convertToReactFlowEdges(graphSnapshot.edges);
  }, [graphSnapshot.edges]);

  // Use React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Update nodes when graph changes
  useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  // Update edges when graph changes
  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Handle node clicks
  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      onNodeClick(node.data);
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={customNodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        {/* Background grid */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        {/* Controls */}
        {showControls && <Controls />}

        {/* Minimap */}
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as any;
              return data?.type === 'bloc' ? '#a855f7' : '#3b82f6';
            }}
            nodeStrokeWidth={3}
            pannable
            zoomable
          />
        )}

        {/* Info panel */}
        <Panel position="top-right" className="bg-white p-3 rounded shadow-lg">
          <div className="text-xs space-y-1">
            <div className="font-bold mb-2">Graph Stats</div>
            <div>Total Nodes: {nodes.length}</div>
            <div>
              Blocs:{' '}
              {
                nodes.filter(
                  (n) => n.data.type === 'bloc' || n.data.type === 'cubit'
                ).length
              }
            </div>
            <div>
              Active:{' '}
              {
                nodes.filter(
                  (n) => n.data.lifecycle === 'active'
                ).length
              }
            </div>
            <div>
              Consumers:{' '}
              {nodes.reduce(
                (sum, n) => sum + ((n.data as any)?.consumerCount || 0),
                0
              )}
            </div>
            <div className="pt-1 border-t mt-1">
              Edges: {edges.length}
            </div>
          </div>
        </Panel>

        {/* Legend panel */}
        <Panel position="bottom-right" className="bg-white p-3 rounded shadow-lg">
          <div className="text-xs space-y-2">
            <div className="font-bold mb-1">Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-concept-bloc"></div>
              <span>Bloc</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-concept-cubit"></div>
              <span>Cubit</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lifecycle-active"></div>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lifecycle-disposing"></div>
                <span>Disposing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lifecycle-disposed"></div>
                <span>Disposed</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
