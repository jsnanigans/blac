import React, { FC, useMemo, useState } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsInstancesBloc, DevToolsDependencyBloc, DevToolsLayoutBloc } from '../blocs';
import type { DependencyEdge } from '../types';

interface GraphNode {
  id: string;
  className: string;
  name: string;
  x: number;
  y: number;
  level: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 40;
const LEVEL_GAP = 200;
const NODE_GAP = 60;

/**
 * Simple hierarchical layout:
 * 1. Build adjacency map
 * 2. Assign levels via BFS from roots (no incoming edges)
 * 3. Position nodes within each level
 */
function computeLayout(
  nodes: Array<{ id: string; className: string; name: string }>,
  edges: DependencyEdge[],
): GraphNode[] {
  if (nodes.length === 0) return [];

  const incomingCount = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    // Find the target node by matching className to find the actual instance
    const targetNode = nodes.find((n) => n.className === edge.toClass);
    if (!targetNode) continue;
    incomingCount.set(targetNode.id, (incomingCount.get(targetNode.id) ?? 0) + 1);
    outgoing.get(edge.fromId)?.push(targetNode.id);
  }

  // BFS from roots
  const levels = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, count] of incomingCount) {
    if (count === 0) {
      levels.set(id, 0);
      queue.push(id);
    }
  }

  // Any node not reached gets level 0 (disconnected)
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const level = levels.get(id) ?? 0;
    for (const childId of (outgoing.get(id) ?? [])) {
      const existing = levels.get(childId) ?? -1;
      if (existing < level + 1) {
        levels.set(childId, level + 1);
        queue.push(childId);
      }
    }
  }

  for (const node of nodes) {
    if (!levels.has(node.id)) levels.set(node.id, 0);
  }

  // Group by level
  const byLevel = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(id);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const result: GraphNode[] = [];

  for (const [level, ids] of byLevel) {
    const totalHeight = ids.length * (NODE_HEIGHT + NODE_GAP) - NODE_GAP;
    ids.forEach((id, i) => {
      const node = nodeMap.get(id);
      if (!node) return;
      result.push({
        ...node,
        level,
        x: level * LEVEL_GAP + 20,
        y: i * (NODE_HEIGHT + NODE_GAP) + 20 - totalHeight / 2 + 200,
      });
    });
  }

  return result;
}

function classColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

export const DependencyGraph: FC = React.memo(() => {
  const [{ instances }] = useBloc(DevToolsInstancesBloc);
  const [{ edges }] = useBloc(DevToolsDependencyBloc);
  const [, layoutBloc] = useBloc(DevToolsLayoutBloc);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animatingEdges, setAnimatingEdges] = useState<Set<string>>(new Set());

  const nodes = useMemo(
    () =>
      instances.map((inst) => ({
        id: inst.id,
        className: inst.className,
        name: inst.name,
      })),
    [instances],
  );

  const layoutNodes = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  const nodeMap = useMemo(
    () => new Map(layoutNodes.map((n) => [n.id, n])),
    [layoutNodes],
  );

  const svgWidth = useMemo(() => {
    if (layoutNodes.length === 0) return 400;
    return Math.max(...layoutNodes.map((n) => n.x + NODE_WIDTH + 40));
  }, [layoutNodes]);

  const svgHeight = useMemo(() => {
    if (layoutNodes.length === 0) return 300;
    return Math.max(...layoutNodes.map((n) => n.y + NODE_HEIGHT + 40));
  }, [layoutNodes]);

  if (instances.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '13px',
        }}
      >
        No instances to display
      </div>
    );
  }

  if (edges.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '16px',
        }}
      >
        <div
          style={{
            marginBottom: '12px',
            fontSize: '11px',
            color: '#888',
          }}
        >
          No dependencies detected. Use <code style={{ color: '#569cd6' }}>this.depend(OtherBloc)</code> in your blocs to track dependencies.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {instances.map((inst) => (
            <div
              key={inst.id}
              style={{
                padding: '6px 10px',
                background: '#252526',
                border: `1px solid ${classColor(inst.className)}`,
                borderRadius: '4px',
                fontSize: '11px',
                color: '#ccc',
                cursor: 'pointer',
              }}
              onClick={() => {
                layoutBloc.setActiveTab('Instances');
                layoutBloc.setSelectedId(inst.id);
              }}
            >
              <span style={{ color: classColor(inst.className) }}>{inst.className}</span>
              <span style={{ color: '#666', marginLeft: '6px', fontSize: '10px' }}>{inst.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#1a1a1a', position: 'relative' }}>
      <svg
        width={svgWidth}
        height={Math.max(svgHeight, 300)}
        style={{ display: 'block' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#555" />
          </marker>
          <marker
            id="arrowhead-hover"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#569cd6" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.fromId);
          const toNode = layoutNodes.find((n) => n.className === edge.toClass);
          if (!from || !toNode) return null;

          const isHighlighted =
            hoveredId === edge.fromId || hoveredId === toNode.id;
          const edgeKey = `${edge.fromId}-${edge.toClass}-${i}`;
          const isAnimating = animatingEdges.has(edgeKey);

          const x1 = from.x + NODE_WIDTH;
          const y1 = from.y + NODE_HEIGHT / 2;
          const x2 = toNode.x;
          const y2 = toNode.y + NODE_HEIGHT / 2;

          // Cubic bezier control points
          const cx1 = x1 + (x2 - x1) * 0.5;
          const cy1 = y1;
          const cx2 = x2 - (x2 - x1) * 0.5;
          const cy2 = y2;

          return (
            <path
              key={edgeKey}
              d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
              fill="none"
              stroke={isHighlighted || isAnimating ? '#569cd6' : '#3a3a3a'}
              strokeWidth={isHighlighted ? 2 : 1.5}
              markerEnd={`url(#${isHighlighted ? 'arrowhead-hover' : 'arrowhead'})`}
              style={{ transition: 'stroke 0.2s' }}
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((node) => {
          const color = classColor(node.className);
          const isHovered = hoveredId === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                layoutBloc.setActiveTab('Instances');
                layoutBloc.setSelectedId(node.id);
              }}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={4}
                fill={isHovered ? '#2a2a2a' : '#252526'}
                stroke={isHovered ? color : '#3a3a3a'}
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: 'all 0.15s' }}
              />
              <rect
                width={3}
                height={NODE_HEIGHT}
                rx={2}
                fill={color}
              />
              <text
                x={12}
                y={15}
                fill={color}
                fontSize={11}
                fontWeight={600}
                fontFamily="monospace"
              >
                {node.className.length > 16 ? node.className.slice(0, 14) + '…' : node.className}
              </text>
              <text
                x={12}
                y={29}
                fill="#666"
                fontSize={10}
                fontFamily="monospace"
              >
                {node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          fontSize: '10px',
          color: '#555',
        }}
      >
        {instances.length} instances · {edges.length} {edges.length === 1 ? 'dependency' : 'dependencies'} · click node to inspect
      </div>
    </div>
  );
});

DependencyGraph.displayName = 'DependencyGraph';
