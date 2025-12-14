import type { BlacPlugin, StateContainer, Vertex } from '@blac/core';
import { DevToolsBridge } from '../bridge/DevToolsBridge';
import { DevToolsMessageType } from '../protocol/messages';
import { safeSerialize } from '../serialization/serialize';
import type { SerializedEvent } from '../bridge/types';
import type { DevToolsPluginConfig } from './types';

/**
 * Legacy DevTools Plugin
 *
 * @deprecated Use DevToolsBrowserPlugin instead for full Chrome extension support.
 * This plugin uses the legacy message protocol and has limited functionality.
 *
 * Migration guide:
 * ```typescript
 * // Before (deprecated):
 * import { DevToolsPlugin } from '@blac/devtools-connect';
 * const plugin = new DevToolsPlugin({ enabled: true });
 *
 * // After (recommended):
 * import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
 * const plugin = createDevToolsBrowserPlugin({ enabled: true });
 * ```
 *
 * Key differences:
 * - DevToolsBrowserPlugin exposes a global API for the Chrome extension
 * - DevToolsBrowserPlugin maintains state history with snapshots
 * - DevToolsBrowserPlugin supports the full atomic message protocol
 */
export class DevToolsPlugin implements BlacPlugin {
  readonly name = 'DevToolsPlugin';
  readonly version = '0.1.0';

  private bridge: DevToolsBridge;
  private eventHistory: SerializedEvent[] = [];
  private maxEvents: number;
  private enabled: boolean;
  private eventIdCounter = 0;

  constructor(config: DevToolsPluginConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxEvents = config.maxEvents ?? 500;

    this.bridge = new DevToolsBridge({
      enabled: this.enabled,
      maxMessageSize: config.maxMessageSize,
      maxMessagesPerSecond: config.maxMessagesPerSecond,
    });

    this.setupCommandHandlers();
  }

  private setupCommandHandlers(): void {
    this.bridge.onCommand('TIME_TRAVEL', (command) => {
      if (command.type === 'TIME_TRAVEL') {
        this.handleTimeTravel(command.payload.eventIndex);
      }
    });

    this.bridge.onCommand('CLEAR_EVENTS', () => {
      this.eventHistory = [];
    });

    this.bridge.onCommand('REQUEST_STATE', (_command) => {
      // Handle state request
    });
  }

  onBlocCreated(bloc: StateContainer<any>): void {
    if (!this.enabled) return;

    const result = safeSerialize(bloc.state);

    this.bridge.send({
      type: DevToolsMessageType.BLOC_CREATED,
      payload: {
        id: bloc.instanceId,
        name: bloc.name,
        state: result.success ? result.data : { error: result.error },
        timestamp: Date.now(),
      },
    });
  }

  onEventAdded(bloc: Vertex<any, any>, event: any): void {
    if (!this.enabled) return;

    const eventResult = safeSerialize(event);
    const serializedEvent: SerializedEvent = {
      id: this.generateEventId(),
      blocId: bloc.instanceId,
      blocName: bloc.name,
      type: event.constructor?.name || 'UnknownEvent',
      payload: eventResult.success
        ? eventResult.data
        : { error: eventResult.error },
      timestamp: Date.now(),
    };

    this.eventHistory.push(serializedEvent);

    if (this.eventHistory.length > this.maxEvents) {
      this.eventHistory.shift();
    }

    this.bridge.send({
      type: DevToolsMessageType.EVENT_DISPATCHED,
      payload: serializedEvent,
    });
  }

  onStateChanged(
    bloc: StateContainer<any>,
    previousState: any,
    currentState: any,
  ): void {
    if (!this.enabled) return;

    const prevStateResult = safeSerialize(previousState);
    const currStateResult = safeSerialize(currentState);
    const diffResult = this.computeDiff(previousState, currentState);

    this.bridge.send({
      type: DevToolsMessageType.STATE_CHANGED,
      payload: {
        id: bloc.instanceId,
        previousState: prevStateResult.success
          ? prevStateResult.data
          : { error: prevStateResult.error },
        currentState: currStateResult.success
          ? currStateResult.data
          : { error: currStateResult.error },
        diff: diffResult,
        timestamp: Date.now(),
      },
    });
  }

  onBlocDisposed(bloc: StateContainer<any>): void {
    if (!this.enabled) return;

    this.bridge.send({
      type: DevToolsMessageType.BLOC_DISPOSED,
      payload: {
        id: bloc.instanceId,
        name: bloc.name,
        timestamp: Date.now(),
      },
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${this.eventIdCounter++}`;
  }

  private computeDiff(prev: any, next: any): any {
    if (typeof prev !== 'object' || typeof next !== 'object') {
      return { changed: true };
    }

    if (prev === null || next === null) {
      return { changed: true };
    }

    const diff: Record<string, any> = {};
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    for (const key of keys) {
      if (prev[key] !== next[key]) {
        diff[key] = { prev: prev[key], next: next[key] };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  /**
   * Time-travel is not implemented in this legacy plugin.
   * Use ReduxDevToolsAdapter for full time-travel support.
   * @deprecated This method is a no-op. Use ReduxDevToolsAdapter instead.
   */
  private handleTimeTravel(_eventIndex: number): void {
    console.warn(
      '[DevToolsPlugin] Time-travel is not implemented in legacy plugin. Use ReduxDevToolsAdapter instead.',
    );
  }

  getEventHistory(): ReadonlyArray<SerializedEvent> {
    return this.eventHistory;
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }

  disable(): void {
    this.enabled = false;
    this.bridge.disconnect();
  }

  enable(): void {
    this.enabled = true;
  }
}
