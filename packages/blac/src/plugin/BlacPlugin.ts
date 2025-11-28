import type { StateContainer } from '../core/StateContainer';
import type { Vertex } from '../core/Vertex';
import type { BaseEvent } from '../types/events';

export interface InstanceMetadata {
  id: string;
  className: string;
  isDisposed: boolean;
  name: string;
  lastStateChangeTimestamp: number;
  state: any;
  createdAt: number;
  isIsolated: boolean;
  callstack?: string;
  previousState?: any;
  currentState?: any;
}

export interface PluginContext {
  getInstanceMetadata(instance: StateContainer<any>): InstanceMetadata;

  getState<S>(instance: StateContainer<S>): S;

  queryInstances<T extends StateContainer<any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];

  getAllTypes(): Array<new (...args: any[]) => StateContainer<any>>;

  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };
}

export interface BlacPlugin {
  readonly name: string;
  readonly version: string;

  onInstall?(context: PluginContext): void;
  onUninstall?(): void;
  onInstanceCreated?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
  onStateChanged?<S>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    callstack: string | undefined,
    context: PluginContext,
  ): void;
  onEventAdded?<E extends BaseEvent>(
    vertex: Vertex<any, E>,
    event: E,
    context: PluginContext,
  ): void;
  onInstanceDisposed?(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void;
}

export interface BlacPluginWithInit extends BlacPlugin {
  onInstall(context: PluginContext): void;
}

export interface PluginConfig {
  enabled?: boolean;
  environment?: 'development' | 'production' | 'test' | 'all';
}

export function hasInitHook(plugin: BlacPlugin): plugin is BlacPluginWithInit {
  return typeof plugin.onInstall === 'function';
}
