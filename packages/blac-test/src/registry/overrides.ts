import {
  type StateContainerConstructor,
  type InstanceEntry,
  getRegistry,
} from '@blac/core';
import { withTestRegistry } from './test-registry';

const DEFAULT_KEY = 'default';

export function registerOverride<T extends StateContainerConstructor>(
  BlocClass: T,
  instance: InstanceType<T>,
  instanceKey: string = DEFAULT_KEY,
): void {
  const registry = getRegistry();

  // Prime the internal WeakMap by acquiring (and immediately replacing).
  // acquire() calls ensureInstancesMap() internally, which creates the
  // real Map in the WeakMap. Without this, getInstancesMap() returns a
  // detached empty Map for unseen types.
  const existing = registry.acquire(BlocClass, instanceKey, {
    canCreate: true,
    countRef: false,
  });

  if (existing !== instance && !existing.isDisposed) {
    existing.dispose();
  }

  // Now getInstancesMap returns the live Map (not a detached copy)
  const instancesMap = registry.getInstancesMap(BlocClass);
  const entry: InstanceEntry<InstanceType<T>> = { instance, refCount: 1 };
  instancesMap.set(instanceKey, entry);
}

export function overrideEnsure<T extends StateContainerConstructor, R>(
  BlocClass: T,
  instance: InstanceType<T>,
  fn: () => R,
  instanceKey: string = DEFAULT_KEY,
): R {
  return withTestRegistry(() => {
    registerOverride(BlocClass, instance, instanceKey);
    return fn();
  });
}
