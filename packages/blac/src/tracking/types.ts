/**
 * Unified Dependency Tracking Types
 *
 * This module defines the core types for the Hybrid Unified System.
 * All dependency tracking (state, computed, custom) uses these unified types.
 *
 * @module tracking/types
 */

import type { BlocBase } from '../BlocBase';

/**
 * State dependency - tracks access to state properties
 *
 * Example: `state.count` creates { type: 'state', path: 'count' }
 * Example: `state.user.profile.email` creates { type: 'state', path: 'user.profile.email' }
 */
export interface StateDependency {
  type: 'state';
  path: string; // Dot-notation path to state property
}

/**
 * Computed dependency - tracks access to Bloc/Cubit getters
 *
 * Example: `bloc.doubled` creates { type: 'computed', key: 'doubled', compute: () => bloc.doubled }
 *
 * The compute function captures the getter execution, allowing re-evaluation
 * when state changes without needing to track what state the getter accesses.
 */
export interface ComputedDependency {
  type: 'computed';
  key: string; // Name of the getter
  compute: () => any; // Function to execute the getter
}

/**
 * Custom dependency - user-provided selector function
 *
 * Example: From `useBloc(MyBloc, { dependencies: (bloc) => [bloc.state.count] })`
 * Creates: { type: 'custom', key: 'manual-deps', selector: (bloc) => [bloc.state.count] }
 *
 * Custom dependencies allow users to manually specify what they depend on,
 * overriding automatic proxy tracking.
 */
export interface CustomDependency {
  type: 'custom';
  key: string; // Unique identifier for this selector
  selector: (bloc: BlocBase<any>) => any; // Selector function
}

/**
 * Union of all dependency types
 *
 * This is the core abstraction - everything is a "dependency with a value that can change"
 */
export type Dependency = StateDependency | ComputedDependency | CustomDependency;

/**
 * State of a single subscription
 *
 * Represents one React component's subscription to a Bloc's changes.
 * Contains all dependencies tracked during render and cached values for comparison.
 */
export interface SubscriptionState {
  /** Unique subscription identifier */
  id: string;

  /** ID of the Bloc this subscription watches */
  blocId: string;

  /** All dependencies tracked by this subscription */
  dependencies: Dependency[];

  /**
   * Cached values for each dependency
   *
   * Key: dependency key (from getDependencyKey)
   * Value: last known value of the dependency
   *
   * Used for value comparison during change notification.
   */
  valueCache: Map<string, any>;

  /** Callback to trigger React re-render */
  notify: () => void;

  /** Metadata for debugging and plugins */
  metadata: {
    /** Name of the component (for debugging) */
    componentName?: string;

    /** When this subscription was created */
    mountTime: number;

    /** How many times this component has re-rendered */
    renderCount: number;

    /** When this subscription last caused a re-render */
    lastNotified?: number;
  };
}

/**
 * Represents a state change event
 *
 * Passed to notifyChanges() to determine which subscriptions need updating
 */
export interface StateChange {
  /** Previous state value */
  oldState: any;

  /** New state value */
  newState: any;

  /** Optional action that triggered the change (for debugging) */
  action?: unknown;
}

/**
 * Type guard: Check if dependency is a StateDependency
 */
export function isStateDependency(dep: Dependency): dep is StateDependency {
  return dep.type === 'state';
}

/**
 * Type guard: Check if dependency is a ComputedDependency
 */
export function isComputedDependency(dep: Dependency): dep is ComputedDependency {
  return dep.type === 'computed';
}

/**
 * Type guard: Check if dependency is a CustomDependency
 */
export function isCustomDependency(dep: Dependency): dep is CustomDependency {
  return dep.type === 'custom';
}

/**
 * Configuration options for the unified tracking system
 */
export interface UnifiedTrackingConfig {
  /**
   * Enable/disable unified tracking
   * When false, falls back to legacy system
   */
  enabled: boolean;

  /**
   * Maximum depth for nested state proxy creation
   * Prevents infinite recursion and excessive proxy overhead
   */
  maxProxyDepth: number;

  /**
   * Whether to log tracking activity for debugging
   */
  debugLogging: boolean;
}
