import { html, nothing } from 'lit-html';
import { directive } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import {
  ALL_PATHS,
  getRegistry,
  resolveInstanceKey,
  type StateContainer,
  type StateContainerConstructor,
  type ExtractArgs,
} from '@blac/core';
import { reactive, type BlocView } from './live';

let counter = 0;
const nextRefId = () => `blac-lit@${(counter += 1)}`;
const nextLocalKey = () => `blac-lit-local:${(counter += 1)}`;

type Cleanup = () => void;
type MountSetup = () => void | Cleanup;

/** A component's args param: required when `A` is a required args type, optional otherwise, absent when `A` is `void`. */
type ArgsParam<A> = [A] extends [void]
  ? []
  : undefined extends A
    ? [args?: A]
    : [args: A];

/** `ctx.args`'s type: mirrors `ArgsParam`, so a required args type is never `| undefined` inside the body. */
type CtxArgs<A> = [A] extends [void]
  ? undefined
  : undefined extends A
    ? A | undefined
    : A;

export interface Ctx<A = any> {
  readonly args: CtxArgs<A>;
  use<T extends StateContainerConstructor>(
    Bloc: T,
    opts?: { args?: ExtractArgs<T> },
  ): BlocView<T>;
  /** Runs once for each active connection; a returned function runs on disconnect. */
  onMount(fn: MountSetup): void;
  /** @deprecated Prefer returning cleanup from `onMount`. */
  onUnmount(fn: Cleanup): void;
  /** Coarse autorun: runs now and re-runs on any change to `bloc`. */
  effect(bloc: StateContainer, fn: () => void): void;
}

type BoundRender = (bloc: any, ctx: Ctx) => unknown;
type PureRender = (ctx: Ctx) => unknown;

interface Acquired {
  Bloc: StateContainerConstructor;
  key: string;
  refId: string;
  args: unknown;
  instance: StateContainer;
  view: any;
  active: boolean;
}

interface EffectSetup {
  bloc: StateContainer;
  fn: () => void;
}

interface ComponentDefinition {
  token: symbol;
  Bloc: StateContainerConstructor | null;
  renderFn: BoundRender | PureRender;
}

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

/**
 * Pure components have no registry key. Serializable props get a stable,
 * structural identity; unsupported props fall back to reference identity so a
 * changed callback/ref can never silently reuse stale construction data.
 */
const pureReferences = new WeakMap<object, number>();
let pureReferenceCounter = 0;

function pureReferenceKey(value: unknown): string {
  if (
    (typeof value !== 'object' || value === null) &&
    typeof value !== 'function'
  ) {
    return `${typeof value}:${String(value)}`;
  }
  const reference = value as object;
  let id = pureReferences.get(reference);
  if (id === undefined) {
    id = pureReferenceCounter += 1;
    pureReferences.set(reference, id);
  }
  return `ref:${id}`;
}

function pureArgsKey(args: unknown): string {
  if (args === undefined || args === null) return 'default';
  try {
    const serialized = JSON.stringify(args, (_key, value) => {
      if (typeof value === 'function') {
        throw new Error('functions are not structural component props');
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce(
            (result, key) => {
              result[key] = (value as Record<string, unknown>)[key];
              return result;
            },
            {} as Record<string, unknown>,
          );
      }
      return value;
    });
    return `props:${serialized}`;
  } catch {
    return pureReferenceKey(args);
  }
}

function throwCollected(errors: unknown[], message: string): void {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, message);
}

class ComponentDirective extends AsyncDirective {
  private initialized = false;
  private definition?: ComponentDefinition;
  private identity?: string;
  private args: unknown;
  private forcedKey?: string;
  private result: unknown = nothing;

  private acquired: Acquired[] = [];
  private acquiredByBloc = new Map<
    StateContainerConstructor,
    Map<string, Acquired>
  >();

  private mountSetups: MountSetup[] = [];
  private legacyUnmounts: Cleanup[] = [];
  private effectSetups: EffectSetup[] = [];
  private activeMountCleanups: Cleanup[] = [];
  private activeEffectCleanups: Cleanup[] = [];
  private connectionActive = false;

  render(
    definition: ComponentDefinition,
    args: unknown,
    forcedKey: string | undefined,
  ): unknown {
    const identity = this.resolveIdentity(definition, args, forcedKey);
    if (
      this.initialized &&
      this.definition?.token === definition.token &&
      this.identity === identity
    ) {
      return this.result;
    }

    if (this.initialized) this.teardownIdentity();
    this.initialize(definition, identity, args, forcedKey);
    return this.result;
  }

