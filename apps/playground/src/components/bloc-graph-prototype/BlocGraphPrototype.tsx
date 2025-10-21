/**
 * React Flow Prototype for BloC Graph Visualization
 *
 * Purpose: Validate React Flow performance with realistic BloC instance data
 * before committing to full implementation.
 *
 * Test Goals:
 * - 20+ mock Bloc/Cubit nodes
 * - Custom grid layout algorithm
 * - Rapid state updates (10+ updates/second)
 * - Compound nodes (expandable state)
 * - Zoom, pan, minimap controls
 *
 * Performance Targets:
 * - Desktop Chrome: 60fps
 * - Mobile Safari: 30fps minimum
 * - 50+ nodes stress test
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Mock data types
interface BlocNodeData {
  id: string;
  name: string;
  type: 'bloc' | 'cubit';
  instancePattern: 'shared' | 'isolated' | 'keepAlive';
  lifecycle: 'active' | 'disposing' | 'disposed';
  state: Record<string, unknown>;
  consumerCount: number;
  expanded: boolean;
}

// Custom Node Component
function BlocNodeComponent({ data }: { data: BlocNodeData }) {
  const [isExpanded, setIsExpanded] = useState(data.expanded);

  const getBorderColor = () => {
    if (data.type === 'bloc') return 'border-purple-500';
    return 'border-blue-500';
  };

  const getLifecycleColor = () => {
    switch (data.lifecycle) {
      case 'active':
        return 'bg-green-500';
      case 'disposing':
        return 'bg-orange-500';
      case 'disposed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getInstancePatternColor = () => {
    switch (data.instancePattern) {
      case 'shared':
        return 'text-cyan-600';
      case 'isolated':
        return 'text-orange-600';
      case 'keepAlive':
        return 'text-violet-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`bg-white border-2 ${getBorderColor()} rounded-lg shadow-lg min-w-[200px] max-w-[300px]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex-1">
          <div className="font-bold text-sm">{data.name}</div>
          <div className={`text-xs ${getInstancePatternColor()}`}>
            {data.instancePattern}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${getLifecycleColor()}`}
            title={data.lifecycle}
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="text-xs text-gray-600 mb-2">
          Consumers: {data.consumerCount}
        </div>

        {isExpanded && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
            <div className="font-bold mb-1">State:</div>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(data.state, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Custom node types
const nodeTypes = {
  blocNode: BlocNodeComponent,
};

// Mock data generator
function generateMockNodes(count: number): Node[] {
  const nodes: Node[] = [];
  const types: Array<'bloc' | 'cubit'> = ['bloc', 'cubit'];
  const patterns: Array<'shared' | 'isolated' | 'keepAlive'> = [
    'shared',
    'isolated',
    'keepAlive',
  ];
  const lifecycles: Array<'active' | 'disposing' | 'disposed'> = [
    'active',
    'disposing',
    'disposed',
  ];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const lifecycle = lifecycles[Math.floor(Math.random() * lifecycles.length)];

    nodes.push({
      id: `node-${i}`,
      type: 'blocNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        id: `instance-${i}`,
        name: `${type === 'bloc' ? 'Bloc' : 'Cubit'}_${i}`,
        type,
        instancePattern: pattern,
        lifecycle,
        state: {
          count: Math.floor(Math.random() * 100),
          timestamp: Date.now(),
          nested: {
            value: Math.random().toFixed(2),
          },
        },
        consumerCount: Math.floor(Math.random() * 5),
        expanded: Math.random() > 0.7, // 30% expanded
      },
    });
  }

  return nodes;
}

// Grid layout algorithm
function applyGridLayout(nodes: Node[]): Node[] {
  const GRID_SIZE = 350; // spacing between nodes
  const COLS = 5; // nodes per row

  // Group by instance pattern
  const grouped = nodes.reduce(
    (acc, node) => {
      const pattern = (node.data as unknown as BlocNodeData).instancePattern;
      if (!acc[pattern]) acc[pattern] = [];
      acc[pattern].push(node);
      return acc;
    },
    {} as Record<string, Node[]>,
  );

  let yOffset = 0;
  const layouted: Node[] = [];

  // Layout each group
  Object.entries(grouped).forEach(([pattern, groupNodes]) => {
    groupNodes.forEach((node, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);

      layouted.push({
        ...node,
        position: {
          x: col * GRID_SIZE,
          y: yOffset + row * GRID_SIZE,
        },
      });
    });

    // Move to next group
    yOffset += Math.ceil(groupNodes.length / COLS) * GRID_SIZE + 100;
  });

  return layouted;
}

// Generate mock edges (consumer relationships)
function generateMockEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const nodeCount = nodes.length;

  // Create some random connections (about 30% of nodes)
  for (let i = 0; i < nodeCount * 0.3; i++) {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    const targetIdx = Math.floor(Math.random() * nodeCount);

    if (sourceIdx !== targetIdx) {
      edges.push({
        id: `edge-${i}`,
        source: nodes[sourceIdx].id,
        target: nodes[targetIdx].id,
        type: 'default',
        animated: Math.random() > 0.5,
        style: { stroke: '#94a3b8' },
      });
    }
  }

  return edges;
}

export function BlocGraphPrototype() {
  const [nodeCount, setNodeCount] = useState(20);
  const [updateRate, setUpdateRate] = useState(10); // updates per second
  const [isUpdating, setIsUpdating] = useState(false);
  const [fps, setFps] = useState(0);

  // Initialize nodes and edges
  const initialNodes = useMemo(
    () => applyGridLayout(generateMockNodes(nodeCount)),
    [nodeCount],
  );
  const initialEdges = useMemo(
    () => generateMockEdges(initialNodes),
    [initialNodes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Simulate rapid state updates
  useEffect(() => {
    if (!isUpdating) return;

    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            state: {
              ...(node.data as unknown as BlocNodeData).state,
              count: Math.floor(Math.random() * 100),
              timestamp: Date.now(),
            },
          },
        })),
      );
    }, 1000 / updateRate);

    return () => clearInterval(interval);
  }, [isUpdating, updateRate, setNodes]);

  const regenerateGraph = useCallback(() => {
    const newNodes = applyGridLayout(generateMockNodes(nodeCount));
    const newEdges = generateMockEdges(newNodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodeCount, setNodes, setEdges]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Control Panel */}
      <div className="bg-white border-b shadow-sm p-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Node Count:</label>
          <input
            type="number"
            min="5"
            max="100"
            value={nodeCount}
            onChange={(e) => setNodeCount(parseInt(e.target.value) || 20)}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Update Rate (Hz):</label>
          <input
            type="number"
            min="1"
            max="60"
            value={updateRate}
            onChange={(e) => setUpdateRate(parseInt(e.target.value) || 10)}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
        </div>

        <button
          onClick={() => setIsUpdating(!isUpdating)}
          className={`px-4 py-2 rounded font-medium text-sm ${
            isUpdating
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isUpdating ? 'Stop Updates' : 'Start Updates'}
        </button>

        <button
          onClick={regenerateGraph}
          className="px-4 py-2 rounded font-medium text-sm bg-blue-500 hover:bg-blue-600 text-white"
        >
          Regenerate
        </button>

        <div className="flex items-center gap-4 ml-auto">
          <div className="text-sm">
            <span className="font-medium">Nodes:</span> {nodes.length}
          </div>
          <div className="text-sm">
            <span className="font-medium">Edges:</span> {edges.length}
          </div>
          <div className="text-sm">
            <span className="font-medium">FPS:</span>{' '}
            <span
              className={`font-bold ${
                fps >= 55
                  ? 'text-green-600'
                  : fps >= 30
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {fps}
            </span>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as BlocNodeData;
              return data.type === 'bloc' ? '#a855f7' : '#3b82f6';
            }}
            nodeStrokeWidth={3}
          />
          <Panel
            position="top-right"
            className="bg-white p-3 rounded shadow-lg"
          >
            <div className="text-xs space-y-1">
              <div className="font-bold mb-2">Performance Test</div>
              <div>Target: 60fps (desktop)</div>
              <div>Minimum: 30fps (mobile)</div>
              <div className="mt-2 pt-2 border-t">
                <div className="font-medium">Test Checklist:</div>
                <div>✓ 20+ nodes</div>
                <div>✓ Grid layout</div>
                <div>✓ State updates</div>
                <div>✓ Compound nodes</div>
                <div>✓ Controls</div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
