import {
  globalRegistry,
  StateContainerRegistry,
} from '../core/StateContainerRegistry';

let _registry = globalRegistry;

export function getRegistry(): StateContainerRegistry {
  return _registry;
}

export function setRegistry(registry: StateContainerRegistry): void {
  _registry.clearAll();
  _registry = registry;
}

export function getStats(): {
  registeredTypes: number;
  totalInstances: number;
  typeBreakdown: Record<string, number>;
} {
  return _registry.getStats();
}
