/**
 * Detailed trace to understand how dependency tracking actually works
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useMemo, useSyncExternalStore } from 'react';
import { ProxyTracker, type AnyObject, type BlocConstructor, StateContainer, type ExtractState } from '@blac/core';

// Instrumented version of the original implementation
class InstrumentedDependencyTracker<T extends AnyObject> {
  private proxyTracker = new ProxyTracker<T>();
  private trackedPaths = new Set<string>();
  private previousValues = new Map<string, any>();
  private traceId: string;

  constructor(traceId: string) {
    this.traceId = traceId;
  }

  startTracking(): void {
    console.log(`[${this.traceId}] startTracking() called`);
    this.proxyTracker.startTracking();
  }

  createProxy(state: T): T {
    const proxy = this.proxyTracker.createProxy(state);
    console.log(`[${this.traceId}] createProxy() called`);
    return proxy;
  }

  captureTrackedPaths(state: T): void {
    const newTrackedPaths = this.proxyTracker.stopTracking();
    console.log(`[${this.traceId}] captureTrackedPaths() - new paths:`, Array.from(newTrackedPaths));
    console.log(`[${this.traceId}] captureTrackedPaths() - old paths:`, Array.from(this.trackedPaths));

    this.trackedPaths = newTrackedPaths; // Original behavior: REPLACE

    console.log(`[${this.traceId}] captureTrackedPaths() - after update:`, Array.from(this.trackedPaths));

    this.previousValues.clear();
    for (const path of this.trackedPaths) {
      const value = this.getValueAtPath(state, path);
      this.previousValues.set(path, value);
    }
  }

  hasChanges(state: T): boolean {
    if (this.trackedPaths.size === 0) {
      console.log(`[${this.traceId}] hasChanges() - no paths tracked, returning true`);
      return true;
    }

    for (const path of this.trackedPaths) {
      const currentValue = this.getValueAtPath(state, path);
      const previousValue = this.previousValues.get(path);

      if (!Object.is(currentValue, previousValue)) {
        console.log(`[${this.traceId}] hasChanges() - change detected in "${path}": ${previousValue} -> ${currentValue}`);
        return true;
      }
    }

    console.log(`[${this.traceId}] hasChanges() - no changes detected`);
    return false;
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }
}

class InstrumentedAdapter<TBloc extends StateContainer<AnyObject, AnyObject>> {
  public bloc: TBloc;
  private tracker: InstrumentedDependencyTracker<ExtractState<TBloc>>;
  private traceId: string;
  private getSnapshotCount = 0;
  private subscribeCount = 0;

  constructor(BlocClass: BlocConstructor<TBloc>, traceId: string) {
    this.bloc = (BlocClass as any).instance ?? new BlocClass();
    this.tracker = new InstrumentedDependencyTracker(traceId);
    this.traceId = traceId;
  }

  startAccessTracking(): void {
    console.log(`[${this.traceId}] adapter.startAccessTracking()`);
    this.tracker.startTracking();
  }

  endAccessTracking(): void {
    console.log(`[${this.traceId}] adapter.endAccessTracking()`);
    this.tracker.captureTrackedPaths(this.bloc.state);
  }

  getStateProxy(): ExtractState<TBloc> {
    this.getSnapshotCount++;
    console.log(`[${this.traceId}] adapter.getStateProxy() - call #${this.getSnapshotCount}`);
    return this.tracker.createProxy(this.bloc.state);
  }

  subscribe(callback: () => void): () => void {
    this.subscribeCount++;
    console.log(`[${this.traceId}] adapter.subscribe() - call #${this.subscribeCount}`);

    return this.bloc.subscribe(() => {
      console.log(`[${this.traceId}] subscription callback triggered - checking for changes`);
      if (this.tracker.hasChanges(this.bloc.state)) {
        console.log(`[${this.traceId}] triggering re-render`);
        callback();
      }
    });
  }
}

function useInstrumentedBloc<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  traceId: string
): [ExtractState<TBloc>, TBloc] {
  console.log(`[${traceId}] === useInstrumentedBloc render ===`);

  const adapter = useMemo(() => {
    console.log(`[${traceId}] Creating adapter`);
    return new InstrumentedAdapter(BlocClass, traceId);
  }, [BlocClass, traceId]);

  const state = useSyncExternalStore(
    (callback) => {
      console.log(`[${traceId}] useSyncExternalStore.subscribe called`);
      adapter.endAccessTracking();
      return adapter.subscribe(callback);
    },
    () => {
      console.log(`[${traceId}] useSyncExternalStore.getSnapshot called`);
      adapter.startAccessTracking();
      return adapter.getStateProxy();
    },
  );

  return [state, adapter.bloc];
}

class TestBloc extends Cubit<{ a: number; b: number }> {
  static isolated = true;
  constructor() {
    super({ a: 0, b: 0 });
  }
  incrementA = () => this.emit({ ...this.state, a: this.state.a + 1 });
  incrementB = () => this.emit({ ...this.state, b: this.state.b + 1 });
}

describe('Tracking Trace', () => {
  it('should trace exactly how tracking works', () => {
    console.log('\n========== TRACKING TRACE TEST ==========\n');

    let renderCount = 0;
    let accessB = false;

    const { result } = renderHook(() => {
      renderCount++;
      console.log(`\n>>> Component render #${renderCount}, accessB=${accessB}`);

      const [state, bloc] = useInstrumentedBloc(TestBloc, 'trace');

      if (!accessB) {
        console.log(`>>> Accessing state.a: ${state.a}`);
        return { value: state.a, bloc };
      } else {
        console.log(`>>> Accessing state.b: ${state.b}`);
        return { value: state.b, bloc };
      }
    });

    const bloc = result.current.bloc;

    console.log('\n--- TEST: Update a (should re-render) ---');
    act(() => bloc.incrementA());

    console.log('\n--- TEST: Update b (should NOT re-render) ---');
    act(() => bloc.incrementB());

    console.log('\n--- TEST: Switch to accessing b, force re-render ---');
    accessB = true;
    act(() => bloc.incrementA());

    console.log('\n--- TEST: Update b (will it re-render???) ---');
    act(() => bloc.incrementB());

    console.log('\n========== END TRACE ==========\n');

    TestBloc.release();
  });
});