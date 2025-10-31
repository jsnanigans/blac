/**
 * BlocRegistry module
 *
 * Constructor-based instance management.
 * Clean, type-safe, no string names or factories.
 */

export { BlocRegistry, type BlocTypeConfig } from './BlocRegistry';

// Re-export BlocConstructor from utilities (single source of truth)
export { type BlocConstructor } from '../types/utilities';

// Re-export branded types from centralized location
export {
  type InstanceId,
  instanceId as createInstanceId,
} from '../types/branded';
