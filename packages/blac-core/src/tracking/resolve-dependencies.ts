import { getRegistry } from '../registry/config';
import type { StateContainerInstance } from '../types/utilities';

/**
 * Resolve all transitive dependencies of a bloc via BFS over `dependencies` maps.
 * Uses cycle detection to avoid infinite loops.
 * @internal
 */
export function resolveDependencies(
  bloc: StateContainerInstance,
): Set<StateContainerInstance> {
  const result = new Set<StateContainerInstance>();
  const visited = new Set<string>();
  const queue: StateContainerInstance[] = [bloc];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    for (const [Type, key] of current.dependencies) {
      const visitKey = `${Type.name}::${key}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      const dep = getRegistry().ensure(Type, key);
      result.add(dep);
      if (dep.dependencies.size > 0) {
        queue.push(dep);
      }
    }
  }

  result.delete(bloc);
  return result;
}
