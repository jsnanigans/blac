/**
 * Legacy Bridge Types
 *
 * Re-exports from the unified types module for backward compatibility.
 * New code should import directly from '../types'.
 *
 * @deprecated Import from '../types' instead
 */

export {
  type SerializedEvent,
  type LegacyBlocCreatedPayload as BlocCreatedPayload,
  type LegacyStateChangedPayload as StateChangedPayload,
  type LegacyBlocDisposedPayload as BlocDisposedPayload,
  type HeartbeatPayload,
  type ReconnectedPayload,
  type DevToolsMessage,
  type DevToolsCommand,
  type WindowMessage,
} from '../types';
