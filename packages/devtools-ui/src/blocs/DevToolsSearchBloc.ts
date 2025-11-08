import { Cubit } from '@blac/core';
import type { InstanceData } from '../types';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';

type SearchState = {
  query: string;
};

/**
 * Manages search query and provides filtered instance results
 * Uses fuzzy matching algorithm for flexible search
 */
export class DevToolsSearchBloc extends Cubit<SearchState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   */
  static __excludeFromDevTools = true;

  constructor() {
    super({ query: '' });
  }

  /**
   * Update search query
   */
  setQuery = (query: string) => {
    console.log(`[SearchBloc] Search query changed to: "${query}"`);
    this.patch({ query });
  };

  /**
   * Get filtered instances based on current search query
   * Borrows instances from DevToolsInstancesBloc
   */
  getFilteredInstances = (): InstanceData[] => {
    const { query } = this.state;

    // Borrow instances without ownership (no memory leak)
    const instancesBloc = DevToolsInstancesBloc.get('default');
    const instances = instancesBloc.sortedInstances;

    if (!query.trim()) {
      return instances;
    }

    // Fuzzy search
    const normalizedQuery = query.toLowerCase();
    const filtered = instances
      .map((instance) => {
        const classNameScore = fuzzyMatch(
          normalizedQuery,
          instance.className.toLowerCase(),
        );
        const idScore = fuzzyMatch(normalizedQuery, instance.id.toLowerCase());
        const score = Math.max(classNameScore, idScore);

        return { instance, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        // Sort by score first (higher is better)
        if (b.score !== a.score) return b.score - a.score;
        // Then by creation time (newest first)
        return b.instance.createdAt - a.instance.createdAt;
      })
      .map(({ instance }) => instance);

    return filtered;
  };
}
