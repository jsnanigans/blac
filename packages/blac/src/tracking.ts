/**
 * Tracking Subpath Export
 *
 * Advanced dependency tracking utilities for framework integrations.
 * Import from '@blac/core/tracking'
 */
export {
  tracked,
  createTrackedContext,
  TrackedContext,
  type TrackedResult,
  type TrackedOptions,
} from './tracking/tracked';

// Re-export all tracking internals for framework adapters
export * from './tracking/index';
