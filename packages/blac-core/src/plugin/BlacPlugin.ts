import type { HydrationStatus, StateContainer } from '../core/StateContainer';

export interface InstanceMetadata {
  id: string;
  className: string;
  isDisposed: boolean;
  name: string;
  state: any;
  createdAt: number;
  previousState?: any;
  currentState?: any;
  hydrationStatus: HydrationStatus;
  isHydrated: boolean;
  hydrationError?: Error;
  changedWhileHydrating: boolean;
}

export interface PluginContext {
  getInstanceMetadata(instance: StateContainer<any, any, any>): InstanceMetadata;

  getState<S extends object = any>(instance: StateContainer<S>): S;

  getHydrationStatus(instance: StateContainer<any, any, any>): HydrationStatus;

  startHydration(instance: StateContainer<any, any, any>): void;

  applyHydratedState<S extends object = any>(
    instance: StateContainer<S>,
    state: S,
  ): boolean;

  finishHydration(instance: StateContainer<any, any, any>): void;

  failHydration(instance: StateContainer<any, any, any>, error: Error): void;

  waitForHydration(instance: StateContainer<any, any, any>): Promise<void>;

  queryInstances<T extends StateContainer<any, any, any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];

  getAllTypes(): Array<new (...args: any[]) => StateContainer<any, any, any>>;

  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };

  getRefIds(instanceId: string): string[];
}

export interface BlacPlugin {
  readonly name: string;
  readonly version: string;

  onInstall?(context: PluginContext): void;

  onUninstall?(): void;

  onInstanceCreated?(
    instance: StateContainer<any, any, any>,
    context: PluginContext,
  ): void;

  onStateChanged?<S extends object = any>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    context: PluginContext,
  ): void;

  onInstanceDisposed?(
    instance: StateContainer<any, any, any>,
    context: PluginContext,
  ): void;

  onRefAcquired?(
    instance: StateContainer<any, any, any>,
    refId: string,
    context: PluginContext,
  ): void;

  onRefReleased?(
    instance: StateContainer<any, any, any>,
    refId: string,
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
