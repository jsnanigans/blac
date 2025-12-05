// Unified types (single source of truth)
export * from './types';

// Plugins
export { DevToolsPlugin } from './plugin/DevToolsPlugin';
export {
  DevToolsBrowserPlugin,
  createDevToolsBrowserPlugin,
} from './plugin/DevToolsBrowserPlugin';

// Bridge
export { DevToolsBridge } from './bridge/DevToolsBridge';
export type { DevToolsBridgeConfig } from './bridge/DevToolsBridge';

// Serialization
export {
  serialize,
  safeSerialize,
  SerializationError,
} from './serialization/serialize';

// Integrations
export {
  ReduxDevToolsAdapter,
  type ReduxDevToolsAdapterConfig,
} from './integrations/ReduxDevToolsAdapter';
export {
  EventRegistry,
  DevToolsEvent as RegisteredDevToolsEvent,
  type EventMetadata,
} from './integrations/EventRegistry';

// State management
export { DevToolsStateManager } from './state/DevToolsStateManager';
