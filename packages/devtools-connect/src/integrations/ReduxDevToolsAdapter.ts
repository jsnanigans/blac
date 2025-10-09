import type { BlacPlugin, BlocBase, Bloc } from '@blac/core';
import { safeSerialize } from '../serialization/serialize';
import { EventRegistry } from './EventRegistry';

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

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
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
  instanceId: string | number | undefined;
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
 * import { Blac } from '@blac/core';
 * import { ReduxDevToolsAdapter } from '@blac/devtools-connect';
 *
 * Blac.instance.plugins.add(
 *   new ReduxDevToolsAdapter({
 *     enabled: import.meta.env.DEV,
 *     name: 'My App State',
 *   })
 * );
 * ```
 */
export class ReduxDevToolsAdapter implements BlacPlugin {
  readonly name = 'ReduxDevToolsAdapter';
  readonly version = '0.2.0';

  private devTools: ReduxDevToolsInstance | null = null;
  private currentState: Map<string, any> = new Map();
  private instanceMetadata: Map<string, InstanceMetadata> = new Map();
  private enabled: boolean;
  private unsubscribe?: () => void;

  // Time-travel support
  private stateHistory: Array<{
    timestamp: number;
    states: Map<string, any>;
    action: string;
  }> = [];
  private blocRegistry: Map<string, BlocBase<any>> = new Map();
  private maxHistorySize = 50;

  // Flag to prevent recursive updates during time-travel
  private isTimeTraveling = false;

  constructor(config: ReduxDevToolsAdapterConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxHistorySize = config.maxAge || 50;

    if (!this.enabled) {
      return;
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
      this.unsubscribe = this.devTools.subscribe((message) => {
        this.handleDevToolsMessage(message);
      });

      console.log(
        '[ReduxDevToolsAdapter] Connected to Redux DevTools - Time-travel debugging enabled!',
      );
    } catch (error) {
      console.error('[ReduxDevToolsAdapter] Failed to connect:', error);
      this.devTools = null;
    }
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(bloc);
    const displayName = this.getInstanceDisplayName(bloc);

    // Register bloc for time-travel
    this.blocRegistry.set(key, bloc);

    // Store metadata
    const metadata = this.extractMetadata(bloc);
    this.instanceMetadata.set(key, metadata);

    const stateResult = safeSerialize(bloc.state);
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
          uid: bloc.uid,
          blocType: bloc._name,
          instanceId: bloc._id,
          instanceRef: bloc._instanceRef,
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

  onEventAdded(bloc: Bloc<any, any>, event: any): void {
    if (!this.devTools) return;

    // Skip Redux DevTools updates during time-travel
    if (this.isTimeTraveling) return;

    const displayName = this.getInstanceDisplayName(bloc);
    const eventName = event.constructor?.name || 'UnknownEvent';
    const eventResult = safeSerialize(event);

    const action = `📨 [${displayName}] ${eventName}`;
    this.devTools.send(
      {
        type: action,
        payload: eventResult.success ? eventResult.data : eventResult.error,
        meta: {
          uid: bloc.uid,
          blocType: bloc._name,
          instanceId: bloc._id,
          timestamp: Date.now(),
        },
      },
      this.getGlobalState(),
    );

    // Note: Don't record snapshot here - wait for STATE_CHANGED
    // This prevents duplicate snapshots for event → state change flow
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(bloc);
    const displayName = this.getInstanceDisplayName(bloc);

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
    const metadata = this.extractMetadata(bloc);
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
          uid: bloc.uid,
          blocType: bloc._name,
          instanceId: bloc._id,
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

  onBlocDisposed(bloc: BlocBase<any>): void {
    if (!this.devTools) return;

    const key = this.getInstanceKey(bloc);
    const displayName = this.getInstanceDisplayName(bloc);
    const isIsolated = bloc._isolated;

    // Isolated blocs should ALWAYS be removed immediately
    // They are tightly coupled to a single component and cannot be keepAlive
    if (isIsolated && bloc._keepAlive) {
      console.warn(
        `[ReduxDevToolsAdapter] Isolated bloc "${displayName}" has keepAlive=true. This is invalid - isolated blocs are always disposed with their component.`,
      );
    }

    // Unregister bloc - this removes it from the state tree
    this.blocRegistry.delete(key);
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
          uid: bloc.uid,
          blocType: bloc._name,
          instanceId: bloc._id,
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
   * Generate unique key for a bloc instance
   */
  private getInstanceKey(bloc: BlocBase<any>): string {
    return `${bloc._name}:${bloc.uid}`;
  }

  /**
   * Get instance display name with ID suffix if different from type name.
   * For isolated instances, always include uid to ensure uniqueness in DevTools.
   */
  private getInstanceDisplayName(bloc: BlocBase<any>): string {
    // Isolated instances MUST have unique display names since there can be many at once
    if (bloc._isolated) {
      // Use uid suffix for isolated instances (e.g., "CounterCubit:abc123")
      const shortUid = bloc.uid.substring(0, 8);
      return `${bloc._name}:${shortUid}`;
    }

    // For shared/keepAlive instances, use custom ID if provided
    const idStr = String(bloc._id);
    const hasCustomId = idStr !== bloc._name;
    return hasCustomId ? `${bloc._name}:${idStr}` : bloc._name;
  }

  /**
   * Get the state key used in Redux DevTools state tree.
   * This is the key that appears in the DevTools state viewer.
   *
   * - Isolated instances: Use displayName (includes uid for uniqueness)
   * - Shared with custom ID: Use "Type#instanceId" pattern
   * - Default shared: Use displayName
   */
  private getStateKey(bloc: BlocBase<any>): string {
    const displayName = this.getInstanceDisplayName(bloc);
    const metadata = this.extractMetadata(bloc);

    if (metadata.isolated) {
      return displayName; // Already includes uid for uniqueness
    } else if (String(metadata.instanceId) !== metadata.blocType) {
      return `${metadata.blocType}#${metadata.instanceId}`;
    } else {
      return displayName;
    }
  }

  /**
   * Extract metadata from a bloc instance
   */
  private extractMetadata(bloc: BlocBase<any>): InstanceMetadata {
    const stats = bloc._subscriptionManager.getStats();
    return {
      uid: bloc.uid,
      blocType: bloc._name,
      instanceId: bloc._id,
      instanceRef: bloc._instanceRef,
      isolated: bloc._isolated,
      keepAlive: bloc._keepAlive,
      createdAt: this.instanceMetadata.get(this.getInstanceKey(bloc))?.createdAt || Date.now(),
      lifecycleState: (bloc as any)._lifecycleManager?.currentState || 'unknown',
      subscriberCount: stats.activeSubscriptions,
    };
  }

  /**
   * Get flat state tree for Redux DevTools with rich instance names
   */
  private getGlobalState(): Record<string, any> {
    const state: Record<string, any> = {};

    for (const [key, stateData] of this.currentState.entries()) {
      const bloc = this.blocRegistry.get(key);
      if (!bloc) continue;

      // Skip disposed blocs (defensive check - they should already be cleaned up)
      const lifecycleState = (bloc as any)._lifecycleManager?.currentState;
      if (lifecycleState === 'DISPOSED' || lifecycleState === 'DISPOSING') {
        console.warn(
          `[ReduxDevToolsAdapter] Found disposed bloc in state tree: ${key}. Cleaning up.`,
        );
        this.currentState.delete(key);
        this.blocRegistry.delete(key);
        this.instanceMetadata.delete(key);
        continue;
      }

      // Get the state key for this bloc (handles isolated/shared/custom ID logic)
      const stateKey = this.getStateKey(bloc);

      // Just use the actual state (metadata is available in action payloads)
      state[stateKey] = stateData;
    }

    return state;
  }

  private handleDevToolsMessage(message: ReduxDevToolsMessage): void {
    if (message.type === 'DISPATCH' && message.payload?.type) {
      switch (message.payload.type) {
        case 'JUMP_TO_STATE':
        case 'JUMP_TO_ACTION':
          if (message.state) {
            this.handleTimeTravel(message.state);
          }
          break;

        case 'RESET':
          console.log('[ReduxDevToolsAdapter] Reset requested');
          // Could emit a custom event that the app can listen to
          window.dispatchEvent(new CustomEvent('blac-devtools-reset'));
          break;

        case 'COMMIT':
          console.log('[ReduxDevToolsAdapter] Commit current state');
          break;

        case 'ROLLBACK':
          console.log('[ReduxDevToolsAdapter] Rollback requested');
          break;

        case 'UPDATE_STATE':
          this.handleStateEdit(message.payload);
          break;

        case 'IMPORT_STATE':
          if (message.payload.nextLiftedState) {
            console.log(
              '[ReduxDevToolsAdapter] Import state:',
              message.payload,
            );
          }
          break;
      }
    }

    // Handle action dispatch from DevTools UI
    if (message.type === 'ACTION' && message.payload) {
      // Redux DevTools sends the action as a JSON string when dispatching from the UI
      let action = message.payload;
      console.log(
        '[ReduxDevToolsAdapter] Dispatching action from DevTools:',
        action,
      );
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
          return;
        }
      }
      this.handleActionDispatch(action);
    }
  }

  private handleTimeTravel(stateString: string): void {
    try {
      const targetState = JSON.parse(stateString);

      console.log(
        '[ReduxDevToolsAdapter] Time-travel: Restoring state...',
        targetState,
      );

      // Set flag to prevent recursive Redux DevTools updates
      this.isTimeTraveling = true;

      // Restore each Bloc's state from the flat structure
      let restoredCount = 0;
      let failedCount = 0;

      for (const [stateKey, stateData] of Object.entries(targetState)) {
        // Find the matching bloc
        let bloc: BlocBase<any> | undefined;

        for (const [_key, registeredBloc] of this.blocRegistry.entries()) {
          // Match using the same state key logic as getGlobalState()
          const matchKey = this.getStateKey(registeredBloc);

          if (matchKey === stateKey) {
            bloc = registeredBloc;
            break;
          }
        }

        if (bloc) {
          try {
            // Use _pushState to restore the state
            // The isTimeTraveling flag prevents these state changes from
            // being sent back to Redux DevTools (preventing timeline pollution)
            bloc._pushState(stateData, bloc.state, '[TIME_TRAVEL]');
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

      console.log(
        `[ReduxDevToolsAdapter] Time-travel complete: ${restoredCount} blocs restored, ${failedCount} failed`,
      );

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
    }
  }

  private recordStateSnapshot(action: string): void {
    // Create a deep copy of current state
    const snapshot = new Map<string, any>();
    for (const [blocName, state] of this.currentState.entries()) {
      snapshot.set(blocName, state);
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
      const cleanedType = action.type.replace(/^[\u{1F300}-\u{1F9FF}]+\s*/u, '');

      // Parse action type: "[BlocName] ActionName" or "[BlocName:instanceId] ActionName"
      const match = cleanedType.match(/^\[(.*?)\]\s+(.+)$/);

      if (!match) {
        console.error(
          `[ReduxDevToolsAdapter] Invalid action type format: "${action.type}". Expected format: "[BlocName] ActionName" or "[BlocName:instanceId] ActionName"`,
        );
        return;
      }

      const [, displayName, actionName] = match;

      // Find the bloc/cubit by display name
      let bloc: BlocBase<any> | undefined;
      let blocKey: string | undefined;

      // Try to find by exact display name match
      for (const [key, registeredBloc] of this.blocRegistry.entries()) {
        const registeredDisplayName = this.getInstanceDisplayName(registeredBloc);
        if (registeredDisplayName === displayName) {
          bloc = registeredBloc;
          blocKey = key;
          break;
        }
      }

      // If not found, try to find by bloc type name (for shared instances)
      if (!bloc) {
        for (const [key, registeredBloc] of this.blocRegistry.entries()) {
          if (registeredBloc._name === displayName) {
            bloc = registeredBloc;
            blocKey = key;
            break;
          }
        }
      }

      if (!bloc || !blocKey) {
        const availableBlocs = Array.from(this.blocRegistry.values())
          .map(b => this.getInstanceDisplayName(b));
        console.error(
          `[ReduxDevToolsAdapter] Bloc/Cubit "${displayName}" not found. Available: ${availableBlocs.join(', ')}`,
        );
        return;
      }

      // Handle built-in state actions (work for both Blocs and Cubits)
      if (actionName === 'emit') {
        this.handleEmitAction(bloc, displayName, action);
        return;
      }

      if (actionName === 'patch') {
        this.handlePatchAction(bloc, displayName, action);
        return;
      }

      // Handle custom events (Blocs only)
      this.handleCustomEvent(bloc, displayName, actionName, action);
    } catch (error) {
      console.error('[ReduxDevToolsAdapter] Failed to dispatch action:', error);

      if (this.devTools) {
        this.devTools.error(
          `Failed to dispatch action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Handle emit action - replaces entire state
   */
  private handleEmitAction(
    bloc: BlocBase<any>,
    blocName: string,
    action: any,
  ): void {
    if (!action.payload || !('state' in action.payload)) {
      console.error(
        `[ReduxDevToolsAdapter] emit action requires payload.state. Example: { type: "[${blocName}] emit", payload: { state: newState } }`,
      );
      return;
    }

    const newState = action.payload.state;

    console.log(
      `[ReduxDevToolsAdapter] Emitting state to "${blocName}"`,
      'New state:',
      newState,
    );

    // Use _pushState to emit new state (same as emit but public)
    bloc._pushState(newState, bloc.state, '[DEVTOOLS_EMIT]');

    // Dispatch custom event for user notification
    window.dispatchEvent(
      new CustomEvent('blac-devtools-action-dispatched', {
        detail: {
          blocName,
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
    bloc: BlocBase<any>,
    blocName: string,
    action: any,
  ): void {
    if (!action.payload || !('state' in action.payload)) {
      console.error(
        `[ReduxDevToolsAdapter] patch action requires payload.state. Example: { type: "[${blocName}] patch", payload: { state: { count: 5 } } }`,
      );
      return;
    }

    const partialState = action.payload.state;

    console.log(
      `[ReduxDevToolsAdapter] Patching state of "${blocName}"`,
      'Partial state:',
      partialState,
    );

    // Check if bloc has patch method
    if ('patch' in bloc && typeof bloc.patch === 'function') {
      bloc.patch(partialState);

      // Dispatch custom event for user notification
      window.dispatchEvent(
        new CustomEvent('blac-devtools-action-dispatched', {
          detail: {
            blocName,
            action: 'patch',
            payload: action.payload,
          },
        }),
      );
    } else {
      console.error(
        `[ReduxDevToolsAdapter] Bloc/Cubit "${blocName}" does not have a patch method. Use emit instead.`,
      );
    }
  }

  /**
   * Handle custom registered events (Blocs only)
   */
  private handleCustomEvent(
    bloc: BlocBase<any>,
    blocName: string,
    eventName: string,
    action: any,
  ): void {
    // Check if bloc supports events (is a Bloc, not just a Cubit)
    if (!('add' in bloc) || typeof bloc.add !== 'function') {
      console.error(
        `[ReduxDevToolsAdapter] "${blocName}" is a Cubit and does not support custom events.`,
        '\n\nCubits only support built-in actions:',
        `\n  - { type: "[${blocName}] emit", payload: { state: newState } }`,
        `\n  - { type: "[${blocName}] patch", payload: { state: partialState } }`,
        '\n\nTo dispatch custom events, use a Bloc instead of a Cubit.',
      );
      return;
    }

    // Check if event is registered
    if (!EventRegistry.has(eventName)) {
      console.error(
        `[ReduxDevToolsAdapter] Event "${eventName}" is not registered. Available events: ${EventRegistry.getRegisteredEvents().join(', ') || 'none'}`,
        '\n\nTo register an event:',
        "\n\nEventRegistry.register('IncrementEvent', IncrementEvent, {",
        "\n  parameterNames: ['amount'],",
        '\n});',
      );
      return;
    }

    // Deserialize and dispatch the event
    const event = EventRegistry.deserializeEvent(
      eventName,
      action.payload || {},
    );

    console.log(
      `[ReduxDevToolsAdapter] Dispatching event "${eventName}" to "${blocName}"`,
      'Event:',
      event,
    );

    // Dispatch the event
    (bloc as Bloc<any, any>).add(event);

    // Dispatch custom event for user notification
    window.dispatchEvent(
      new CustomEvent('blac-devtools-action-dispatched', {
        detail: {
          blocName,
          eventName,
          payload: action.payload,
          event,
        },
      }),
    );
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

      // Find the bloc by state key
      let bloc: BlocBase<any> | undefined;
      let blocKey: string | undefined;

      for (const [key, registeredBloc] of this.blocRegistry.entries()) {
        // Match using the same state key logic as getGlobalState()
        const matchKey = this.getStateKey(registeredBloc);

        if (matchKey === stateKey) {
          bloc = registeredBloc;
          blocKey = key;
          break;
        }
      }

      if (!bloc || !blocKey) {
        const availableKeys = Array.from(this.blocRegistry.values())
          .map(b => this.getStateKey(b));
        console.error(
          `[ReduxDevToolsAdapter] Bloc "${stateKey}" not found. Available: ${availableKeys.join(', ') || 'none'}`,
        );
        return;
      }

      const currentState = bloc.state;
      const displayName = this.getInstanceDisplayName(bloc);

      // If path is just the state key (no property path), update entire state
      if (statePath.length === 0) {
        console.log(
          `[ReduxDevToolsAdapter] Replacing entire state of "${displayName}"`,
          '\nOld value:',
          currentState,
          '\nNew value:',
          value,
        );

        bloc._pushState(value, currentState, '[DEVTOOLS_EDIT]');

        window.dispatchEvent(
          new CustomEvent('blac-devtools-state-edited', {
            detail: {
              blocType: bloc._name,
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

      console.log(
        `[ReduxDevToolsAdapter] Editing state of "${displayName}" at path "${statePath.join('.')}"`,
        '\nOld value:',
        currentState,
        '\nNew value:',
        newState,
      );

      // Emit updated state
      bloc._pushState(newState, currentState, '[DEVTOOLS_EDIT]');

      // Dispatch custom event for user notification
      window.dispatchEvent(
        new CustomEvent('blac-devtools-state-edited', {
          detail: {
            blocType: bloc._name,
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
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    if (this.devTools) {
      this.devTools.unsubscribe();
      this.devTools = null;
    }

    this.currentState.clear();
    this.instanceMetadata.clear();
    this.blocRegistry.clear();
    this.enabled = false;
  }

  /**
   * Check if Redux DevTools is available and connected
   */
  isConnected(): boolean {
    return this.devTools !== null;
  }
}
