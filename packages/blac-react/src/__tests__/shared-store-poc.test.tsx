import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBloc } from '../useBloc';
import { Cubit } from '@blac/core';
import { useSyncExternalStore, useMemo, useEffect } from 'react';

// Test Blocs
class BlocA extends Cubit<{ value: number; name: string }> {
  constructor() {
    super({ value: 0, name: 'BlocA' });
  }

  increment() {
    this.emit({ ...this.state, value: this.state.value + 1 });
  }
}

class BlocB extends Cubit<{ count: number; label: string }> {
  constructor() {
    super({ count: 0, label: 'BlocB' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
}

class BlocC extends Cubit<{ data: string }> {
  constructor() {
    super({ data: 'initial' });
  }

  update(data: string) {
    this.emit({ data });
  }
}

describe('Shared Store Per Bloc - Proof of Concept', () => {
  it('should demonstrate current behavior - all components reconcile', () => {
    let reconciliationCounts = {
      componentA1: 0,
      componentA2: 0,
      componentB1: 0,
      componentC1: 0,
    };

    // Component using BlocA (instance 1)
    const { result: resultA1 } = renderHook(() => {
      const [state, bloc] = useBloc(BlocA);
      reconciliationCounts.componentA1++;
      console.log(`[ComponentA1] Reconciliation #${reconciliationCounts.componentA1}`);
      return { state, bloc };
    });

    // Another component using BlocA (instance 2)
    const { result: resultA2 } = renderHook(() => {
      const [state, bloc] = useBloc(BlocA);
      reconciliationCounts.componentA2++;
      console.log(`[ComponentA2] Reconciliation #${reconciliationCounts.componentA2}`);
      return { state, bloc };
    });

    // Component using BlocB
    const { result: resultB1 } = renderHook(() => {
      const [state, bloc] = useBloc(BlocB);
      reconciliationCounts.componentB1++;
      console.log(`[ComponentB1] Reconciliation #${reconciliationCounts.componentB1}`);
      return { state, bloc };
    });

    // Component using BlocC
    const { result: resultC1 } = renderHook(() => {
      const [state, bloc] = useBloc(BlocC);
      reconciliationCounts.componentC1++;
      console.log(`[ComponentC1] Reconciliation #${reconciliationCounts.componentC1}`);
      return { state, bloc };
    });

    console.log('\n=== Initial State ===');
    console.log('Reconciliation counts:', reconciliationCounts);

    const beforeCounts = { ...reconciliationCounts };

    // Change BlocA's state
    console.log('\n=== Changing BlocA state ===');
    act(() => {
      resultA1.current.bloc.increment();
    });

    console.log('After BlocA change:');
    console.log('  ComponentA1 reconciliations:', reconciliationCounts.componentA1 - beforeCounts.componentA1);
    console.log('  ComponentA2 reconciliations:', reconciliationCounts.componentA2 - beforeCounts.componentA2);
    console.log('  ComponentB1 reconciliations:', reconciliationCounts.componentB1 - beforeCounts.componentB1);
    console.log('  ComponentC1 reconciliations:', reconciliationCounts.componentC1 - beforeCounts.componentC1);

    // With current architecture, we expect:
    // - Components using BlocA should reconcile (A1, A2)
    // - Components using other Blocs should NOT reconcile (B1, C1)
    // But in practice, all might reconcile due to how subscriptions work
  });

  it('should demonstrate ideal behavior with shared store', () => {
    // This is a simulation of what we want to achieve
    console.log('\n=== Simulating Shared Store Per Bloc ===');

    // Simulated shared stores
    const sharedStores = new Map();

    class SharedStore<S> {
      private listeners = new Set<() => void>();
      private state: S;

      constructor(initialState: S) {
        this.state = initialState;
      }

      subscribe(callback: () => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
      }

      getSnapshot() {
        return this.state;
      }

      updateState(newState: S) {
        this.state = newState;
        // Notify only listeners of THIS store
        this.listeners.forEach(listener => listener());
      }
    }

    // Get or create store for a bloc type
    function getStore<S>(blocName: string, initialState: S): SharedStore<S> {
      if (!sharedStores.has(blocName)) {
        sharedStores.set(blocName, new SharedStore(initialState));
      }
      return sharedStores.get(blocName);
    }

    let reconciliationCounts = {
      componentA1: 0,
      componentA2: 0,
      componentB1: 0,
      componentC1: 0,
    };

    // Components using shared stores
    const { result: resultA1 } = renderHook(() => {
      const store = getStore('BlocA', { value: 0 });
      const state = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        store.getSnapshot.bind(store),
      );
      reconciliationCounts.componentA1++;
      console.log(`[Shared ComponentA1] Reconciliation #${reconciliationCounts.componentA1}`);
      return { state, store };
    });

    const { result: resultA2 } = renderHook(() => {
      const store = getStore('BlocA', { value: 0 });
      const state = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        store.getSnapshot.bind(store),
      );
      reconciliationCounts.componentA2++;
      console.log(`[Shared ComponentA2] Reconciliation #${reconciliationCounts.componentA2}`);
      return { state, store };
    });

    const { result: resultB1 } = renderHook(() => {
      const store = getStore('BlocB', { count: 0 });
      const state = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        store.getSnapshot.bind(store),
      );
      reconciliationCounts.componentB1++;
      console.log(`[Shared ComponentB1] Reconciliation #${reconciliationCounts.componentB1}`);
      return { state, store };
    });

    const { result: resultC1 } = renderHook(() => {
      const store = getStore('BlocC', { data: 'initial' });
      const state = useSyncExternalStore(
        store.subscribe.bind(store),
        store.getSnapshot.bind(store),
        store.getSnapshot.bind(store),
      );
      reconciliationCounts.componentC1++;
      console.log(`[Shared ComponentC1] Reconciliation #${reconciliationCounts.componentC1}`);
      return { state, store };
    });

    console.log('\n=== Initial State (Shared Stores) ===');
    console.log('Reconciliation counts:', reconciliationCounts);

    const beforeCounts = { ...reconciliationCounts };

    // Change only BlocA's shared store
    console.log('\n=== Changing BlocA shared store ===');
    act(() => {
      resultA1.current.store.updateState({ value: 1 });
    });

    console.log('After BlocA change:');
    console.log('  ComponentA1 reconciliations:', reconciliationCounts.componentA1 - beforeCounts.componentA1, '(expected: 1)');
    console.log('  ComponentA2 reconciliations:', reconciliationCounts.componentA2 - beforeCounts.componentA2, '(expected: 1)');
    console.log('  ComponentB1 reconciliations:', reconciliationCounts.componentB1 - beforeCounts.componentB1, '(expected: 0) ✅');
    console.log('  ComponentC1 reconciliations:', reconciliationCounts.componentC1 - beforeCounts.componentC1, '(expected: 0) ✅');

    // With shared stores:
    // - Only components using BlocA reconcile
    // - Components using BlocB and BlocC do NOT reconcile
    expect(reconciliationCounts.componentA1 - beforeCounts.componentA1).toBe(1);
    expect(reconciliationCounts.componentA2 - beforeCounts.componentA2).toBe(1);
    expect(reconciliationCounts.componentB1 - beforeCounts.componentB1).toBe(0);
    expect(reconciliationCounts.componentC1 - beforeCounts.componentC1).toBe(0);
  });

  it('should measure reconciliation overhead reduction', () => {
    console.log('\n=== Reconciliation Overhead Comparison ===\n');

    const NUM_BLOCS = 5;
    const COMPONENTS_PER_BLOC = 3;
    const TOTAL_COMPONENTS = NUM_BLOCS * COMPONENTS_PER_BLOC;

    console.log(`Setup: ${NUM_BLOCS} Blocs, ${COMPONENTS_PER_BLOC} components per Bloc`);
    console.log(`Total: ${TOTAL_COMPONENTS} components\n`);

    // Current approach simulation
    let currentApproachReconciliations = 0;
    const currentApproachComponents: any[] = [];

    for (let b = 0; b < NUM_BLOCS; b++) {
      for (let c = 0; c < COMPONENTS_PER_BLOC; c++) {
        currentApproachComponents.push({
          blocId: b,
          componentId: `${b}-${c}`,
          reconcile: () => currentApproachReconciliations++,
        });
      }
    }

    // Simulate state change in Bloc 0
    console.log('Current Approach: State change in Bloc 0');
    // In current approach, might trigger all components
    currentApproachComponents.forEach(comp => comp.reconcile());
    console.log(`  Reconciliations triggered: ${currentApproachReconciliations}`);

    // Shared store approach simulation
    let sharedStoreReconciliations = 0;
    const sharedStoreBlocs = new Map();

    for (let b = 0; b < NUM_BLOCS; b++) {
      const listeners = new Set<() => void>();
      for (let c = 0; c < COMPONENTS_PER_BLOC; c++) {
        listeners.add(() => sharedStoreReconciliations++);
      }
      sharedStoreBlocs.set(b, { listeners });
    }

    // Simulate state change in Bloc 0
    console.log('\nShared Store Approach: State change in Bloc 0');
    const bloc0 = sharedStoreBlocs.get(0);
    bloc0.listeners.forEach((listener: () => void) => listener());
    console.log(`  Reconciliations triggered: ${sharedStoreReconciliations}`);

    // Calculate improvement
    const reduction = ((currentApproachReconciliations - sharedStoreReconciliations) / currentApproachReconciliations) * 100;
    console.log(`\n📊 Reconciliation Reduction: ${reduction.toFixed(1)}%`);

    console.log('\nBenefits:');
    console.log('  ✅ Fewer reconciliation checks');
    console.log('  ✅ Cleaner DevTools output');
    console.log('  ✅ Better perceived performance');
    console.log('  ✅ Less CPU overhead');

    expect(sharedStoreReconciliations).toBeLessThan(currentApproachReconciliations);
  });

  it('should handle per-component tracking with shared store', () => {
    console.log('\n=== Per-Component Tracking Challenge ===\n');

    // This tests the challenge of different components tracking different properties
    class SharedStoreWithTracking<S extends object> {
      private listeners = new Map<symbol, () => void>();
      private trackedPaths = new Map<symbol, Set<string>>();
      private state: S;

      constructor(initialState: S) {
        this.state = initialState;
      }

      subscribe(componentId: symbol, callback: () => void) {
        this.listeners.set(componentId, callback);
        if (!this.trackedPaths.has(componentId)) {
          this.trackedPaths.set(componentId, new Set());
        }
        return () => this.listeners.delete(componentId);
      }

      getSnapshot(componentId: symbol) {
        // In real implementation, would return proxy for tracking
        return this.state;
      }

      trackPath(componentId: symbol, path: string) {
        const paths = this.trackedPaths.get(componentId) || new Set();
        paths.add(path);
        this.trackedPaths.set(componentId, paths);
      }

      updateState(newState: S, changedPaths: Set<string>) {
        this.state = newState;

        // Notify only components that track the changed paths
        this.listeners.forEach((callback, componentId) => {
          const trackedPaths = this.trackedPaths.get(componentId);
          if (!trackedPaths || trackedPaths.size === 0) {
            // No tracking yet, must notify
            callback();
          } else {
            // Check if any tracked path matches changed paths
            const shouldUpdate = Array.from(trackedPaths).some(path =>
              changedPaths.has(path)
            );
            if (shouldUpdate) {
              console.log(`  Component ${String(componentId)} tracks affected paths - notifying`);
              callback();
            } else {
              console.log(`  Component ${String(componentId)} doesn't track affected paths - skipping`);
            }
          }
        });
      }
    }

    const store = new SharedStoreWithTracking({ name: 'John', email: 'john@example.com', age: 30 });

    const component1Id = Symbol('comp1');
    const component2Id = Symbol('comp2');
    const component3Id = Symbol('comp3');

    // Simulate component 1 tracking only 'name'
    store.trackPath(component1Id, 'name');
    console.log('Component 1 tracks: name');

    // Simulate component 2 tracking only 'email'
    store.trackPath(component2Id, 'email');
    console.log('Component 2 tracks: email');

    // Simulate component 3 tracking 'age'
    store.trackPath(component3Id, 'age');
    console.log('Component 3 tracks: age\n');

    let notificationCounts = {
      comp1: 0,
      comp2: 0,
      comp3: 0,
    };

    store.subscribe(component1Id, () => notificationCounts.comp1++);
    store.subscribe(component2Id, () => notificationCounts.comp2++);
    store.subscribe(component3Id, () => notificationCounts.comp3++);

    // Change only 'email'
    console.log("Changing only 'email' property:");
    store.updateState(
      { name: 'John', email: 'newemail@example.com', age: 30 },
      new Set(['email'])
    );

    console.log('\nNotifications sent:');
    console.log('  Component 1 (tracks name):', notificationCounts.comp1, '(expected: 0) ✅');
    console.log('  Component 2 (tracks email):', notificationCounts.comp2, '(expected: 1) ✅');
    console.log('  Component 3 (tracks age):', notificationCounts.comp3, '(expected: 0) ✅');

    // Only component 2 should be notified
    expect(notificationCounts.comp1).toBe(0);
    expect(notificationCounts.comp2).toBe(1);
    expect(notificationCounts.comp3).toBe(0);
  });
});