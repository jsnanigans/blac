import { Cubit, blac, borrow } from '@blac/core';
import type { InstanceData } from '../types';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';

type SearchState = {
  query: string;
};

export interface InstanceGroup {
  className: string;
  instances: InstanceData[];
  firstCreatedAt: number;
  color: string; // HSL color for visual grouping
}

/**
 * Manages search query and provides filtered instance results
 * Uses fuzzy matching algorithm for flexible search
 */
@blac({ excludeFromDevTools: true })
export class DevToolsSearchBloc extends Cubit<SearchState> {
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
    const instancesBloc = borrow(DevToolsInstancesBloc);
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

  /**
   * Get instances grouped by className with consistent color coding
   * Groups sorted by first created-at date, instances within groups sorted by created-at
   */
  getGroupedInstances = (): InstanceGroup[] => {
    const filteredInstances = this.getFilteredInstances();

    // Group instances by className
    const groupMap = new Map<string, InstanceData[]>();

    for (const instance of filteredInstances) {
      const existing = groupMap.get(instance.className);
      if (existing) {
        existing.push(instance);
      } else {
        groupMap.set(instance.className, [instance]);
      }
    }

    // Convert to array of groups with metadata
    const groups: InstanceGroup[] = Array.from(groupMap.entries()).map(
      ([className, instances]) => {
        // Sort instances within group by creation time (earliest first)
        const sortedInstances = [...instances].sort(
          (a, b) => a.createdAt - b.createdAt,
        );

        return {
          className,
          instances: sortedInstances,
          firstCreatedAt: sortedInstances[0].createdAt,
          color: this.generateColorForClassName(className),
        };
      },
    );

    // Sort groups by first created-at date (earliest first)
    groups.sort((a, b) => a.firstCreatedAt - b.firstCreatedAt);

    return groups;
  };

  /**
   * Generate consistent HSL color from className using hash function
   * Same className = same color across all instances
   */
  private generateColorForClassName = (className: string): string => {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use hash to generate hue (0-360)
    const hue = Math.abs(hash % 360);

    // 70% saturation, 60% lightness for good visibility on dark theme
    return `hsl(${hue}, 70%, 60%)`;
  };
}
