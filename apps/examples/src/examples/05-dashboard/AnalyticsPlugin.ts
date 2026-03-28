import type { BlacPlugin, PluginContext, StateContainer } from '@blac/core';

export interface AnalyticsEntry {
  type: 'installed' | 'created' | 'stateChanged' | 'disposed';
  name: string;
  time: string;
}

let _entries: AnalyticsEntry[] = [];
let _onChange: (() => void) | null = null;

function addEntry(type: AnalyticsEntry['type'], name: string) {
  _entries = [
    ..._entries,
    { type, name, time: new Date().toLocaleTimeString() },
  ].slice(-50);
  _onChange?.();
}

export function getAnalyticsEntries(): AnalyticsEntry[] {
  return _entries;
}

export function onAnalyticsChange(cb: () => void): () => void {
  _onChange = cb;
  return () => {
    if (_onChange === cb) _onChange = null;
  };
}

export function clearAnalyticsEntries() {
  _entries = [];
  _onChange?.();
}

export const analyticsPlugin: BlacPlugin = {
  name: 'analytics-example',
  version: '1.0.0',

  onInstall(_context: PluginContext) {
    addEntry('installed', 'AnalyticsPlugin');
  },

  onInstanceCreated(instance: StateContainer<object>) {
    addEntry('created', instance.name);
  },

  onStateChanged(instance) {
    addEntry('stateChanged', instance.name);
  },

  onInstanceDisposed(instance: StateContainer<object>) {
    addEntry('disposed', instance.name);
  },

  onUninstall() {
    // Don't clear entries on uninstall so user can still see them
  },
};
