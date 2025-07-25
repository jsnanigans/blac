import { FrameworkAdapter, FrameworkAdapterOptions } from '@blac/core';
import { BlocBase } from '@blac/core';

/**
 * React-specific implementation of the FrameworkAdapter
 * Designed to work seamlessly with React's useSyncExternalStore
 */
export class ReactAdapter<B extends BlocBase<any>> extends FrameworkAdapter<B> {
  private snapshotCache: any = undefined;
  private isFirstSnapshot = true;
  private unsubscribeFn: (() => void) | null = null;

  constructor(bloc: B, options: FrameworkAdapterOptions<B>) {
    super(bloc, options);
  }

  /**
   * Get state snapshot optimized for React's useSyncExternalStore
   * Ensures stable references when possible
   */
  getSnapshot = (): any => {
    const newSnapshot = this.getStateSnapshot();
    
    // On first snapshot, always return the value
    if (this.isFirstSnapshot) {
      this.isFirstSnapshot = false;
      this.snapshotCache = newSnapshot;
      return newSnapshot;
    }

    // For subsequent snapshots, check if value actually changed
    // This helps React optimize re-renders
    if (this.snapshotCache !== newSnapshot) {
      this.snapshotCache = newSnapshot;
    }

    return this.snapshotCache;
  };

  /**
   * Create subscription compatible with useSyncExternalStore
   */
  subscribe = (onStoreChange: () => void): (() => void) => {
    // Initialize on first subscription
    this.initialize();
    
    // Clean up any existing subscription
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
    }
    
    // Subscribe to state changes
    const unsubscribe = this.bloc._observer.subscribe({
      id: this.options.consumerId,
      fn: onStoreChange,
    });
    
    this.unsubscribeFn = unsubscribe;
    
    return () => {
      if (this.unsubscribeFn === unsubscribe) {
        unsubscribe();
        this.unsubscribeFn = null;
      }
    };
  };

  /**
   * Get server snapshot (for SSR support)
   * Currently returns the same as client snapshot
   */
  getServerSnapshot = (): any => {
    return this.getSnapshot();
  };
}