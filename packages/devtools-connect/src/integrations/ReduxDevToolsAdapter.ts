import { globalRegistry } from '@blac/core';
import type { StateContainer } from '@blac/core';
import { safeSerialize } from '../serialization/serialize';

interface ReduxDevToolsExtension {
  connect(options?: ReduxDevToolsOptions): ReduxDevToolsInstance;
}

interface ReduxDevToolsOptions {
  name?: string;
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean;
    import?: boolean | string;
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
    test?: boolean;
  };
  maxAge?: number;
  trace?: boolean;
  traceLimit?: number;
}

interface ReduxDevToolsInstance {
  init(state: any): void;
  send(action: { type: string; [key: string]: any }, state: any): void;
  subscribe(
    listener: (message: ReduxDevToolsMessage) => void,
  ): (() => void) | undefined;
  unsubscribe(): void;
  error(message: string): void;
}

interface ReduxDevToolsMessage {
  type: string;
  state?: string;
  payload?: {
    type: string;
    [key: string]: any;
  };
}

// Strict typing for Redux DevTools messages
interface BaseReduxMessage {
  type: string;
}

interface DispatchMessage extends BaseReduxMessage {
  type: 'DISPATCH';
  payload: {
    type:
      | 'JUMP_TO_STATE'
      | 'JUMP_TO_ACTION'
      | 'RESET'
      | 'COMMIT'
      | 'ROLLBACK'
      | 'UPDATE_STATE'
      | 'IMPORT_STATE';
    [key: string]: any;
  };
  state?: string;
}

interface ActionMessage extends BaseReduxMessage {
  type: 'ACTION';
  payload:
    | {
        type: string;
        payload?: any;
        [key: string]: any;
      }
    | string; // Can be string (JSON) or object
}

/**
 * Type guard to check if message is a DISPATCH message
 */
function isDispatchMessage(msg: any): msg is DispatchMessage {
  return msg?.type === 'DISPATCH' && msg?.payload?.type !== undefined;
}

/**
 * Type guard to check if message is an ACTION message
 */
function isActionMessage(msg: any): msg is ActionMessage {
  return msg?.type === 'ACTION' && msg?.payload !== undefined;
}

/**
 * Type guard to check if DISPATCH message is a jump to state/action
 */
function isJumpToState(msg: DispatchMessage): msg is DispatchMessage & {
  payload: { type: 'JUMP_TO_STATE' | 'JUMP_TO_ACTION' };
  state: string;
} {
  return (
    (msg.payload.type === 'JUMP_TO_STATE' ||
      msg.payload.type === 'JUMP_TO_ACTION') &&
    typeof msg.state === 'string'
  );
}

/**
 * Type guard to check if DISPATCH message is an UPDATE_STATE
 */
function isUpdateState(msg: DispatchMessage): msg is DispatchMessage & {
  payload: { type: 'UPDATE_STATE'; path?: string; value?: any };
} {
  return msg.payload.type === 'UPDATE_STATE';
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
  }

  interface WindowEventMap {
    'blac-devtools-error': CustomEvent<{
      type:
        | 'ACTION_DISPATCH_FAILED'
        | 'TIME_TRAVEL_FAILED'
        | 'SERIALIZATION_FAILED'
        | 'STATE_EDIT_FAILED';
      error: string;
      context?: any;
    }>;
    'blac-devtools-time-travel': CustomEvent<{
      targetState: any;
      restoredCount: number;
      failedCount: number;
    }>;
    'blac-devtools-action-dispatched': CustomEvent<{
      blocName: string;
      action?: string;
      eventName?: string;
      payload?: any;
      event?: any;
    }>;
    'blac-devtools-state-edited': CustomEvent<{
      blocType: string;
      displayName: string;
      path: string;
      oldValue: any;
      newValue: any;
    }>;
    'blac-devtools-reset': CustomEvent;
  }
}

