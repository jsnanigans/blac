import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsDependencyBloc,
  DevToolsLayoutBloc,
} from '../blocs';
import { T } from '../theme';
import { injectXyflowStyles } from '../inject-xyflow-styles';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  classColor,
  instanceKey,
  computeLayout,
  getSubgraph,
  type BlocNodeData,
} from './dependency-graph-layout';

injectXyflowStyles();

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

const BlocNode: FC<NodeProps<Node<BlocNodeData>>> = ({ data }) => {
  const isOrphan = !data.isConnected;
  return (
    <div
      style={{
        width: data.nodeWidth,
        height: NODE_HEIGHT,
        background: T.bg3,
        border: `1px ${isOrphan ? 'dashed' : 'solid'} ${T.border1}`,
        borderLeft: `3px solid ${data.color}`,
        borderRadius: T.radius,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 12px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: data.highlighted ? `0 0 0 2px ${T.textAccent}` : undefined,
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
      {data.connectionCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -7,
            right: -7,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: data.color,
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1.5px solid ${T.bg1}`,
          }}
        >
          {data.connectionCount}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { bloc: BlocNode };

// --- Style helpers ---

interface StyleCtx {
  search: string;
  selectedId: string | null;
  subgraph: Set<string> | null;
}

function applyNodeStyle(
  node: Node<BlocNodeData>,
  ctx: StyleCtx,
): Node<BlocNodeData> {
  let opacity = node.data.isConnected ? 1 : 0.5;
  let highlighted = false;

  if (ctx.search) {
    const q = ctx.search.toLowerCase();
    const d = node.data;
    const matches =
      d.className.toLowerCase().includes(q) ||
      d.instanceName.toLowerCase().includes(q);
    opacity = matches ? 1 : 0.15;
    highlighted = matches;
  }

  if (ctx.selectedId && ctx.subgraph) {
    const inSubgraph = ctx.subgraph.has(node.id);
    opacity = inSubgraph ? 1 : 0.12;
    highlighted = node.id === ctx.selectedId;
  }

  return {
    ...node,
    style: { ...node.style, opacity, transition: 'opacity 0.2s ease' },
    data: { ...node.data, highlighted },
  };
}

function applyEdgeStyle(edge: Edge, ctx: StyleCtx): Edge {
  const baseColor =
    ((edge.data as Record<string, unknown>)?.baseColor as string) || T.text2;

  if (ctx.selectedId && ctx.subgraph) {
    const inSubgraph =
      ctx.subgraph.has(edge.source) && ctx.subgraph.has(edge.target);
    return {
      ...edge,
      style: {
        stroke: baseColor,
        strokeWidth: inSubgraph ? 2 : 1,
        opacity: inSubgraph ? 0.8 : 0.06,
        transition: 'opacity 0.2s ease',
      },
      animated: inSubgraph,
    };
  }

  return {
    ...edge,
    style: { stroke: baseColor, strokeWidth: 1.5, opacity: 0.6 },
    animated: true,
  };
}

// --- Main flow component ---

const DependencyGraphFlow: FC = () => {
  const [{ instances }] = useBloc(DevToolsInstancesBloc);
  const [{ edges: depEdges }] = useBloc(DevToolsDependencyBloc);
  const [, layoutBloc] = useBloc(DevToolsLayoutBloc);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlocNodeData>>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showOrphans, setShowOrphans] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const pinnedNodesRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hadSearchRef = useRef(false);

  const classByName = useMemo(
    () => new Map(instances.map((i) => [i.className, i.id])),
    [instances],
  );
  const instanceById = useMemo(
    () => new Map(instances.map((i) => [i.id, i])),
    [instances],
  );

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of depEdges) {
      counts.set(e.fromId, (counts.get(e.fromId) || 0) + 1);
      const targetId = classByName.get(e.toClass);
      if (targetId) counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }
    return counts;
  }, [depEdges, classByName]);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    depEdges.forEach((e) => {
      ids.add(e.fromId);
      const targetId = classByName.get(e.toClass);
      if (targetId) ids.add(targetId);
    });
    return ids;
  }, [depEdges, classByName]);

  const rfNodes = useMemo<Node<BlocNodeData>[]>(
    () =>
      instances.map((inst) => {
        const count = connectionCounts.get(inst.id) || 0;
        const isConn = connectedIds.has(inst.id);
        return {
          id: inst.id,
          type: 'bloc',
          position: { x: 0, y: 0 },
          data: {
            className: inst.className,
            instanceName: instanceKey(inst.id),
            color: classColor(inst.className),
            isConnected: isConn,
            connectionCount: count,
            nodeWidth: NODE_WIDTH + Math.min(count * 8, 60),
            highlighted: false,
          },
        };
      }),
    [instances, connectionCounts, connectedIds],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      depEdges
        .map((e, i): Edge | null => {
          const targetId = classByName.get(e.toClass);
          if (!targetId) return null;
          const color = classColor(e.fromClass);
          return {
            id: `${e.fromId}-${e.toClass}-${i}`,
            source: e.fromId,
            target: targetId,
            type: 'default',
            animated: true,
            data: { baseColor: color },
            style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color,
              width: 16,
              height: 16,
            },
          };
        })
        .filter((e): e is Edge => e !== null),
    [depEdges, classByName],
  );

  const graphKey = useMemo(() => {
    const nIds = instances
      .map((i) => i.id)
      .sort()
      .join(',');
    const eIds = depEdges
      .map((e) => `${e.fromId}>${e.toClass}`)
      .sort()
      .join(',');
    return `${nIds}|${eIds}`;
  }, [instances, depEdges]);

  const selectedSubgraph = useMemo(
    () => (selectedNodeId ? getSubgraph(selectedNodeId, rfEdges) : null),
    [selectedNodeId, rfEdges],
  );

  const styleCtxRef = useRef<StyleCtx>({
    search: '',
    selectedId: null,
    subgraph: null,
  });
  styleCtxRef.current = {
    search: debouncedSearch,
    selectedId: selectedNodeId,
    subgraph: selectedSubgraph,
  };

  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  const rfEdgesRef = useRef(rfEdges);
  rfEdgesRef.current = rfEdges;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Layout effect
  useEffect(() => {
    if (rfNodesRef.current.length === 0) return;
    const currentPositions = new Map(
      nodesRef.current.map((n) => [n.id, n.position]),
    );
    void computeLayout(
      rfNodesRef.current,
      rfEdgesRef.current,
      pinnedNodesRef.current,
      currentPositions,
    ).then((positionedNodes) => {
      const ctx = styleCtxRef.current;
      setNodes(positionedNodes.map((n) => applyNodeStyle(n, ctx)));
      setEdges(rfEdgesRef.current.map((e) => applyEdgeStyle(e, ctx)));
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey, layoutVersion, fitView, setNodes, setEdges]);

  // Style effect (search + selection changes)
  useEffect(() => {
    const ctx = styleCtxRef.current;
    setNodes((prev) =>
      prev.map((n) => applyNodeStyle(n as Node<BlocNodeData>, ctx)),
    );
    setEdges((prev) => prev.map((e) => applyEdgeStyle(e, ctx)));
  }, [debouncedSearch, selectedNodeId, selectedSubgraph, setNodes, setEdges]);

  // Search fitView
  useEffect(() => {
    if (debouncedSearch) {
      hadSearchRef.current = true;
      const q = debouncedSearch.toLowerCase();
      const matchIds = nodesRef.current
        .filter((n) => {
          const d = n.data as BlocNodeData;
          return (
            d.className.toLowerCase().includes(q) ||
            d.instanceName.toLowerCase().includes(q)
          );
        })
        .map((n) => ({ id: n.id }));
      if (matchIds.length > 0) {
        fitView({ nodes: matchIds, padding: 0.3, duration: 300 });
      }
    } else if (hadSearchRef.current) {
      hadSearchRef.current = false;
      fitView({ padding: 0.15, duration: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, fitView]);

  // --- Handlers ---

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      setSelectedNodeId(null);
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(
        () => setDebouncedSearch(value),
        150,
      );
    },
    [],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setSearchInput('');
        setDebouncedSearch('');
        e.currentTarget.blur();
      }
    },
    [],
  );

  const handleResetLayout = useCallback(() => {
    pinnedNodesRef.current.clear();
    setSelectedNodeId(null);
    setLayoutVersion((v) => v + 1);
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      layoutBloc.setActiveTab('Instances');
      layoutBloc.setSelectedId(node.id);
    },
    [layoutBloc],
  );

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    pinnedNodesRef.current.add(node.id);
  }, []);

  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHoveredNode({
        id: node.id,
        x: event.clientX - rect.left + 16,
        y: event.clientY - rect.top - 8,
      });
    },
    [],
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNode(null);
  }, []);

  // --- Derived values ---

  const effectiveShowOrphans = showOrphans || !!debouncedSearch;
  const visibleNodes = useMemo(() => {
    if (effectiveShowOrphans) return nodes;
    return nodes.filter((n) => (n.data as BlocNodeData).isConnected);
  }, [nodes, effectiveShowOrphans]);

  const connectedCount = rfNodes.filter((n) => n.data.isConnected).length;
  const orphanCount = rfNodes.length - connectedCount;

  // --- Tooltip ---

  let tooltipContent: React.ReactNode = null;
  if (hoveredNode) {
    const inst = instanceById.get(hoveredNode.id);
    if (inst) {
      const depsOut = depEdges.filter((e) => e.fromId === inst.id).length;
      const depsIn = depEdges.filter(
        (e) => classByName.get(e.toClass) === inst.id,
      ).length;
      let stateStr: string;
      try {
        stateStr = JSON.stringify(inst.state) ?? '';
      } catch {
        stateStr = '[Unserializable]';
      }
      const preview =
        stateStr.length > 100 ? stateStr.slice(0, 100) + '\u2026' : stateStr;
      tooltipContent = (
        <div
          style={{
            position: 'absolute',
            left: hoveredNode.x,
            top: hoveredNode.y,
            zIndex: 20,
            pointerEvents: 'none',
            background: T.bg4,
            border: `1px solid ${T.border2}`,
            borderRadius: T.radius,
            padding: '8px 12px',
            maxWidth: 320,
            fontFamily: T.fontMono,
            fontSize: 11,
          }}
        >
          <div
            style={{
              color: classColor(inst.className),
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {inst.className}
          </div>
          <div style={{ color: T.text1, fontSize: 10, marginBottom: 6 }}>
            {inst.name || instanceKey(inst.id)}
          </div>
          {(depsOut > 0 || depsIn > 0) && (
            <div style={{ color: T.text2, fontSize: 10, marginBottom: 4 }}>
              {depsOut} dep{depsOut !== 1 ? 's' : ''} out &middot; {depsIn} dep
              {depsIn !== 1 ? 's' : ''} in
            </div>
          )}
          {preview && (
            <div
              style={{
                color: T.text2,
                fontSize: 10,
                wordBreak: 'break-all',
                lineHeight: '14px',
              }}
            >
              {preview}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <ReactFlow
        nodes={visibleNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodesDraggable
        nodesConnectable={false}
        fitView
        colorMode="dark"
        style={{ background: T.bg1 }}
      >
        <Panel position="top-left">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: T.bg3,
              border: `1px solid ${T.border1}`,
              borderRadius: T.radius,
              padding: '4px 8px',
            }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search blocs\u2026"
              style={{
                width: 160,
                padding: '2px 6px',
                fontSize: 11,
                fontFamily: T.fontMono,
                background: T.bg1,
                color: T.text0,
                border: `1px solid ${T.border1}`,
                borderRadius: T.radiusSm,
                outline: 'none',
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: T.text2,
                fontFamily: T.fontMono,
                whiteSpace: 'nowrap',
              }}
            >
              {connectedCount} connected &middot; {instances.length} total
            </span>
          </div>
        </Panel>

        <Panel position="top-right">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: T.bg3,
              border: `1px solid ${T.border1}`,
              borderRadius: T.radius,
              padding: '4px 8px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: T.text1,
                fontFamily: T.fontMono,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <input
                type="checkbox"
                checked={showOrphans}
                onChange={(e) => setShowOrphans(e.target.checked)}
                style={{
                  width: 12,
                  height: 12,
                  margin: 0,
                  accentColor: T.textAccent,
                }}
              />
              Unconnected ({orphanCount})
            </label>
            <button
              onClick={handleResetLayout}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: T.fontMono,
                background: T.bg1,
                color: T.text1,
                border: `1px solid ${T.border1}`,
                borderRadius: T.radiusSm,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reset layout
            </button>
          </div>
        </Panel>

        <Controls
          showInteractive={false}
          style={{
            background: T.bg3,
            border: `1px solid ${T.border1}`,
            borderRadius: T.radius,
            overflow: 'hidden',
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          color={T.border0}
          gap={24}
        />
        <MiniMap
          nodeColor={(node: Node) =>
            (node.data as BlocNodeData)?.color || T.text2
          }
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{
            background: T.bg3,
            border: `1px solid ${T.border1}`,
            borderRadius: T.radius,
            width: 160,
            height: 100,
          }}
        />
      </ReactFlow>
      {tooltipContent}
    </div>
  );
};

export const DependencyGraph: FC = React.memo(() => {
  const [{ instances }] = useBloc(DevToolsInstancesBloc);

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

  return (
    <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
      <ReactFlowProvider>
        <DependencyGraphFlow />
      </ReactFlowProvider>
    </div>
  );
});

DependencyGraph.displayName = 'DependencyGraph';
