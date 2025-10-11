/**
 * React hook for subscribing to Bloc graph updates
 *
 * This hook provides real-time visualization data for all Bloc/Cubit instances
 * in the application, including their state, lifecycle, and relationships.
 *
 * **Requires @blac/plugin-graph to be registered:**
 * ```typescript
 * import { GraphPlugin } from '@blac/plugin-graph';
 * Blac.instance.plugins.add(new GraphPlugin());
 * ```
 *
 * @example
 * ```tsx
 * function GraphVisualizer() {
 *   const graph = useBlocGraph();
 *
 *   return (
 *     <div>
 *       <h2>Bloc Instances ({graph.nodes.length})</h2>
 *       {graph.nodes.map(node => (
 *         <div key={node.id}>
 *           {node.name}: {node.lifecycle}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { Blac } from '@blac/core';

// Import types from plugin-graph (will be available if plugin is installed)
type GraphSnapshot = {
  nodes: any[];
  edges: any[];
  timestamp: number;
};

const EMPTY_SNAPSHOT: GraphSnapshot = {
  nodes: [],
  edges: [],
  timestamp: Date.now(),
};

/**
 * Hook for subscribing to graph visualization data
 *
 * @returns Current graph snapshot with nodes and edges
 */
export function useBlocGraph(): GraphSnapshot {
  // Get the GraphPlugin from Blac instance
  const getPlugin = () => {
    const plugin = Blac.instance.plugins.get('GraphPlugin');
    return plugin as any; // Plugin type is dynamic
  };

  // Initialize with current snapshot
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(() => {
    const plugin = getPlugin();
    if (!plugin) {
      console.warn(
        '[useBlocGraph] GraphPlugin not registered. ' +
        'Install @blac/plugin-graph and register it: ' +
        'Blac.instance.plugins.add(new GraphPlugin())'
      );
      return EMPTY_SNAPSHOT;
    }
    return plugin.getGraphSnapshot?.() || EMPTY_SNAPSHOT;
  });

  useEffect(() => {
    const plugin = getPlugin();

    if (!plugin) {
      console.warn(
        '[useBlocGraph] GraphPlugin not registered. ' +
        'Install @blac/plugin-graph and register it: ' +
        'Blac.instance.plugins.add(new GraphPlugin())'
      );
      return;
    }

    // Subscribe to graph updates via plugin
    const unsubscribe = plugin.subscribeToGraph?.((newSnapshot: GraphSnapshot) => {
      setSnapshot(newSnapshot);
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return snapshot;
}

/**
 * Hook for subscribing to graph visualization data with custom filtering
 *
 * @param filter - Optional filter function to apply to nodes
 * @returns Filtered graph snapshot
 *
 * @example
 * ```tsx
 * // Only show active Bloc instances
 * const activeGraph = useBlocGraphFiltered((node) =>
 *   node.lifecycle === 'active' && node.type === 'bloc'
 * );
 * ```
 */
export function useBlocGraphFiltered(
  filter?: (snapshot: GraphSnapshot) => GraphSnapshot
): GraphSnapshot {
  const fullSnapshot = useBlocGraph();

  if (!filter) {
    return fullSnapshot;
  }

  return filter(fullSnapshot);
}