export interface ReduxDevToolsAdapterConfig {
  enabled?: boolean;
  name?: string;
  maxAge?: number;
  trace?: boolean;
  features?: ReduxDevToolsOptions['features'];
}

interface InstanceMetadata {
  uid: string;
  blocType: string;
  instanceId: string;
  instanceRef: string | undefined;
  isolated: boolean;
  keepAlive: boolean;
  createdAt: number;
  lifecycleState: string;
  subscriberCount: number;
}

/**
 * Redux DevTools integration adapter for BlaC.
 *
 * This provides instant DevTools support by mapping Bloc actions
 * to Redux DevTools format, enabling time-travel debugging, state
 * inspection, and action logging without custom UI.
 *
 * @example
 * ```typescript
 * import { ReduxDevToolsAdapter } from '@blac/devtools-connect';
 *
 * // Create and start the adapter
 * const devtools = new ReduxDevToolsAdapter({
 *   enabled: import.meta.env.DEV,
 *   name: 'My App State',
 * });
 *
 * // Later, cleanup
 * devtools.disconnect();
 * ```
 */
export class ReduxDevToolsAdapter {
  readonly name = 'ReduxDevToolsAdapter';
  readonly version = '0.3.0';

  private devTools: ReduxDevToolsInstance | null = null;
  private currentState: Map<string, any> = new Map();
  private instanceMetadata: Map<string, InstanceMetadata> = new Map();
  private enabled: boolean;
  private cleanupFunctions: Array<() => void> = [];

  // Time-travel support
  private stateHistory: Array<{
    timestamp: number;
    states: Map<string, any>;
    action: string;
  }> = [];
  private containerRegistry: Map<string, StateContainer<any>> = new Map();
  private maxHistorySize = 50;

  // Flag to prevent recursive updates during time-travel
  private isTimeTraveling = false;

  constructor(config: ReduxDevToolsAdapterConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxHistorySize = config.maxAge || 50;

    if (!this.enabled) {
      return;
    }

    // Warn if DevTools is enabled in production
    if (
      this.enabled &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production'
    ) {
      console.warn(
        '⚠️  [ReduxDevToolsAdapter] DevTools is enabled in production!\n' +
          'This exposes internal application state and should only be used for debugging.\n' +
          'Set enabled: false or enabled: import.meta.env.DEV in production builds.',
      );
    }

    if (typeof window === 'undefined') {
      console.warn(
        '[ReduxDevToolsAdapter] Not in browser environment, skipping initialization',
      );
      return;
    }

    if (!window.__REDUX_DEVTOOLS_EXTENSION__) {
      console.warn(
        '[ReduxDevToolsAdapter] Redux DevTools Extension not found. Install it from: https://github.com/reduxjs/redux-devtools',
      );
      return;
    }

    try {
      this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
        name: config.name || 'BlaC State',
        maxAge: this.maxHistorySize,
        trace: config.trace || false,
        features: config.features || {
          pause: true,
          lock: true,
          persist: true,
          export: true,
          import: 'custom',
          jump: true,
          skip: true,
          reorder: true,
          dispatch: true,
        },
      });

      // Initialize with empty state
      const initialState = this.getGlobalState();
      this.devTools.init(initialState);

      // Record initial state in history
      this.recordStateSnapshot('[INIT]');

      // Subscribe to DevTools commands (time-travel, etc.)
      const devToolsUnsub = this.devTools.subscribe((message) => {
        this.handleDevToolsMessage(message);
      });
      if (devToolsUnsub) {
        this.cleanupFunctions.push(devToolsUnsub);
      }

      // Subscribe to lifecycle events from BlaC core
      this.cleanupFunctions.push(
        globalRegistry.on('created', (container) => {
          this.handleContainerCreated(container);
        }),
      );

      this.cleanupFunctions.push(
        globalRegistry.on('stateChanged', (container, prev, curr) => {
          this.handleStateChanged(container, prev, curr);
        }),
      );

