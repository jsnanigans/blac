/**
 * DevTools Communication Protocol
 *
 * Re-exports from the unified types module for backward compatibility.
 * New code should import directly from '../types'.
 */

export {
  // Enums
  DevToolsMessageType,

  // Modern payloads
  type InstanceCreatedPayload,
  type InstanceDisposedPayload,
  type StateChangedPayload,
  type PanelConnectPayload,
  type FullStateDumpPayload,
  type HeartbeatPayload,
  type ReconnectedPayload,

  // State types
  type StateSnapshot,
  type InstanceState,

  // Legacy payloads (deprecated)
  type LegacyBlocCreatedPayload as BlocCreatedPayload,
  type LegacyStateChangedPayload,
  type LegacyBlocDisposedPayload as BlocDisposedPayload,
  type SerializedEvent as EventDispatchedPayload,

  // Message unions
  type DevToolsMessage,
  type WindowMessage,
} from '../types';
