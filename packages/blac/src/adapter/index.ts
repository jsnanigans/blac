/**
 * Framework Adapter
 *
 * Reusable utilities for integrating BlaC with any reactive framework.
 * Use these to build integrations for React, Vue, Solid, Svelte, Angular, etc.
 */

export {
  type AdapterState,
  type ManualDepsConfig,
  type SubscriptionCallback,
  type SubscribeFunction,
  type SnapshotFunction,
  ExternalDependencyManager,
  createAutoTrackSubscribe,
  createManualDepsSubscribe,
  createNoTrackSubscribe,
  createAutoTrackSnapshot,
  createManualDepsSnapshot,
  createNoTrackSnapshot,
  initAutoTrackState,
  initManualDepsState,
  initNoTrackState,
  disableGetterTracking,
} from './framework-adapter';
