import type { BlocBase } from '@blac/core';
import type {
  GraphNode,
  GraphEdge,
  GraphSnapshot,
  RootGraphNode,
  BlocGraphNode,
  StateRootNode,
  StatePropertyNode,
} from '../types';
import {
  expandStateTree,
  type SerializationConfig,
  type StateTreeExpansionConfig,
} from '../serialization';

const ROOT_NODE_ID = 'blac-root';

/**
 * Manages the internal graph state and provides snapshot functionality
 */
export class GraphManager {
  private rootNode: RootGraphNode | null = null;
  private blocNodes = new Map<string, BlocGraphNode>();
  private stateRootNodes = new Map<string, StateRootNode>();
  private statePropertyNodes = new Map<string, StatePropertyNode>();
  private edges = new Map<string, GraphEdge>();
  private config: StateTreeExpansionConfig;

  constructor(config: SerializationConfig) {
    this.config = {
      ...config,
      maxDepth: config.maxDepth ?? 3,
      maxArrayItems: 100,
      detectCircularRefs: true,
    };
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
   * Adds a State root node and expands state into property nodes
   */
  addStateNode(bloc: BlocBase<unknown>): void {
    const stateRootNodeId = `state-${bloc.uid}`;
    const blocNodeId = `bloc-${bloc.uid}`;

    // Determine root value type
    const valueType =
      bloc.state === null
        ? 'null'
        : bloc.state === undefined
        ? 'undefined'
        : Array.isArray(bloc.state)
        ? 'array'
        : typeof bloc.state;

    // Create state root node
    const stateRootNode: StateRootNode = {
      id: stateRootNodeId,
      type: 'state-root',
      parentId: blocNodeId,
      valueType,
      hasChanged: false,
    };

    this.stateRootNodes.set(bloc.uid, stateRootNode);

    // Create edge from bloc to state root
    const rootEdgeId = `edge-${blocNodeId}-${stateRootNodeId}`;
    this.edges.set(rootEdgeId, {
      id: rootEdgeId,
      source: blocNodeId,
      target: stateRootNodeId,
      type: 'hierarchy',
    });

    // Expand state into property nodes
    const { nodes } = expandStateTree(bloc.state, stateRootNodeId, this.config);

    // Store all property nodes and create edges
    for (const node of nodes) {
      this.statePropertyNodes.set(node.id, node);

      // Create edge from parent to this node
      const edgeId = `edge-${node.parentId}-${node.id}`;
      this.edges.set(edgeId, {
        id: edgeId,
        source: node.parentId,
        target: node.id,
        type: 'hierarchy',
      });
    }
  }

  /**
   * Updates a State node when state changes
   * Re-expands the entire state tree for simplicity
   */
  updateStateNode(
    blocUid: string,
    currentState: unknown,
    previousState: unknown
  ): void {
    const stateRootNode = this.stateRootNodes.get(blocUid);
    if (!stateRootNode) return;

    // Mark state root as changed
    stateRootNode.hasChanged = true;

    // Update value type
    const valueType =
      currentState === null
        ? 'null'
        : currentState === undefined
        ? 'undefined'
        : Array.isArray(currentState)
        ? 'array'
        : typeof currentState;

    stateRootNode.valueType = valueType;

    // Remove all existing property nodes for this state
    const propertyNodesToRemove: string[] = [];
    for (const [nodeId, node] of this.statePropertyNodes.entries()) {
      if (node.id.startsWith(`${stateRootNode.id}.`)) {
        propertyNodesToRemove.push(nodeId);
      }
    }

    // Remove nodes and their edges
    for (const nodeId of propertyNodesToRemove) {
      this.statePropertyNodes.delete(nodeId);

      // Remove edges connected to this node
      const edgesToRemove: string[] = [];
      for (const [edgeId, edge] of this.edges.entries()) {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToRemove.push(edgeId);
        }
      }

      for (const edgeId of edgesToRemove) {
        this.edges.delete(edgeId);
      }
    }

    // Re-expand state into property nodes
    const { nodes } = expandStateTree(
      currentState,
      stateRootNode.id,
      this.config
    );

    // Store all new property nodes and create edges
    for (const node of nodes) {
      // Mark as changed for animation
      node.hasChanged = true;

      this.statePropertyNodes.set(node.id, node);

      // Create edge from parent to this node
      const edgeId = `edge-${node.parentId}-${node.id}`;
      this.edges.set(edgeId, {
        id: edgeId,
        source: node.parentId,
        target: node.id,
        type: 'hierarchy',
      });
    }

    // Clear hasChanged flags after a short delay (for animation)
    setTimeout(() => {
      stateRootNode.hasChanged = false;
      for (const node of nodes) {
        const storedNode = this.statePropertyNodes.get(node.id);
        if (storedNode) {
          storedNode.hasChanged = false;
        }
      }
    }, 500);
  }

  /**
   * Removes a State root node and all its property nodes from the graph
   */
  removeStateNode(blocUid: string): void {
    const stateRootNode = this.stateRootNodes.get(blocUid);
    if (!stateRootNode) return;

    const blocNodeId = `bloc-${blocUid}`;

    // Remove all property nodes that belong to this state
    const propertyNodesToRemove: string[] = [];
    for (const [nodeId, node] of this.statePropertyNodes.entries()) {
      if (node.id.startsWith(`${stateRootNode.id}.`)) {
        propertyNodesToRemove.push(nodeId);
      }
    }

    for (const nodeId of propertyNodesToRemove) {
      this.statePropertyNodes.delete(nodeId);

      // Remove edges connected to this node
      const edgesToRemove: string[] = [];
      for (const [edgeId, edge] of this.edges.entries()) {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToRemove.push(edgeId);
        }
      }

      for (const edgeId of edgesToRemove) {
        this.edges.delete(edgeId);
      }
    }

    // Remove the state root node
    this.stateRootNodes.delete(blocUid);

    // Remove edge from bloc to state root
    const rootEdgeId = `edge-${blocNodeId}-${stateRootNode.id}`;
    this.edges.delete(rootEdgeId);
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

    // Add all state root nodes
    for (const stateRootNode of this.stateRootNodes.values()) {
      nodes.push(stateRootNode);
    }

    // Add all state property nodes
    for (const propertyNode of this.statePropertyNodes.values()) {
      nodes.push(propertyNode);
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
   * Gets a State root node by Bloc UID
   */
  getStateRootNode(blocUid: string): StateRootNode | undefined {
    return this.stateRootNodes.get(blocUid);
  }

  /**
   * Gets a State property node by ID
   */
  getStatePropertyNode(nodeId: string): StatePropertyNode | undefined {
    return this.statePropertyNodes.get(nodeId);
  }

  /**
   * Clears all graph data
   */
  clear(): void {
    this.rootNode = null;
    this.blocNodes.clear();
    this.stateRootNodes.clear();
    this.statePropertyNodes.clear();
    this.edges.clear();
  }
}
