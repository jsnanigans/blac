import {
  StateContainerRegistry,
  getRegistry,
  setRegistry,
} from '@blac/core';

export function createTestRegistry(): StateContainerRegistry {
  return new StateContainerRegistry();
}

export function withTestRegistry<T>(
  fn: (registry: StateContainerRegistry) => T,
): T {
  const previous = getRegistry();
  const testRegistry = createTestRegistry();
  setRegistry(testRegistry);
  try {
    const result = fn(testRegistry);
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          setRegistry(previous);
          return value;
        },
        (error) => {
          setRegistry(previous);
          throw error;
        },
      ) as T;
    }
    setRegistry(previous);
    return result;
  } catch (error) {
    setRegistry(previous);
    throw error;
  }
}
