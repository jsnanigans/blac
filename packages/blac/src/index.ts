/**
 * Architecture Exports
 *
 * Clean, type-safe implementation with clear responsibility boundaries.
 */

// Core
export * from './core/StateStream';
export type { EventHandler as EventStreamHandler } from './core/EventStream';
export { EventStream } from './core/EventStream';
export type { LifecycleEvent } from './core/LifecycleManager';
export { LifecycleManager, LifecycleState } from './core/LifecycleManager';
export * from './core/StateContainer';
export * from './core/Cubit';
export * from './core/Vertex';

// Proxy Tracking
export * from './proxy/ProxyTracker';

// Subscription System - selective exports to avoid conflicts
export { SubscriptionSystem } from './subscription/SubscriptionSystem';
export { SubscriptionBuilder } from './subscription/SubscriptionBuilder';
export type { Subscription } from './subscription/SubscriptionSystem';

// Registry - selective exports to avoid conflicts
export { BlocRegistry } from './registry/BlocRegistry';

// Types - use branded types as canonical
export type {
  InstanceId,
  SubscriptionId,
  BrandedId,
  Version,
  Generation,
} from './types/branded';
export {
  instanceId,
  subscriptionId,
  version,
  generation,
  incrementVersion,
  incrementGeneration,
} from './types/branded';
export * from './types/events';
export * from './types/internal';

// Logging
export { BlacLogger, LogLevel } from './logging/Logger';
