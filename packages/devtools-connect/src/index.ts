export { DevToolsPlugin } from './plugin/DevToolsPlugin';
export type { DevToolsPluginConfig } from './plugin/types';

// New plugin API (using @blac/core plugin system)
export {
  DevToolsBrowserPlugin,
  createDevToolsBrowserPlugin,
  type DevToolsBrowserPluginConfig,
  type DevToolsEvent as BrowserDevToolsEvent,
  type DevToolsEventType,
  type DevToolsCallback,
} from './plugin/DevToolsBrowserPlugin';
export { DevToolsBridge } from './bridge/DevToolsBridge';
export type { DevToolsBridgeConfig } from './bridge/DevToolsBridge';
export type {
  SerializedEvent,
  DevToolsMessage,
  DevToolsCommand,
  WindowMessage,
} from './bridge/types';
export {
  serialize,
  safeSerialize,
  SerializationError,
} from './serialization/serialize';
export {
  ReduxDevToolsAdapter,
  type ReduxDevToolsAdapterConfig,
} from './integrations/ReduxDevToolsAdapter';
export {
  EventRegistry,
  DevToolsEvent,
  type EventMetadata,
} from './integrations/EventRegistry';

// Protocol types (new atomic message protocol)
export {
  DevToolsMessageType,
  type DevToolsMessage as ProtocolMessage,
  type InstanceCreatedPayload,
  type InstanceDisposedPayload,
  type StateChangedPayload,
  type WindowMessage as ProtocolWindowMessage,
} from './protocol/messages';
