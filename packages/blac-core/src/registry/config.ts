import {
  globalRegistry,
  StateContainerRegistry,
} from '../core/StateContainerRegistry';

let _registry = globalRegistry;

/**
 * @public
 */
export function getRegistry(): StateContainerRegistry {
  return _registry;
}

/**
 * @public
 */
export function setRegistry(registry: StateContainerRegistry): void {
  _registry = registry;
}

/**
 * @public
 */
export function getStats(): {
  registeredTypes: number;
  totalInstances: number;
  typeBreakdown: Record<string, number>;
} {
  return _registry.getStats();
}
