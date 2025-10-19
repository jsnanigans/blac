/**
 * Unified Dependency Tracking System
 *
 * Entry point for the new tracking architecture.
 * This module replaces the split BlacAdapter + SubscriptionManager system
 * with a unified, synchronous tracking mechanism.
 *
 * @module tracking
 */

// Core tracker
export { UnifiedDependencyTracker } from './UnifiedDependencyTracker';

// Types
export type {
  Dependency,
  StateDependency,
  ComputedDependency,
  CustomDependency,
  SubscriptionState,
  StateChange,
  UnifiedTrackingConfig,
} from './types';

export {
  isStateDependency,
  isComputedDependency,
  isCustomDependency,
} from './types';

// Proxy helpers
export {
  createStateTrackingProxy,
  createComputedTrackingProxy,
  createUnifiedTrackingProxy,
} from './createTrackingProxy';
