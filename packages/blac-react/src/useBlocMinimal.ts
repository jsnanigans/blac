import { useMemo, useSyncExternalStore } from 'react';
import {
  StateContainer,
  type ExtractState,
  type BlocConstructor,
  type AnyObject,
  ProxyTracker,
} from '@blac/core';

class DependencyTracker<T extends AnyObject> {
  private proxyTracker = new ProxyTracker<T>();
  private trackedPaths = new Set<string>();
  private previousValues = new Map<string, any>();

  startTracking(): void {
    this.proxyTracker.startTracking();
  }

  createProxy(state: T): T {
    return this.proxyTracker.createProxy(state);
  }

  captureTrackedPaths(state: T): void {
    // Stop tracking and capture paths
    const newTrackedPaths = this.proxyTracker.stopTracking();
    this.trackedPaths = newTrackedPaths;

    // Store current values for comparison
    this.previousValues.clear();
    for (const path of this.trackedPaths) {
      const value = this.getValueAtPath(state, path);
      this.previousValues.set(path, value);
    }
  }

  hasChanges(state: T): boolean {
    // First render - no previous values to compare
    if (this.trackedPaths.size === 0) {
      return true;
    }

    // Check if any tracked property changed
    for (const path of this.trackedPaths) {
      const currentValue = this.getValueAtPath(state, path);
      const previousValue = this.previousValues.get(path);

      if (!Object.is(currentValue, previousValue)) {
        return true;
      }
    }

    return false;
  }

  private getValueAtPath(obj: any, path: string): any {
    // Handle nested paths: "user.profile.name" and "items[0].id"
    const parts = path.split(/\.|\[|\]/).filter(Boolean);

    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }
}

class BlacLibraryAdapter<TBloc extends StateContainer<AnyObject, AnyObject>> {
  public bloc: TBloc;
  private tracker = new DependencyTracker<ExtractState<TBloc>>();

  constructor(BlocClass: BlocConstructor<TBloc>) {
    // Get or create bloc instance
    this.bloc = (BlocClass as any).instance ?? new BlocClass();
  }

  startAccessTracking(): void {
    this.tracker.startTracking();
  }

  endAccessTracking(): void {
    this.tracker.captureTrackedPaths(this.bloc.state);
  }

  getStateProxy(): ExtractState<TBloc> {
    return this.tracker.createProxy(this.bloc.state);
  }

  subscribe(callback: () => void): () => void {
    // Subscribe with change detection
    return this.bloc.subscribe(() => {
      if (this.tracker.hasChanges(this.bloc.state)) {
        callback();
      }
    });
  }
}

export function useBlocMinimal<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(BlocClass: BlocConstructor<TBloc>): [ExtractState<TBloc>, TBloc] {
  // Stable adapter instance - created once per component
  const adapter = useMemo(() => new BlacLibraryAdapter(BlocClass), [BlocClass]);

  const state = useSyncExternalStore(
    // AFTER render: capture tracked paths and subscribe with change detection
    (callback) => {
      adapter.endAccessTracking();
      return adapter.subscribe(callback);
    },
    // DURING render: start tracking and return fresh proxy
    () => {
      adapter.startAccessTracking();
      return adapter.getStateProxy();
    },
  );

  return [state, adapter.bloc];
}
