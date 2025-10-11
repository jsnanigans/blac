import type { BlocBase } from '@blac/core';
import type {
  GraphNode,
  GraphEdge,
  GraphSnapshot,
  RootGraphNode,
  BlocGraphNode,
  StateGraphNode,
} from '../types';
import { analyzeStateValue, type SerializationConfig } from '../serialization';

const ROOT_NODE_ID = 'blac-root';

/**
 * Manages the internal graph state and provides snapshot functionality
 */
export class GraphManager {
  private rootNode: RootGraphNode | null = null;
  private blocNodes = new Map<string, BlocGraphNode>();
  private stateNodes = new Map<string, StateGraphNode>();
  private edges = new Map<string, GraphEdge>();
  private config: SerializationConfig;

  constructor(config: SerializationConfig) {
    this.config = config;
  }

  /**
   * Creates the root node representing the Blac instance
   */
  createRootNode(): void {
    this.rootNode = {
      id: ROOT_NODE_ID,
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
    };
  }

  /**
   * Updates root node statistics
   */
  updateRootStats(stats: RootGraphNode['stats']): void {
    if (this.rootNode) {
      this.rootNode.stats = stats;
    }
  }

  /**
   * Adds a Bloc/Cubit node to the graph
   */
  addBlocNode(bloc: BlocBase<unknown>): void {
    const nodeId = `bloc-${bloc.uid}`;
    const isCubit = !('add' in bloc); // Simple heuristic: Blocs have 'add' method

    const node: BlocGraphNode = {
      id: nodeId,
      type: isCubit ? 'cubit' : 'bloc',
      parentId: ROOT_NODE_ID,
      name: bloc._name,
      instanceId: bloc.uid,
      lifecycle: 'active', // Will be updated as needed
      consumerCount: bloc.subscriptionCount,
      isShared: !bloc._isolated,
      isIsolated: bloc._isolated,
      keepAlive: bloc._keepAlive,
    };

    this.blocNodes.set(bloc.uid, node);

    // Create edge from root to bloc
    const edgeId = `edge-${ROOT_NODE_ID}-${nodeId}`;
    this.edges.set(edgeId, {
      id: edgeId,
      source: ROOT_NODE_ID,
      target: nodeId,
      type: 'hierarchy',
    });
  }

  /**
   * Updates a Bloc/Cubit node (e.g., consumer count, lifecycle)
   */
  updateBlocNode(
    blocUid: string,
    updates: Partial<Omit<BlocGraphNode, 'id' | 'type' | 'parentId'>>
  ): void {
    const node = this.blocNodes.get(blocUid);
    if (node) {
      Object.assign(node, updates);
    }
  }

  /**
   * Removes a Bloc/Cubit node from the graph
   */
  removeBlocNode(blocUid: string): void {
    const node = this.blocNodes.get(blocUid);
    if (!node) return;

    // Remove the node
    this.blocNodes.delete(blocUid);

    // Remove edge from root to bloc
    const edgeId = `edge-${ROOT_NODE_ID}-${node.id}`;
    this.edges.delete(edgeId);
  }

  /**
   * Adds a State node for a Bloc/Cubit
   */
  addStateNode(bloc: BlocBase<unknown>): void {
    const stateNodeId = `state-${bloc.uid}`;
    const blocNodeId = `bloc-${bloc.uid}`;

    const metadata = analyzeStateValue(bloc.state, this.config);

    const node: StateGraphNode = {
      id: stateNodeId,
      type: 'state',
      parentId: blocNodeId,
      displayValue: metadata.displayValue,
      fullValue: metadata.fullValue,
      isPrimitive: metadata.isPrimitive,
      isExpandable: metadata.isExpandable,
      valueType: metadata.type,
      childCount: metadata.childCount,
      hasChanged: false,
    };

    this.stateNodes.set(bloc.uid, node);

    // Create edge from bloc to state
    const edgeId = `edge-${blocNodeId}-${stateNodeId}`;
    this.edges.set(edgeId, {
      id: edgeId,
      source: blocNodeId,
      target: stateNodeId,
      type: 'hierarchy',
    });
  }

  /**
   * Updates a State node when state changes
   */
  updateStateNode(
    blocUid: string,
    currentState: unknown,
    previousState: unknown
  ): void {
    const node = this.stateNodes.get(blocUid);
    if (!node) return;

    const metadata = analyzeStateValue(currentState, this.config);

    node.displayValue = metadata.displayValue;
    node.fullValue = metadata.fullValue;
    node.isPrimitive = metadata.isPrimitive;
    node.isExpandable = metadata.isExpandable;
    node.valueType = metadata.type;
    node.childCount = metadata.childCount;
    node.hasChanged = true; // Mark for flash animation

    // Clear hasChanged flag after a short delay (for animation)
    setTimeout(() => {
      node.hasChanged = false;
    }, 500);
  }

  /**
   * Removes a State node from the graph
   */
  removeStateNode(blocUid: string): void {
    const node = this.stateNodes.get(blocUid);
    if (!node) return;

    const blocNodeId = `bloc-${blocUid}`;

    // Remove the node
    this.stateNodes.delete(blocUid);

    // Remove edge from bloc to state
    const edgeId = `edge-${blocNodeId}-${node.id}`;
    this.edges.delete(edgeId);
  }

  /**
   * Generates a complete graph snapshot
   */
  getSnapshot(): GraphSnapshot {
    const nodes: GraphNode[] = [];

    // Add root node
    if (this.rootNode) {
      nodes.push(this.rootNode);
    }

    // Add all bloc nodes
    for (const blocNode of this.blocNodes.values()) {
      nodes.push(blocNode);
    }

    // Add all state nodes
    for (const stateNode of this.stateNodes.values()) {
      nodes.push(stateNode);
    }

    // Collect all edges
    const edges = Array.from(this.edges.values());

    return {
      nodes,
      edges,
      timestamp: Date.now(),
    };
  }

  /**
   * Gets a Bloc node by UID
   */
  getBlocNode(blocUid: string): BlocGraphNode | undefined {
    return this.blocNodes.get(blocUid);
  }

  /**
   * Gets a State node by Bloc UID
   */
  getStateNode(blocUid: string): StateGraphNode | undefined {
    return this.stateNodes.get(blocUid);
  }

  /**
   * Clears all graph data
   */
  clear(): void {
    this.rootNode = null;
    this.blocNodes.clear();
    this.stateNodes.clear();
    this.edges.clear();
  }
}
