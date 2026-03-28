import type { BlacPlugin } from '@blac/core';

export interface RegistryEvent {
  type: 'created' | 'disposed';
  name: string;
  time: string;
}

let _events: RegistryEvent[] = [];
const _listeners = new Set<() => void>();

function push(event: RegistryEvent) {
  _events = [..._events, event].slice(-50);
  _listeners.forEach((fn) => fn());
}

export function getRegistryEvents(): RegistryEvent[] {
  return _events;
}

export function onRegistryChange(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function clearRegistryEvents(): void {
  _events = [];
  _listeners.forEach((fn) => fn());
}

export const registryPlugin: BlacPlugin = {
  name: 'registry-example',
  version: '1.0.0',

  onInstanceCreated(instance) {
    push({
      type: 'created',
      name: instance.name,
      time: new Date().toLocaleTimeString(),
    });
  },

  onInstanceDisposed(instance) {
    push({
      type: 'disposed',
      name: instance.name,
      time: new Date().toLocaleTimeString(),
    });
  },
};
