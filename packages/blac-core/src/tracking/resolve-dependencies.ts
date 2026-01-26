import { globalRegistry } from '../core/StateContainerRegistry';
import type {
  StateContainerConstructor,
  StateContainerInstance,
} from '../types/utilities';

/**
 * Resolve all transitive dependencies of a bloc via BFS over `dependencies` maps.
 * Uses cycle detection to avoid infinite loops.
 * @internal
 */
export function resolveDependencies(
  bloc: StateContainerInstance,
): Set<StateContainerInstance> {
  const result = new Set<StateContainerInstance>();
  const visited = new Set<StateContainerConstructor>();
  const queue: StateContainerInstance[] = [bloc];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [Type, key] of current.dependencies) {
      if (visited.has(Type)) continue;
      visited.add(Type);
      const dep = globalRegistry.ensure(Type, key);
      result.add(dep);
      if (dep.dependencies.size > 0) {
        queue.push(dep);
      }
    }
  }

  result.delete(bloc);
  return result;
}
