import React, { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import ELKBundled from 'elkjs/lib/elk.bundled.js';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsDependencyBloc,
  DevToolsLayoutBloc,
} from '../blocs';
import { T } from '../theme';
import { injectXyflowStyles } from '../inject-xyflow-styles';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 52;

function instanceKey(id: string): string {
  const i = id.indexOf(':');
  return i !== -1 ? id.slice(i + 1) : id;
}

function classColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
}

type BlocNodeData = {
  label: string;
  className: string;
  instanceName: string;
  color: string;
};

const hiddenHandle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  opacity: 0,
  pointerEvents: 'none',
};

const BlocNode: FC<NodeProps<Node<BlocNodeData>>> = ({ data }) => (
  <div
    style={{
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      background: T.bg3,
      border: `1px solid ${T.border1}`,
      borderLeft: `3px solid ${data.color}`,
      borderRadius: T.radius,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 12px',
      boxSizing: 'border-box',
      cursor: 'pointer',
    }}
  >
    <Handle type="target" position={Position.Left} style={hiddenHandle} />
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: data.color,
        fontFamily: T.fontMono,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: '16px',
      }}
    >
      {data.className}
    </div>
    <div
      style={{
        fontSize: 10,
        color: T.text1,
        fontFamily: T.fontMono,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: '14px',
      }}
    >
      {data.instanceName}
    </div>
    <Handle type="source" position={Position.Right} style={hiddenHandle} />
  </div>
);

const nodeTypes = { bloc: BlocNode };

injectXyflowStyles();

const elk = new ELKBundled();

interface ELKNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

async function computeELKLayout(
  rfNodes: Node<BlocNodeData>[],
  rfEdges: Edge[],
): Promise<{ nodes: Node<BlocNodeData>[]; edges: Edge[] }> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: rfNodes.map((n: Node<BlocNodeData>) => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: rfEdges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layouted = await elk.layout(graph);

  return {
    nodes: rfNodes.map((n) => {
      const ln = layouted.children?.find((c: ELKNode) => c.id === n.id);
      return {
        ...n,
        position: { x: ln?.x ?? 0, y: ln?.y ?? 0 },
      } as Node<BlocNodeData>;
    }),
    edges: rfEdges,
  };
}

const DependencyGraphFlow: FC = () => {
  const [{ instances }] = useBloc(DevToolsInstancesBloc);
  const [{ edges: depEdges }] = useBloc(DevToolsDependencyBloc);
  const [, layoutBloc] = useBloc(DevToolsLayoutBloc);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlocNodeData>>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    const classByName = new Map(instances.map((i) => [i.className, i.id]));
    depEdges.forEach((e) => {
      ids.add(e.fromId);
      const targetId = classByName.get(e.toClass);
      if (targetId) ids.add(targetId);
    });
    return ids;
  }, [instances, depEdges]);

  const rfNodes = useMemo<Node<BlocNodeData>[]>(
    () =>
      instances
        .filter((inst) => connectedIds.has(inst.id))
        .map((inst) => ({
          id: inst.id,
          type: 'bloc',
          position: { x: 0, y: 0 },
          data: {
            label: inst.className,
            className: inst.className,
            instanceName: instanceKey(inst.id),
            color: classColor(inst.className),
          },
        })),
    [instances, connectedIds],
  );

  const rfEdges = useMemo<Edge[]>(() => {
    const classByName = new Map(instances.map((i) => [i.className, i.id]));
    return depEdges
      .map((e, i): Edge | null => {
        const targetId = classByName.get(e.toClass);
        if (!targetId) return null;
        return {
          id: `${e.fromId}-${e.toClass}-${i}`,
          source: e.fromId,
          target: targetId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: T.text2, strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: T.text2,
            width: 16,
            height: 16,
          },
        };
      })
      .filter((e): e is Edge => e !== null);
  }, [depEdges, instances]);

  // Only re-run ELK when graph structure changes, not on data updates
  const graphKey = useMemo(() => {
    const nodeIds = [...connectedIds].sort().join(',');
    const edgeIds = depEdges
      .map((e) => `${e.fromId}>${e.toClass}`)
      .sort()
      .join(',');
    return `${nodeIds}|${edgeIds}`;
  }, [connectedIds, depEdges]);

  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  const rfEdgesRef = useRef(rfEdges);
  rfEdgesRef.current = rfEdges;

  useEffect(() => {
    if (rfNodesRef.current.length === 0) return;
    void computeELKLayout(rfNodesRef.current, rfEdgesRef.current).then(
      ({ nodes: ln, edges: le }) => {
        setNodes(ln);
        setEdges(le);
        requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
      },
    );
  }, [graphKey, fitView, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      layoutBloc.setActiveTab('Instances');
      layoutBloc.setSelectedId(node.id);
    },
    [layoutBloc],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      fitView
      colorMode="dark"
      style={{ background: T.bg1 }}
    >
      <Controls
        showInteractive={false}
        style={{
          background: T.bg3,
          border: `1px solid ${T.border1}`,
          borderRadius: T.radius,
          overflow: 'hidden',
        }}
      />
      <Background variant={BackgroundVariant.Dots} color={T.border0} gap={24} />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: T.text2,
          fontFamily: T.fontMono,
          background: T.bg3,
          border: `1px solid ${T.border1}`,
          borderRadius: T.radius,
          padding: '4px 8px',
        }}
      >
        <span>A</span>
        <svg width="24" height="8" viewBox="0 0 24 8">
          <line
            x1="0"
            y1="4"
            x2="18"
            y2="4"
            stroke={T.text2}
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <polygon points="18,1 24,4 18,7" fill={T.text2} />
        </svg>
        <span>depends on B</span>
      </div>
    </ReactFlow>
  );
};

export const DependencyGraph: FC = React.memo(() => {
  const [{ instances }] = useBloc(DevToolsInstancesBloc);
  const [{ edges: depEdges }] = useBloc(DevToolsDependencyBloc);
  const [, layoutBloc] = useBloc(DevToolsLayoutBloc);

  if (instances.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.text2,
          fontSize: 13,
        }}
      >
        No instances to display
      </div>
    );
  }

  if (depEdges.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 12, fontSize: 11, color: T.text1 }}>
          No dependencies detected. Use{' '}
          <code style={{ color: T.textAccent }}>this.depend(OtherBloc)</code> in
          your blocs to track dependencies.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {instances.map((inst) => {
            const color = classColor(inst.className);
            return (
              <div
                key={inst.id}
                onClick={() => {
                  layoutBloc.setActiveTab('Instances');
                  layoutBloc.setSelectedId(inst.id);
                }}
                style={{
                  padding: '5px 10px',
                  background: T.bg3,
                  border: `1px solid ${T.border1}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: T.radius,
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color }}>{inst.className}</span>
                <span style={{ color: T.text2, fontSize: 10 }}>
                  {inst.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
      <ReactFlowProvider>
        <DependencyGraphFlow />
      </ReactFlowProvider>
    </div>
  );
});

DependencyGraph.displayName = 'DependencyGraph';