      this.cleanupFunctions.push(
        globalRegistry.on('disposed', (container) => {
          this.handleContainerDisposed(container);
        }),
      );
    } catch (error) {
      console.error('[ReduxDevToolsAdapter] Failed to connect:', error);
      this.devTools = null;
    }
  }

  private handleContainerCreated(container: StateContainer<any>): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(container);
    const displayName = this.getInstanceDisplayName(container);

    // Register container for time-travel
    this.containerRegistry.set(key, container);

    // Store metadata
    const metadata = this.extractMetadata(container);
    this.instanceMetadata.set(key, metadata);

    const stateResult = safeSerialize(container.state);
    const state = stateResult.success
      ? stateResult.data
      : { error: stateResult.error };

    this.currentState.set(key, state);

    // Skip Redux DevTools updates during time-travel
    if (this.isTimeTraveling) return;

    const isolatedIcon = metadata.isolated ? '🔒' : '🔗';
    const keepAliveIcon = metadata.keepAlive ? '📌' : '';
    const action = `${isolatedIcon}${keepAliveIcon} [${displayName}] CREATED`;

    this.devTools.send(
      {
        type: action,
        meta: {
          uid: metadata.uid,
          blocType: metadata.blocType,
          instanceId: metadata.instanceId,
          instanceRef: metadata.instanceRef,
          isolated: metadata.isolated,
          keepAlive: metadata.keepAlive,
          lifecycle: metadata.lifecycleState,
          subscribers: metadata.subscriberCount,
        },
      },
      this.getGlobalState(),
    );

    // Record state snapshot
    this.recordStateSnapshot(action);
  }

  private handleStateChanged(
    container: StateContainer<any>,
    previousState: any,
    currentState: any,
  ): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(container);
    const displayName = this.getInstanceDisplayName(container);

    const currentResult = safeSerialize(currentState);
    const current = currentResult.success
      ? currentResult.data
      : { error: currentResult.error };

    const previousResult = safeSerialize(previousState);
    const previous = previousResult.success
      ? previousResult.data
      : { error: previousResult.error };

    this.currentState.set(key, current);

    // Update metadata (subscriber count may have changed)
    const metadata = this.extractMetadata(container);
    this.instanceMetadata.set(key, metadata);

    // Skip Redux DevTools updates during time-travel to prevent recursive timeline pollution
    if (this.isTimeTraveling) return;

    const action = `⚡ [${displayName}] STATE_CHANGED`;
    this.devTools.send(
      {
        type: action,
        payload: {
          previous,
          current,
        },
        meta: {
          uid: metadata.uid,
          blocType: metadata.blocType,
          instanceId: metadata.instanceId,
          lifecycle: metadata.lifecycleState,
          subscribers: metadata.subscriberCount,
          timestamp: Date.now(),
        },
      },
      this.getGlobalState(),
    );

    // Record state snapshot for time-travel
    this.recordStateSnapshot(action);
  }

  private handleContainerDisposed(container: StateContainer<any>): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(container);
    const displayName = this.getInstanceDisplayName(container);
    const metadata = this.extractMetadata(container);
    const isIsolated = metadata.isolated;

    // Isolated containers should ALWAYS be removed immediately
    // They are tightly coupled to a single component and cannot be keepAlive
    if (isIsolated && metadata.keepAlive) {
      console.warn(
        `[ReduxDevToolsAdapter] Isolated container "${displayName}" has keepAlive=true. This is invalid - isolated containers are always disposed with their component.`,
      );
    }

    // Unregister container - this removes it from the state tree
    this.containerRegistry.delete(key);
    this.currentState.delete(key);
    this.instanceMetadata.delete(key);

    // Skip Redux DevTools updates during time-travel
    if (this.isTimeTraveling) return;

    const isolatedIcon = isIsolated ? '🔒' : '';
    const action = `${isolatedIcon}🗑️ [${displayName}] DISPOSED`;
    this.devTools.send(
      {
        type: action,
        meta: {
          uid: metadata.uid,
          blocType: metadata.blocType,
          instanceId: metadata.instanceId,
          isolated: isIsolated,
          timestamp: Date.now(),
        },
      },
      this.getGlobalState(), // Updated state without the disposed instance
    );

    // Record state snapshot
    this.recordStateSnapshot(action);
  }

  /**
   * Generate unique key for a container instance
   */
  private getInstanceKey(container: StateContainer<any>): string {
    return `${container.name}:${container.instanceId}`;
  }

  /**
   * Get instance display name with ID suffix if different from type name.
   * For isolated instances, always include instanceId to ensure uniqueness in DevTools.
   */
  private getInstanceDisplayName(container: StateContainer<any>): string {
    const metadata = this.extractMetadata(container);

    // Isolated instances MUST have unique display names since there can be many at once
    if (metadata.isolated) {
      // Use instanceId suffix for isolated instances (e.g., "CounterCubit:abc123")
      const shortId = container.instanceId.substring(0, 8);
      return `${container.name}:${shortId}`;
    }

    // For shared/keepAlive instances, use custom ID if provided
    const hasCustomId =
      metadata.instanceId !== undefined &&
      String(metadata.instanceId) !== container.name;
    return hasCustomId
      ? `${container.name}:${metadata.instanceId}`
      : container.name;
  }

  /**
   * Get the state key used in Redux DevTools state tree.
   * This is the key that appears in the DevTools state viewer.
   *
   * - Isolated instances: Use displayName (includes instanceId for uniqueness)
   * - Shared with custom ID: Use "Type#instanceId" pattern
   * - Default shared: Use displayName
   */
  private getStateKey(container: StateContainer<any>): string {
    const displayName = this.getInstanceDisplayName(container);
    const metadata = this.extractMetadata(container);

    if (metadata.isolated) {
      return displayName; // Already includes instanceId for uniqueness
    } else if (
      metadata.instanceId !== undefined &&
      metadata.instanceId !== metadata.blocType
    ) {
      return `${metadata.blocType}#${metadata.instanceId}`;
    } else {
      return displayName;
    }
  }

  /**
   * Extract metadata from a container instance
   */
  private extractMetadata(container: StateContainer<any>): InstanceMetadata {
    const constructor = container.constructor as any;

    return {
      uid: container.instanceId,
      blocType: container.name,
      instanceId: container.instanceId,
      instanceRef: undefined, // Not used in new architecture
      isolated: constructor.isolated === true,
      keepAlive: constructor.keepAlive === true,
      createdAt:
        this.instanceMetadata.get(this.getInstanceKey(container))?.createdAt ||
        Date.now(),
      lifecycleState: container.isDisposed ? 'DISPOSED' : 'ACTIVE',
      subscriberCount: 0, // StateContainer doesn't expose subscription count
    };
  }

  /**
   * Get flat state tree for Redux DevTools with rich instance names
   */
  private getGlobalState(): Record<string, any> {
    const state: Record<string, any> = {};

    for (const [key, stateData] of this.currentState.entries()) {
      const container = this.containerRegistry.get(key);
      if (!container) continue;

      // Skip disposed containers (defensive check - they should already be cleaned up)
      if (container.isDisposed) {
        console.warn(
          `[ReduxDevToolsAdapter] Found disposed container in state tree: ${key}. Cleaning up.`,
        );
        this.currentState.delete(key);
        this.containerRegistry.delete(key);
        this.instanceMetadata.delete(key);
        continue;
      }

      // Get the state key for this container (handles isolated/shared/custom ID logic)
      const stateKey = this.getStateKey(container);

      // Just use the actual state (metadata is available in action payloads)
      state[stateKey] = stateData;
    }

    return state;
  }

  /**
   * Dispatch error event to notify app of DevTools errors.
   *
   * This allows applications to listen for and handle DevTools-related errors.
   *
   * @param type - The error type
   * @param error - The error object or message
   * @param context - Additional context about the error
   *
   * @example
   * ```typescript
   * window.addEventListener('blac-devtools-error', (event) => {
   *   console.error('DevTools error:', event.detail.type, event.detail.error);
   * });
   * ```
   */
  private dispatchError(
    type:
      | 'ACTION_DISPATCH_FAILED'
      | 'TIME_TRAVEL_FAILED'
      | 'SERIALIZATION_FAILED'
      | 'STATE_EDIT_FAILED',
    error: unknown,
    context?: any,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    window.dispatchEvent(
      new CustomEvent('blac-devtools-error', {
        detail: {
          type,
          error: errorMessage,
          context,
        },
      }),
    );
  }

  private handleDevToolsMessage(message: ReduxDevToolsMessage): void {
    // Handle DISPATCH messages with type guards
    if (isDispatchMessage(message)) {
      // Handle time-travel operations
      if (isJumpToState(message)) {
        this.handleTimeTravel(message.state);
        return;
      }

      // Handle state editing
      if (isUpdateState(message)) {
        this.handleStateEdit(message.payload);
        return;
      }

      // Handle other dispatch types
      switch (message.payload.type) {
        case 'RESET':
          // Clear all state and notify app
          this.stateHistory = [];
          this.recordStateSnapshot('[RESET]');
          window.dispatchEvent(new CustomEvent('blac-devtools-reset'));
          break;

        case 'COMMIT':
          // Commit: clear history before current state (makes current state the new base)
          this.stateHistory = this.stateHistory.slice(-1);
          break;

        case 'ROLLBACK':
          // Rollback: restore to last committed state (first item in history)
          if (this.stateHistory.length > 0) {
            const firstSnapshot = this.stateHistory[0];
            this.handleTimeTravel(
              JSON.stringify(Object.fromEntries(firstSnapshot.states)),
            );
          }
          break;

        case 'IMPORT_STATE':
          // Import state is handled by Redux DevTools internally
          // We receive the imported state through JUMP_TO_STATE
          break;
      }
      return;
    }

    // Handle ACTION messages with type guard
    if (isActionMessage(message)) {
      // Redux DevTools sends the action as a JSON string when dispatching from the UI
      let action = message.payload;
      if (typeof action === 'string') {
        try {
          action = JSON.parse(action);
        } catch (error) {
          console.error(
            '[ReduxDevToolsAdapter] Failed to parse action JSON:',
            error,
          );
          if (this.devTools) {
            this.devTools.error('Invalid action JSON format');
          }
          this.dispatchError('ACTION_DISPATCH_FAILED', error, {
            payload: action,
          });
          return;
        }
      }
      this.handleActionDispatch(action);
    }
  }

  private handleTimeTravel(stateString: string): void {
    try {
      const targetState = JSON.parse(stateString);

      // Set flag to prevent recursive Redux DevTools updates
      this.isTimeTraveling = true;

      // Restore each container's state from the flat structure
      let restoredCount = 0;
      let failedCount = 0;

      for (const [stateKey, stateData] of Object.entries(targetState)) {
        // Find the matching container
        let container: StateContainer<any> | undefined;

        for (const [
          _key,
          registeredContainer,
        ] of this.containerRegistry.entries()) {
          // Match using the same state key logic as getGlobalState()
          const matchKey = this.getStateKey(registeredContainer);

          if (matchKey === stateKey) {
            container = registeredContainer;
            break;
          }
        }

        if (container) {
          try {
            // Restore state using emit if available (Cubit) or protected update
            // The isTimeTraveling flag prevents these state changes from
            // being sent back to Redux DevTools (preventing timeline pollution)
            if (
              'emit' in container &&
              typeof (container as any).emit === 'function'
            ) {
              (container as any).emit(stateData);
            } else {
              // Fallback using protected update method
              (container as any).update(() => stateData);
            }
            restoredCount++;
          } catch (error) {
            console.error(
              `[ReduxDevToolsAdapter] Failed to restore state for ${stateKey}:`,
              error,
            );
            failedCount++;
          }
        }
      }

      // Clear flag after restoration complete
      this.isTimeTraveling = false;

      // Dispatch custom event for user notification
      window.dispatchEvent(
        new CustomEvent('blac-devtools-time-travel', {
          detail: {
            targetState,
            restoredCount,
            failedCount,
          },
        }),
      );
    } catch (error) {
      // Always clear flag even on error
      this.isTimeTraveling = false;

      console.error('[ReduxDevToolsAdapter] Failed to parse state:', error);
      if (this.devTools) {
        this.devTools.error('Failed to parse time-travel state');
      }

      // Notify app of error
      this.dispatchError('TIME_TRAVEL_FAILED', error, { stateString });
    }
  }

  private recordStateSnapshot(action: string): void {
    // Create a deep copy of current state for accurate time-travel
    const snapshot = new Map<string, any>();
    for (const [blocName, state] of this.currentState.entries()) {
      try {
        // Deep clone using JSON roundtrip (works for serializable states)
        snapshot.set(blocName, JSON.parse(JSON.stringify(state)));
      } catch (error) {
        // Fallback to shallow copy if state is not serializable
        console.warn(
          `[ReduxDevToolsAdapter] Cannot deep clone state for ${blocName}, using shallow copy. Time-travel may be inaccurate if state is mutated.`,
          error,
        );
        snapshot.set(blocName, state);
      }
    }

    this.stateHistory.push({
      timestamp: Date.now(),
      states: snapshot,
      action,
    });

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Handle action dispatch from Redux DevTools UI.
   *
   * Supports three types of actions:
   * 1. Built-in state actions: emit, patch (works for both Blocs and Cubits)
   * 2. Custom events: registered events (Blocs only)
   *
   * @example
   * // Direct state update (works for both Blocs and Cubits):
   * // { type: "[CounterCubit] emit", payload: { state: 42 } }
   * // { type: "[CounterCubit:user-123] patch", payload: { state: { count: 5 } } }
   *
   * // Custom event (Blocs only):
   * // { type: "[CounterBloc] IncrementEvent", payload: { amount: 5 } }
   * // { type: "[CounterBloc:instance-1] IncrementEvent", payload: { amount: 5 } }
   */
  private handleActionDispatch(action: any): void {
    try {
      if (!action.type || typeof action.type !== 'string') {
        console.error(
          '[ReduxDevToolsAdapter] Invalid action format. Expected { type: string }',
        );
        return;
      }

      // Remove emoji prefix if present (🔒, 🔗, 📌, ⚡, 📨, 🗑️)
      // Match any emoji characters at the start followed by optional whitespace
      const cleanedType = action.type.replace(
        /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}]+\s*/gu,
        '',
      );

      // Parse action type: "[BlocName] ActionName" or "[BlocName:instanceId] ActionName"
      const match = cleanedType.match(/^\[(.*?)\]\s+(.+)$/);

      if (!match) {
        console.error(
          `[ReduxDevToolsAdapter] Invalid action type format: "${action.type}". Expected format: "[BlocName] ActionName" or "[BlocName:instanceId] ActionName"`,
        );
        return;
      }

      const [, displayName, actionName] = match;

      // Find the container by display name
      let container: StateContainer<any> | undefined;
      let containerKey: string | undefined;

      // Try to find by exact display name match
      for (const [
        key,
        registeredContainer,
      ] of this.containerRegistry.entries()) {
        const registeredDisplayName =
          this.getInstanceDisplayName(registeredContainer);
        if (registeredDisplayName === displayName) {
          container = registeredContainer;
          containerKey = key;
          break;
        }
      }

      // If not found, try to find by container type name (for shared instances)
      if (!container) {
        for (const [
          key,
          registeredContainer,
        ] of this.containerRegistry.entries()) {
          if (registeredContainer.name === displayName) {
            container = registeredContainer;
            containerKey = key;
            break;
          }
        }
      }

      if (!container || !containerKey) {
        const availableContainers = Array.from(
          this.containerRegistry.values(),
        ).map((c) => this.getInstanceDisplayName(c));
        console.error(
          `[ReduxDevToolsAdapter] Container "${displayName}" not found. Available: ${availableContainers.join(', ')}`,
        );
        return;
      }

      // Handle built-in state actions
      if (actionName === 'emit') {
        this.handleEmitAction(container, displayName, action);
        return;
      }

      if (actionName === 'patch') {
        this.handlePatchAction(container, displayName, action);
        return;
      }

      // Unknown action type
      console.error(
        `[ReduxDevToolsAdapter] Unknown action "${actionName}" for "${displayName}".`,
        '\n\nSupported actions:',
        `\n  - { type: "[${displayName}] emit", payload: { state: newState } }`,
        `\n  - { type: "[${displayName}] patch", payload: { state: partialState } }`,
      );
    } catch (error) {
      console.error('[ReduxDevToolsAdapter] Failed to dispatch action:', error);

      if (this.devTools) {
        this.devTools.error(
          `Failed to dispatch action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Notify app of error
      this.dispatchError('ACTION_DISPATCH_FAILED', error, { action });
    }
  }

  /**
   * Handle emit action - replaces entire state
   */
  private handleEmitAction(
    container: StateContainer<any>,
    containerName: string,
    action: any,
  ): void {
    if (!action.payload || !('state' in action.payload)) {
      console.error(
        `[ReduxDevToolsAdapter] emit action requires payload.state. Example: { type: "[${containerName}] emit", payload: { state: newState } }`,
      );
      return;
    }

    const newState = action.payload.state;

    // Use emit to update state (available on Cubit)
    if ('emit' in container && typeof (container as any).emit === 'function') {
      (container as any).emit(newState);
    } else {
      // Fallback using protected update method
      (container as any).update(() => newState);
    }

    // Dispatch custom event for user notification
    window.dispatchEvent(
      new CustomEvent('blac-devtools-action-dispatched', {
        detail: {
          blocName: containerName,
          action: 'emit',
          payload: action.payload,
        },
      }),
    );
  }

  /**
   * Handle patch action - merges with existing state
   */
  private handlePatchAction(
    container: StateContainer<any>,
    containerName: string,
    action: any,
  ): void {
    if (!action.payload || !('state' in action.payload)) {
      console.error(
        `[ReduxDevToolsAdapter] patch action requires payload.state. Example: { type: "[${containerName}] patch", payload: { state: { count: 5 } } }`,
      );
      return;
    }

    const partialState = action.payload.state;

    // Check if container has patch method (Cubit only)
    if ('patch' in container && typeof container.patch === 'function') {
      container.patch(partialState);

      // Dispatch custom event for user notification
      window.dispatchEvent(
        new CustomEvent('blac-devtools-action-dispatched', {
          detail: {
            blocName: containerName,
            action: 'patch',
            payload: action.payload,
          },
        }),
      );
    } else {
      console.error(
        `[ReduxDevToolsAdapter] Container "${containerName}" does not have a patch method. Use emit instead.`,
      );
    }
  }

  /**
   * Handle inline state editing from Redux DevTools UI.
   *
   * Allows editing specific state properties by path, or replacing entire state.
   *
   * @example
   * // Replace entire state:
   * // { path: "CounterCubit", value: 42 }
   *
   * // Edit a property:
   * // { path: "CounterBloc.count", value: 42 }
   * // { path: "CounterBloc#user-1.count", value: 42 }
   *
   * // Edit a nested property:
   * // { path: "UserBloc.profile.name", value: "Alice" }
   */
  private handleStateEdit(payload: any): void {
    try {
      if (!payload || !payload.path) {
        console.error(
          '[ReduxDevToolsAdapter] State edit requires a path. Example: { path: "BlocType.property", value: newValue }',
        );
        return;
      }

      const { path, value } = payload;

      // Parse path: "BlocType.property.nested" or "BlocType#instanceId.property"
      const pathParts = path.split('.');
      const stateKey = pathParts[0]; // e.g., "CounterCubit" or "CounterBloc#user-1"
      const statePath = pathParts.slice(1); // Path within the state

      // Find the container by state key
      let container: StateContainer<any> | undefined;
      let containerKey: string | undefined;

      for (const [
        key,
        registeredContainer,
      ] of this.containerRegistry.entries()) {
        // Match using the same state key logic as getGlobalState()
        const matchKey = this.getStateKey(registeredContainer);

        if (matchKey === stateKey) {
          container = registeredContainer;
          containerKey = key;
          break;
        }
      }

      if (!container || !containerKey) {
        const availableKeys = Array.from(this.containerRegistry.values()).map(
          (c) => this.getStateKey(c),
        );
        console.error(
          `[ReduxDevToolsAdapter] Container "${stateKey}" not found. Available: ${availableKeys.join(', ') || 'none'}`,
        );
        return;
      }

      const currentState = container.state;
      const displayName = this.getInstanceDisplayName(container);
      const metadata = this.extractMetadata(container);

      // If path is just the state key (no property path), update entire state
      if (statePath.length === 0) {
        // Use emit to update state
        if (
          'emit' in container &&
          typeof (container as any).emit === 'function'
        ) {
          (container as any).emit(value);
        } else {
          // Fallback using protected update method
          (container as any).update(() => value);
        }

        window.dispatchEvent(
          new CustomEvent('blac-devtools-state-edited', {
            detail: {
              blocType: metadata.blocType,
              displayName,
              path: '',
              oldValue: currentState,
              newValue: value,
            },
          }),
        );
        return;
      }

      // Deep clone current state for nested updates
      const newState = JSON.parse(JSON.stringify(currentState));

      // Navigate to the target property and update it
      let target = newState;
      for (let i = 0; i < statePath.length - 1; i++) {
        const key = statePath[i];
        if (target[key] === undefined) {
          console.error(
            `[ReduxDevToolsAdapter] Property "${key}" not found in path "${path}"`,
          );
          return;
        }
        target = target[key];
      }

      // Update the final property
      const finalKey = statePath[statePath.length - 1];
      if (!(finalKey in target)) {
        console.warn(
          `[ReduxDevToolsAdapter] Property "${finalKey}" does not exist in state. Creating new property.`,
        );
      }

      target[finalKey] = value;

      // Emit updated state
      if (
        'emit' in container &&
        typeof (container as any).emit === 'function'
      ) {
        (container as any).emit(newState);
      } else {
        // Fallback using protected update method
        (container as any).update(() => newState);
      }

      // Dispatch custom event for user notification
      window.dispatchEvent(
        new CustomEvent('blac-devtools-state-edited', {
          detail: {
            blocType: metadata.blocType,
            displayName,
            path: statePath.join('.'),
            oldValue: this.getValueAtPath(currentState, statePath),
            newValue: value,
          },
        }),
      );
    } catch (error) {
      console.error('[ReduxDevToolsAdapter] Failed to edit state:', error);

      if (this.devTools) {
        this.devTools.error(
          `Failed to edit state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Notify app of error
      this.dispatchError('STATE_EDIT_FAILED', error, { payload });
    }
  }

  /**
   * Helper method to get value at a nested path
   */
  private getValueAtPath(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Disconnect from Redux DevTools and clean up resources
   */
  disconnect(): void {
    // Run all cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    if (this.devTools) {
      this.devTools.unsubscribe();
      this.devTools = null;
    }

    this.currentState.clear();
    this.instanceMetadata.clear();
    this.containerRegistry.clear();
    this.enabled = false;
  }

  /**
   * Check if Redux DevTools is available and connected
   */
  isConnected(): boolean {
    return this.devTools !== null;
  }
}
