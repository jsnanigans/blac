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
  ExternalDepsManager,
  DependencyManager,
  autoTrackSubscribe,
  manualDepsSubscribe,
  noTrackSubscribe,
  autoTrackSnapshot,
  manualDepsSnapshot,
  noTrackSnapshot,
  autoTrackInit,
  manualDepsInit,
  noTrackInit,
  disableGetterTracking,
} from './framework-adapter';
