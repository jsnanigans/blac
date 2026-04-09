import { Cubit, blac } from '@blac/core';
import type { InstanceData } from '../types';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { stringToColor } from '../utils/stringToColor';
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
  private instancesBloc = this.depend(DevToolsInstancesBloc);

  constructor() {
    super({ query: '' });
  }

  setQuery = (query: string) => {
    this.patch({ query });
  };

  /**
   * Get filtered instances based on current search query
   * Borrows instances from DevToolsInstancesBloc
   */
  getFilteredInstances = (): InstanceData[] => {
    const { query } = this.state;
    const instances = this.instancesBloc().sortedInstances;

    if (!query.trim()) {
      return instances;
    }

    const normalizedQuery = query.toLowerCase();
    const filtered = instances
      .map((instance) => {
        const classNameScore = fuzzyMatch(
          normalizedQuery,
          instance.className.toLowerCase(),
        );
        const idScore = fuzzyMatch(normalizedQuery, instance.id.toLowerCase());
        const nameScore = instance.name
          ? fuzzyMatch(normalizedQuery, instance.name.toLowerCase())
          : 0;
        const score = Math.max(classNameScore, idScore, nameScore);

        return { instance, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
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
          color: stringToColor(className),
        };
      },
    );

    // Sort groups by first created-at date (earliest first)
    groups.sort((a, b) => a.firstCreatedAt - b.firstCreatedAt);

    return groups;
  };
}
