import { nothing } from 'lit-html';
import { directive } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import {
  getRegistry,
  resolveInstanceKey,
  watch,
  type StateContainer,
  type StateContainerConstructor,
  type ExtractArgs,
} from '@blac/core';
import { reactive } from './live';

let counter = 0;
const nextRefId = () => `blac-lit@${(counter += 1)}`;
const nextLocalKey = () => `blac-lit-local:${(counter += 1)}`;

export interface Ctx<A = any> {
  readonly args: A | undefined;
  use<T extends StateContainerConstructor>(
    Bloc: T,
    opts?: { args?: ExtractArgs<T> },
  ): InstanceType<T>;
  onMount(fn: () => void): void;
  onUnmount(fn: () => void): void;
  /** Coarse autorun: runs now and re-runs on any change to `bloc`. */
  effect(bloc: StateContainer, fn: () => void): void;
}

type BoundRender = (bloc: any, ctx: Ctx) => unknown;
type PureRender = (ctx: Ctx) => unknown;

/** Turn a bloc instance into the render handle: `.$` reactive proxy + live methods/getters. */
function makeHandle(bloc: StateContainer): any {
  const dollar = reactive(bloc);
  return new Proxy(bloc, {
    get(target, prop, receiver) {
      if (prop === '$') return dollar;
      return Reflect.get(target, prop, receiver);
    },
  });
}

class ComponentDirective extends AsyncDirective {
  private started = false;
  private result: unknown = nothing;
  private acquired: Array<{
    Bloc: StateContainerConstructor;
    key: string;
    refId: string;
    args: unknown;
  }> = [];
  private unmountCbs: Array<() => void> = [];
  private disposers: Array<() => void> = [];
  private pendingMount: Array<() => void> = [];

  render(
    Bloc: StateContainerConstructor | null,
    renderFn: BoundRender | PureRender,
    args: unknown,
    forcedKey: string | undefined,
  ): unknown {
    if (this.started) return this.result;
    this.started = true;

    const mountCbs: Array<() => void> = [];
    const ctx: Ctx = {
      args: args as any,
      use: (Other, opts) => this.acquire(Other, opts?.args) as any,
      onMount: (fn) => mountCbs.push(fn),
      onUnmount: (fn) => this.unmountCbs.push(fn),
      effect: (bloc, fn) => {
        this.disposers.push(watch(bloc as any, () => fn()));
      },
    };

    if (Bloc) {
      const bloc = this.acquire(Bloc, args, forcedKey);
      this.result = (renderFn as BoundRender)(makeHandle(bloc), ctx);
    } else {
      this.result = (renderFn as PureRender)(ctx);
    }

    if (this.isConnected) mountCbs.forEach((fn) => fn());
    else this.pendingMount = mountCbs;

    return this.result;
  }

  private acquire(
    Bloc: StateContainerConstructor,
    args: unknown,
    forcedKey?: string,
  ): StateContainer {
    const registry = getRegistry();
    const key = forcedKey ?? resolveInstanceKey(Bloc, args as any);
    const refId = nextRefId();
    const instance = registry.acquire(Bloc, key, {
      canCreate: true,
      countRef: true,
      refId,
      args,
    }) as StateContainer;
    this.acquired.push({ Bloc, key, refId, args });
    return instance;
  }

  protected reconnected(): void {
    // Re-take refs released on disconnect (keys preserved).
    const registry = getRegistry();
    for (const a of this.acquired) {
      registry.acquire(a.Bloc, a.key, {
        canCreate: true,
        countRef: true,
        refId: a.refId,
        args: a.args,
      });
    }
    this.pendingMount.forEach((fn) => fn());
    this.pendingMount = [];
  }

  protected disconnected(): void {
    this.unmountCbs.forEach((fn) => fn());
    this.disposers.forEach((d) => d());
    this.disposers = [];
    const registry = getRegistry();
    for (const a of this.acquired) {
      registry.release(a.Bloc, a.key, false, a.refId);
    }
  }
}

const componentDirective = directive(ComponentDirective);

export interface ComponentFactory<A> {
  (args?: A): unknown;
  /** A fresh, mount-private instance under a unique key. */
  local(args?: A): unknown;
}

// Overloads: bound component vs pure component.
export function component<T extends StateContainerConstructor>(
  Bloc: T,
  render: (bloc: any, ctx: Ctx<ExtractArgs<T>>) => unknown,
): ComponentFactory<ExtractArgs<T>>;
export function component<A = unknown>(
  render: (ctx: Ctx<A>) => unknown,
): ComponentFactory<A>;
export function component(a: any, b?: any): ComponentFactory<any> {
  const hasBloc = typeof b === 'function';
  const Bloc = (hasBloc ? a : null) as StateContainerConstructor | null;
  const renderFn = hasBloc ? b : a;

  const factory = ((args?: any) =>
    componentDirective(
      Bloc,
      renderFn,
      args,
      undefined,
    )) as ComponentFactory<any>;
  factory.local = (args?: any) =>
    componentDirective(Bloc, renderFn, args, nextLocalKey());
  return factory;
}
