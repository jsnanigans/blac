import { BlacPlugin, Blac, type BlocBase } from '@blac/core';
import { GraphManager } from './graph';
import type { GraphSnapshot, GraphUpdateCallback } from './types';
import type { SerializationConfig } from './serialization';

/**
 * Configuration options for GraphPlugin
 */
export interface GraphPluginConfig {
  /** Throttle interval for graph updates in milliseconds (default: 100) */
  throttleInterval?: number;
  /** Maximum depth for state serialization (default: 2) */
  maxStateDepth?: number;
  /** Maximum string length before truncation (default: 100) */
  maxStateStringLength?: number;
}

/**
 * Graph visualization plugin for BlaC state management
 *
 * Provides hierarchical graph visualization with:
 * - Root node (Blac instance) with global statistics
 * - Bloc/Cubit nodes with lifecycle and consumer information
 * - State nodes with serialized state values
 *
 * @example
 * ```typescript
 * import { GraphPlugin } from '@blac/plugin-graph';
 * import { Blac } from '@blac/core';
 *
 * // Register the plugin
 * Blac.plugins.add(new GraphPlugin({
 *   throttleInterval: 100,
 *   maxStateDepth: 2,
 *   maxStateStringLength: 100,
 * }));
 * ```
 */
export class GraphPlugin implements BlacPlugin {
  readonly name = 'GraphPlugin';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true,
  };

  private graphManager: GraphManager;
  private subscribers = new Set<GraphUpdateCallback>();
  private updateThrottle: ReturnType<typeof setTimeout> | null = null;
  private updatePending = false;
  private config: Required<GraphPluginConfig>;

  constructor(config: GraphPluginConfig = {}) {
    this.config = {
      throttleInterval: config.throttleInterval ?? 100,
      maxStateDepth: config.maxStateDepth ?? 2,
      maxStateStringLength: config.maxStateStringLength ?? 100,
    };

    const serializationConfig: SerializationConfig = {
      maxDepth: this.config.maxStateDepth,
      maxStringLength: this.config.maxStateStringLength,
    };

    this.graphManager = new GraphManager(serializationConfig);
  }

  // ===== Lifecycle Hooks =====

  /**
   * Called after Blac bootstraps - create root node
   */
  afterBootstrap(): void {
    this.graphManager.createRootNode();
    this.updateRootStats();
    this.notifySubscribers();
  }

  /**
   * Called when a Bloc/Cubit is created
   */
  onBlocCreated(bloc: BlocBase<any>): void {
    // Add Bloc node
    this.graphManager.addBlocNode(bloc);

    // Add State node
    this.graphManager.addStateNode(bloc);

    // Update root stats
    this.updateRootStats();

    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Called when a Bloc/Cubit is disposed
   */
  onBlocDisposed(bloc: BlocBase<any>): void {
    // Remove State node first (child before parent)
    this.graphManager.removeStateNode(bloc.uid);

    // Remove Bloc node
    this.graphManager.removeBlocNode(bloc.uid);

    // Update root stats
    this.updateRootStats();

    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Called when state changes
   */
  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any
  ): void {
    // Update State node
    this.graphManager.updateStateNode(bloc.uid, currentState, previousState);

    // Update Bloc node consumer count (may have changed)
    this.graphManager.updateBlocNode(bloc.uid, {
      consumerCount: bloc.subscriptionCount,
    });

    // Notify subscribers
    this.notifySubscribers();
  }

  // ===== Public API =====

  /**
   * Subscribe to graph updates
   *
   * @param callback - Function called with graph snapshot on updates
   * @returns Unsubscribe function
   */
  subscribeToGraph(callback: GraphUpdateCallback): () => void {
    this.subscribers.add(callback);

    // Send initial snapshot immediately
    try {
      callback(this.getGraphSnapshot());
    } catch (error) {
      console.error('[GraphPlugin] Error in subscriber callback (initial):', error);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current graph snapshot
   *
   * @returns Current graph state
   */
  getGraphSnapshot(): GraphSnapshot {
    return this.graphManager.getSnapshot();
  }

  /**
   * Update throttle interval dynamically
   *
   * @param interval - New throttle interval in milliseconds
   */
  setThrottleInterval(interval: number): void {
    this.config.throttleInterval = interval;
  }

  // ===== Internal Methods =====

  /**
   * Updates root node with current statistics from Blac instance
   */
  private updateRootStats(): void {
    try {
      const blac = Blac.instance;
      const memoryStats = blac.getMemoryStats();

      // Count active and disposed blocs
      let activeCount = 0;
      let disposedCount = 0;
      let totalConsumers = 0;

      // Iterate through all registered blocs to get accurate counts
      // Note: This accesses internal Blac state, which is acceptable for a system plugin
      const uidRegistry = (blac as any).uidRegistry as Map<string, BlocBase<any>>;

      for (const bloc of uidRegistry.values()) {
        if (bloc.isDisposed) {
          disposedCount++;
        } else {
          activeCount++;
          totalConsumers += bloc.subscriptionCount;
        }
      }

      this.graphManager.updateRootStats({
        totalBlocs: memoryStats.totalBlocs,
        activeBlocs: activeCount,
        disposedBlocs: disposedCount,
        totalConsumers,
        memoryStats: {
          registeredBlocs: memoryStats.registeredBlocs,
          isolatedBlocs: memoryStats.isolatedBlocs,
          keepAliveBlocs: memoryStats.keepAliveBlocs,
        },
      });
    } catch (error) {
      console.error('[GraphPlugin] Error updating root stats:', error);
    }
  }

  /**
   * Notifies all subscribers with throttling
   */
  private notifySubscribers(): void {
    if (this.subscribers.size === 0) return;

    this.updatePending = true;

    // If throttle is active, wait for it to complete
    if (this.updateThrottle) return;

    // Set up throttle
    this.updateThrottle = setTimeout(() => {
      this.updateThrottle = null;

      if (this.updatePending) {
        this.updatePending = false;

        // Update root stats one more time before notifying
        this.updateRootStats();

        const snapshot = this.getGraphSnapshot();

        // Notify all subscribers
        for (const callback of this.subscribers) {
          try {
            callback(snapshot);
          } catch (error) {
            console.error('[GraphPlugin] Error in subscriber callback:', error);
          }
        }
      }
    }, this.config.throttleInterval);
  }

  /**
   * Cleanup when plugin is removed
   */
  beforeShutdown(): void {
    // Clear throttle timer
    if (this.updateThrottle) {
      clearTimeout(this.updateThrottle);
      this.updateThrottle = null;
    }

    // Clear subscribers
    this.subscribers.clear();

    // Clear graph data
    this.graphManager.clear();
  }
}
