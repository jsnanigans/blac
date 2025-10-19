import type { BlacPlugin , BlocBase , Vertex } from '@blac/core';
import { DevToolsBridge } from '../bridge/DevToolsBridge';
import { safeSerialize } from '../serialization/serialize';
import type { SerializedEvent } from '../bridge/types';
import type { DevToolsPluginConfig } from './types';

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

    this.bridge.onCommand('REQUEST_STATE', (command) => {
      if (command.type === 'REQUEST_STATE') {
        console.log('[DevToolsPlugin] State request:', command.payload.blocId);
      }
    });
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    if (!this.enabled) return;

    const result = safeSerialize(bloc.state);

    this.bridge.send({
      type: 'BLOC_CREATED',
      payload: {
        id: bloc.uid,
        name: bloc._name,
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
      blocId: bloc.uid,
      blocName: bloc._name,
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
      type: 'EVENT_DISPATCHED',
      payload: serializedEvent,
    });
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    if (!this.enabled) return;

    const stateResult = safeSerialize(currentState);
    const diffResult = this.computeDiff(previousState, currentState);

    this.bridge.send({
      type: 'STATE_CHANGED',
      payload: {
        blocId: bloc.uid,
        state: stateResult.success
          ? stateResult.data
          : { error: stateResult.error },
        diff: diffResult,
        timestamp: Date.now(),
      },
    });
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    if (!this.enabled) return;

    this.bridge.send({
      type: 'BLOC_DISPOSED',
      payload: {
        id: bloc.uid,
        name: bloc._name,
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

  private handleTimeTravel(eventIndex: number): void {
    console.log('[DevToolsPlugin] Time travel to event:', eventIndex);
    console.warn(
      '[DevToolsPlugin] Time-travel is experimental and only works with synchronous events',
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