  private resolveIdentity(
    definition: ComponentDefinition,
    args: unknown,
    forcedKey: string | undefined,
  ): string {
    if (forcedKey !== undefined) return forcedKey;
    return definition.Bloc
      ? resolveInstanceKey(definition.Bloc, args as any)
      : pureArgsKey(args);
  }

  private initialize(
    definition: ComponentDefinition,
    identity: string,
    args: unknown,
    forcedKey: string | undefined,
  ): void {
    this.definition = definition;
    this.identity = identity;
    this.args = args;
    this.forcedKey = forcedKey;

    try {
      this.executeBody();
      this.initialized = true;
      if (this.isConnected) this.startConnection();
    } catch (error) {
      const rollbackErrors: unknown[] = [error];
      try {
        this.teardownIdentity();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      throwCollected(
        rollbackErrors,
        'Failed to initialize a Blac Lit component.',
      );
    }
  }

  private executeBody(): void {
    const definition = this.definition;
    if (!definition)
      throw new Error('Cannot execute a component without a definition.');

    this.mountSetups = [];
    this.legacyUnmounts = [];
    this.effectSetups = [];

    const ctx: Ctx = {
      args: this.args as any,
      use: (Other, opts) => this.acquireView(Other, opts?.args) as any,
      onMount: (fn) => this.mountSetups.push(fn),
      onUnmount: (fn) => this.legacyUnmounts.push(fn),
      effect: (bloc, fn) => this.effectSetups.push({ bloc, fn }),
    };

    this.result = definition.Bloc
      ? (definition.renderFn as BoundRender)(
          this.acquireView(definition.Bloc, this.args, this.forcedKey),
          ctx,
        )
      : (definition.renderFn as PureRender)(ctx);
  }

  private acquireView(
    Bloc: StateContainerConstructor,
    args: unknown,
    forcedKey?: string,
  ): any {
    const key = forcedKey ?? resolveInstanceKey(Bloc, args as any);
    const existing = this.acquiredByBloc.get(Bloc)?.get(key);
    if (existing) return existing.view;

    const refId = nextRefId();
    const instance = getRegistry().acquire(Bloc, key, {
      canCreate: true,
      countRef: true,
      refId,
      args,
    }) as StateContainer;
    const acquired: Acquired = {
      Bloc,
      key,
      refId,
      args,
      instance,
      view: makeHandle(instance),
      active: true,
    };
    this.acquired.push(acquired);
    let byKey = this.acquiredByBloc.get(Bloc);
    if (!byKey) {
      byKey = new Map();
      this.acquiredByBloc.set(Bloc, byKey);
    }
    byKey.set(key, acquired);
    return acquired.view;
  }

  protected reconnected(): void {
    if (!this.initialized) return;

    try {
      const changed = this.reacquire();
      if (changed) {
        // The old DOM closes over the old instances. Recreate only when a
        // reconnect actually replaced one; otherwise Lit can reuse the DOM.
        this.executeBody();
        this.setValue(this.result);
      }
      this.startConnection();
    } catch (error) {
      const rollbackErrors: unknown[] = [error];
      try {
        this.teardownIdentity();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      throwCollected(
        rollbackErrors,
        'Failed to reconnect a Blac Lit component.',
      );
    }
  }

  /** Reacquire refs transactionally and report whether any instance was recreated. */
  private reacquire(): boolean {
    const reacquired: Acquired[] = [];
    let changed = false;
    try {
      for (const acquired of this.acquired) {
        if (acquired.active) continue;
        const instance = getRegistry().acquire(acquired.Bloc, acquired.key, {
          canCreate: true,
          countRef: true,
          refId: acquired.refId,
          args: acquired.args,
        }) as StateContainer;
        reacquired.push(acquired);
        acquired.active = true;
        if (instance !== acquired.instance) {
          changed = true;
          acquired.instance = instance;
          acquired.view = makeHandle(instance);
        }
      }
      return changed;
    } catch (error) {
      const rollbackErrors: unknown[] = [error];
      for (const acquired of reacquired) {
        try {
          getRegistry().release(
            acquired.Bloc,
            acquired.key,
            false,
            acquired.refId,
          );
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        } finally {
          acquired.active = false;
        }
      }
      throwCollected(
        rollbackErrors,
        'Failed to reacquire Blac Lit component refs.',
      );
      // throwCollected always throws here (rollbackErrors is non-empty); unreachable.
      return false;
    }
  }

  private startConnection(): void {
    if (this.connectionActive) return;
    this.connectionActive = true;

    for (const setup of this.mountSetups) {
      const cleanup = setup();
      if (typeof cleanup === 'function') this.activeMountCleanups.push(cleanup);
    }

    for (const effect of this.effectSetups) {
      const unsubscribe = effect.bloc.channel.subscribe(
        () => ALL_PATHS,
        () => {
          effect.fn();
        },
      );
      this.activeEffectCleanups.push(unsubscribe);
      effect.fn();
    }
  }

  protected disconnected(): void {
    const errors: unknown[] = [];
    try {
      this.stopConnection();
    } catch (error) {
      errors.push(error);
    } finally {
      try {
        this.releaseAcquired();
      } catch (error) {
        errors.push(error);
      }
    }
    throwCollected(errors, 'Failed to disconnect a Blac Lit component.');
  }

  private teardownIdentity(): void {
    const errors: unknown[] = [];
    try {
      this.stopConnection();
    } catch (error) {
      errors.push(error);
    } finally {
      try {
        this.releaseAcquired();
      } catch (error) {
        errors.push(error);
      } finally {
        this.resetIdentity();
      }
    }
    throwCollected(errors, 'Failed to dispose a Blac Lit component.');
  }

  private stopConnection(): void {
    if (!this.connectionActive) return;
    this.connectionActive = false;
    const errors: unknown[] = [];

    const mountCleanups = this.activeMountCleanups.splice(0);
    const effectCleanups = this.activeEffectCleanups.splice(0);
    for (const cleanup of mountCleanups) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    for (const cleanup of this.legacyUnmounts) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    for (const cleanup of effectCleanups) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    throwCollected(
      errors,
      'Failed to clean up a Blac Lit component connection.',
    );
  }

  private releaseAcquired(): void {
    const errors: unknown[] = [];
    for (const acquired of this.acquired) {
      if (!acquired.active) continue;
      try {
        getRegistry().release(
          acquired.Bloc,
          acquired.key,
          false,
          acquired.refId,
        );
      } catch (error) {
        errors.push(error);
      } finally {
        // A successful acquire must be released once; never let a cleanup
        // exception cause a later lifecycle call to double-release this ref.
        acquired.active = false;
      }
    }
    throwCollected(errors, 'Failed to release Blac Lit component refs.');
  }

  private resetIdentity(): void {
    this.initialized = false;
    this.definition = undefined;
    this.identity = undefined;
    this.args = undefined;
    this.forcedKey = undefined;
    this.result = nothing;
    this.acquired = [];
    this.acquiredByBloc.clear();
    this.mountSetups = [];
    this.legacyUnmounts = [];
    this.effectSetups = [];
    this.activeMountCleanups = [];
    this.activeEffectCleanups = [];
    this.connectionActive = false;
  }
}

const componentDirective = directive(ComponentDirective);

export interface ComponentFactory<A> {
  (...args: ArgsParam<A>): unknown;
  /** A fresh, mount-private instance under a unique key. */
  local(...args: ArgsParam<A>): unknown;
}

// Overloads: bound component vs pure component.
export function component<T extends StateContainerConstructor>(
  Bloc: T,
  render: (bloc: BlocView<T>, ctx: Ctx<ExtractArgs<T>>) => unknown,
): ComponentFactory<ExtractArgs<T>>;
export function component<A = unknown>(
  render: (ctx: Ctx<A>) => unknown,
): ComponentFactory<A>;
export function component(a: any, b?: any): ComponentFactory<any> {
  const hasBloc = typeof b === 'function';
  const definition: ComponentDefinition = {
    token: Symbol('blac-lit.component'),
    Bloc: (hasBloc ? a : null) as StateContainerConstructor | null,
    renderFn: hasBloc ? b : a,
  };

  // Wrap the directive in a template so the removable item root is a
  // TemplateInstance, not the directive itself. When a bare `component()` is
  // the direct item of `each`/`repeat`, lit's `_$clear(isClearingValue=true)`
  // skips disconnecting the item-root directive, so `disconnected()` never
  // fires and acquired refs/subscriptions leak. A nested directive under a
  // TemplateInstance always gets disconnected on removal.
  const factory = ((args?: any) =>
    html`${componentDirective(definition, args, undefined)}`) as ComponentFactory<any>;
  factory.local = (args?: any) =>
    html`${componentDirective(definition, args, nextLocalKey())}`;
  return factory;
}
