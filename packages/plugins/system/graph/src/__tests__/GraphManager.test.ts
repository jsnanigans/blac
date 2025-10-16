import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphManager } from '../graph/GraphManager';
import type { SerializationConfig } from '../serialization';
import type { BlocBase } from '@blac/core';

const defaultConfig: SerializationConfig = {
  maxDepth: 2,
  maxStringLength: 100,
};

// Mock BlocBase instances for testing
function createMockBloc(overrides: Partial<BlocBase<any>> = {}): BlocBase<any> {
  return {
    uid: overrides.uid || 'test-bloc-123',
    _name: overrides._name || 'TestBloc',
    _isolated: overrides._isolated ?? false,
    _keepAlive: overrides._keepAlive ?? false,
    state: overrides.state ?? { count: 0 },
    subscriptionCount: overrides.subscriptionCount ?? 0,
    isDisposed: overrides.isDisposed ?? false,
    add: vi.fn(), // Blocs have 'add' method
    ...overrides,
  } as any;
}

function createMockCubit(overrides: Partial<BlocBase<any>> = {}): BlocBase<any> {
  const cubit = createMockBloc(overrides);
  // Remove 'add' method to make it a Cubit
  delete (cubit as any).add;
  return cubit;
}

describe.skip('GraphManager', () => {
  let manager: GraphManager;

  beforeEach(() => {
    manager = new GraphManager(defaultConfig);
  });

  describe('createRootNode', () => {
    it('should create root node with initial stats', () => {
      manager.createRootNode();
      const snapshot = manager.getSnapshot();

      expect(snapshot.nodes).toHaveLength(1);
      expect(snapshot.nodes[0]).toMatchObject({
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
      });
    });

    it('should have no edges after creating root node', () => {
      manager.createRootNode();
      const snapshot = manager.getSnapshot();

      expect(snapshot.edges).toHaveLength(0);
    });
  });

  describe('updateRootStats', () => {
    it('should update root node statistics', () => {
      manager.createRootNode();

      const newStats = {
        totalBlocs: 5,
        activeBlocs: 4,
        disposedBlocs: 1,
        totalConsumers: 10,
        memoryStats: {
          registeredBlocs: 3,
          isolatedBlocs: 2,
          keepAliveBlocs: 1,
        },
      };

      manager.updateRootStats(newStats);
      const snapshot = manager.getSnapshot();
      const rootNode = snapshot.nodes[0];

      expect(rootNode).toMatchObject({
        type: 'root',
        stats: newStats,
      });
    });
  });

  describe('addBlocNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should add a Bloc node to the graph', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        _name: 'CounterBloc',
        subscriptionCount: 2,
      });

      manager.addBlocNode(bloc);
      const snapshot = manager.getSnapshot();

      // Should have root + bloc
      expect(snapshot.nodes).toHaveLength(2);
      expect(snapshot.nodes[1]).toMatchObject({
        id: 'bloc-bloc-123',
        type: 'bloc',
        parentId: 'blac-root',
        name: 'CounterBloc',
        instanceId: 'bloc-123',
        lifecycle: 'active',
        consumerCount: 2,
        isShared: true,
        isIsolated: false,
        keepAlive: false,
      });
    });

    it('should add a Cubit node to the graph', () => {
      const cubit = createMockCubit({
        uid: 'cubit-456',
        _name: 'CounterCubit',
      });

      manager.addBlocNode(cubit);
      const snapshot = manager.getSnapshot();

      expect(snapshot.nodes[1]).toMatchObject({
        id: 'bloc-cubit-456',
        type: 'cubit',
        parentId: 'blac-root',
        name: 'CounterCubit',
      });
    });

    it('should create edge from root to bloc', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });

      manager.addBlocNode(bloc);
      const snapshot = manager.getSnapshot();

      expect(snapshot.edges).toHaveLength(1);
      expect(snapshot.edges[0]).toMatchObject({
        id: 'edge-blac-root-bloc-bloc-123',
        source: 'blac-root',
        target: 'bloc-bloc-123',
        type: 'hierarchy',
      });
    });

    it('should handle isolated blocs', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        _isolated: true,
      });

      manager.addBlocNode(bloc);
      const node = manager.getBlocNode('bloc-123');

      expect(node).toMatchObject({
        isShared: false,
        isIsolated: true,
      });
    });

    it('should handle keepAlive blocs', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        _keepAlive: true,
      });

      manager.addBlocNode(bloc);
      const node = manager.getBlocNode('bloc-123');

      expect(node).toMatchObject({
        keepAlive: true,
      });
    });
  });

  describe('updateBlocNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should update bloc node properties', () => {
      const bloc = createMockBloc({ uid: 'bloc-123', subscriptionCount: 1 });
      manager.addBlocNode(bloc);

      manager.updateBlocNode('bloc-123', {
        consumerCount: 5,
        lifecycle: 'disposal_requested',
      });

      const node = manager.getBlocNode('bloc-123');
      expect(node).toMatchObject({
        consumerCount: 5,
        lifecycle: 'disposal_requested',
      });
    });

    it('should do nothing if bloc node does not exist', () => {
      manager.updateBlocNode('nonexistent', { consumerCount: 10 });
      const node = manager.getBlocNode('nonexistent');
      expect(node).toBeUndefined();
    });
  });

  describe('removeBlocNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should remove bloc node from graph', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);

      manager.removeBlocNode('bloc-123');
      const snapshot = manager.getSnapshot();

      // Should only have root node left
      expect(snapshot.nodes).toHaveLength(1);
      expect(snapshot.nodes[0].type).toBe('root');
    });

    it('should remove edge from root to bloc', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);

      manager.removeBlocNode('bloc-123');
      const snapshot = manager.getSnapshot();

      expect(snapshot.edges).toHaveLength(0);
    });

    it('should handle removing non-existent bloc', () => {
      manager.removeBlocNode('nonexistent');
      const snapshot = manager.getSnapshot();

      // Should still have root node
      expect(snapshot.nodes).toHaveLength(1);
    });
  });

  describe('addStateNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should add state node for a bloc', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        state: { count: 42 },
      });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const snapshot = manager.getSnapshot();

      // Should have root + bloc + state
      expect(snapshot.nodes).toHaveLength(3);
      const stateNode = snapshot.nodes.find((n) => n.type === 'state');

      expect(stateNode).toMatchObject({
        id: 'state-bloc-123',
        type: 'state',
        parentId: 'bloc-bloc-123',
        isPrimitive: false,
        isExpandable: true,
        valueType: 'object',
        childCount: 1,
        hasChanged: false,
      });

      expect(stateNode?.displayValue).toContain('count');
      expect(stateNode?.fullValue).toContain('42');
    });

    it('should create edge from bloc to state', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const snapshot = manager.getSnapshot();

      // Should have edge: root->bloc and bloc->state
      expect(snapshot.edges).toHaveLength(2);
      expect(snapshot.edges[1]).toMatchObject({
        id: 'edge-bloc-bloc-123-state-bloc-123',
        source: 'bloc-bloc-123',
        target: 'state-bloc-123',
        type: 'hierarchy',
      });
    });

    it('should handle primitive state', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        state: 42,
      });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const stateNode = manager.getStateNode('bloc-123');

      expect(stateNode).toMatchObject({
        isPrimitive: true,
        isExpandable: false,
        valueType: 'number',
        displayValue: '42',
      });
    });

    it('should handle array state', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        state: [1, 2, 3],
      });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const stateNode = manager.getStateNode('bloc-123');

      expect(stateNode).toMatchObject({
        isPrimitive: false,
        isExpandable: true,
        valueType: 'array',
        childCount: 3,
      });
    });
  });

  describe('updateStateNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should update state node when state changes', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        state: { count: 0 },
      });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const newState = { count: 1 };
      manager.updateStateNode('bloc-123', newState, { count: 0 });

      const stateNode = manager.getStateNode('bloc-123');
      expect(stateNode?.fullValue).toContain('"count": 1');
      expect(stateNode?.hasChanged).toBe(true);
    });

    it('should mark hasChanged flag on update', () => {
      const bloc = createMockBloc({ uid: 'bloc-123', state: 0 });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      manager.updateStateNode('bloc-123', 1, 0);

      const stateNode = manager.getStateNode('bloc-123');
      expect(stateNode?.hasChanged).toBe(true);
    });

    it('should handle non-existent state node', () => {
      manager.updateStateNode('nonexistent', { new: 'state' }, { old: 'state' });
      const stateNode = manager.getStateNode('nonexistent');
      expect(stateNode).toBeUndefined();
    });

    it('should update metadata when state changes', () => {
      const bloc = createMockBloc({
        uid: 'bloc-123',
        state: { count: 0 },
      });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      // Change from object to primitive
      manager.updateStateNode('bloc-123', 42, { count: 0 });

      const stateNode = manager.getStateNode('bloc-123');
      expect(stateNode).toMatchObject({
        isPrimitive: true,
        isExpandable: false,
        valueType: 'number',
        displayValue: '42',
      });
    });
  });

  describe('removeStateNode', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should remove state node from graph', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      manager.removeStateNode('bloc-123');
      const snapshot = manager.getSnapshot();

      // Should have root + bloc (no state)
      expect(snapshot.nodes).toHaveLength(2);
      expect(snapshot.nodes.every((n) => n.type !== 'state')).toBe(true);
    });

    it('should remove edge from bloc to state', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      manager.removeStateNode('bloc-123');
      const snapshot = manager.getSnapshot();

      // Should only have root->bloc edge
      expect(snapshot.edges).toHaveLength(1);
      expect(snapshot.edges[0].source).toBe('blac-root');
    });

    it('should handle removing non-existent state node', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);

      manager.removeStateNode('bloc-123');
      const snapshot = manager.getSnapshot();

      // Should have root + bloc
      expect(snapshot.nodes).toHaveLength(2);
    });
  });

  describe('getSnapshot', () => {
    it('should return empty snapshot initially', () => {
      const snapshot = manager.getSnapshot();

      expect(snapshot.nodes).toHaveLength(0);
      expect(snapshot.edges).toHaveLength(0);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should return complete graph snapshot', () => {
      manager.createRootNode();

      const bloc1 = createMockBloc({ uid: 'bloc-1' });
      const bloc2 = createMockBloc({ uid: 'bloc-2' });

      manager.addBlocNode(bloc1);
      manager.addStateNode(bloc1);
      manager.addBlocNode(bloc2);
      manager.addStateNode(bloc2);

      const snapshot = manager.getSnapshot();

      // root + 2 blocs + 2 states
      expect(snapshot.nodes).toHaveLength(5);

      // 2 root->bloc edges + 2 bloc->state edges
      expect(snapshot.edges).toHaveLength(4);

      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const snapshot = manager.getSnapshot();
      const after = Date.now();

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('clear', () => {
    it('should clear all graph data', () => {
      manager.createRootNode();

      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      manager.clear();
      const snapshot = manager.getSnapshot();

      expect(snapshot.nodes).toHaveLength(0);
      expect(snapshot.edges).toHaveLength(0);
    });
  });

  describe('atomic updates', () => {
    beforeEach(() => {
      manager.createRootNode();
    });

    it('should add bloc and state together atomically', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });

      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      const snapshot = manager.getSnapshot();

      // Verify both bloc and state nodes exist
      const blocNode = snapshot.nodes.find((n) => n.type === 'bloc');
      const stateNode = snapshot.nodes.find((n) => n.type === 'state');

      expect(blocNode).toBeDefined();
      expect(stateNode).toBeDefined();

      // Verify edges are correct
      expect(snapshot.edges).toHaveLength(2);
    });

    it('should remove state before bloc for atomic deletion', () => {
      const bloc = createMockBloc({ uid: 'bloc-123' });
      manager.addBlocNode(bloc);
      manager.addStateNode(bloc);

      // Remove state first, then bloc
      manager.removeStateNode('bloc-123');
      manager.removeBlocNode('bloc-123');

      const snapshot = manager.getSnapshot();

      // Should only have root node
      expect(snapshot.nodes).toHaveLength(1);
      expect(snapshot.edges).toHaveLength(0);
    });
  });
});
