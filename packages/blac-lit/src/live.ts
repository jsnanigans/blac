import { directive, type DirectiveResult } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import type {
  ExtractState,
  InstanceReadonlyState,
  StateContainer,
  StateContainerConstructor,
} from '@blac/core';
import { BindingSession } from './internal/binding-session';

export type ReadFn<S = any, T = unknown> = (state: S, bloc: any) => T;
export type ProjectFn = (value: any) => unknown;

/** A reactive value bound to a bloc. Renderable directly AND chainable via .map. */
export interface Binding<T = unknown> extends DirectiveResult {
  map<U>(fn: (value: T) => U): Binding<U>;
}

/** @internal Binding source/reader metadata, kept off the public Binding surface. */
export interface BindingMeta<T> {
  bloc: StateContainer;
  read: ReadFn<any, T>;
}

const bindingMeta = new WeakMap<object, BindingMeta<any>>();

/** @internal Look up the bloc/read pair backing a Binding produced by this module. */
export function getBindingMeta<T>(binding: Binding<T>): BindingMeta<T> {
  const meta = bindingMeta.get(binding as object);
  if (!meta) {
    throw new Error(
      'getBindingMeta: value is not a Binding produced by @blac/lit.',
    );
  }
  return meta;
}

/**
 * Anything that exposes a readonly `state` — a raw {@link StateContainer} or the
 * {@link BlocView} handed to a `component` render / returned by `ctx.use`. `select`
 * accepts either and infers the state type from `.state`.
 */
type StatefulSource = { readonly state: unknown };

/**
 * The reactive state surface exposed as `view.$`.
 *
 * This intentionally types the common top-level state-path case. Nested
 * path inference is a separate ergonomic enhancement; every declared state
 * key still produces the Binding for that key's actual value type.
 */
export type ReactiveState<S extends object> = {
  readonly [K in keyof S]: Binding<S[K]>;
};

/** A live bloc instance augmented with its reactive `.$` state view. */
export type BlocView<T extends StateContainerConstructor> =
  InstanceReadonlyState<T> & {
    readonly $: ReactiveState<ExtractState<T>>;
  };

class BindDirective extends AsyncDirective {
  private readFn!: ReadFn;
  private project?: ProjectFn;
  private readonly session = new BindingSession<unknown>((value) => {
    this.setValue(this.project ? this.project(value) : value);
  });

  render(bloc: StateContainer, readFn: ReadFn, project?: ProjectFn): unknown {
    this.readFn = readFn;
    this.project = project;
    const value = this.session.compute(bloc, (state, trackedBloc) =>
      this.readFn(state, trackedBloc),
    );
    if (this.isConnected) this.session.connect();
    return this.project ? this.project(value) : value;
  }

  protected disconnected(): void {
    this.session.disconnect();
  }
  protected reconnected(): void {
    this.session.reconnect();
  }
}

const bindDirective = directive(BindDirective);

/** Low-level: bind a bloc read (+ optional projection to a template) as a self-updating hole. */
export function bind(
  bloc: StateContainer,
  readFn: ReadFn,
  project?: ProjectFn,
): DirectiveResult {
  return bindDirective(bloc, readFn, project);
}

function makeBinding<T>(
  bloc: StateContainer,
  readFn: ReadFn<any, T>,
): Binding<T> {
  const result = bind(bloc, readFn) as DirectiveResult;
  const binding = Object.assign(result, {
    map<U>(fn: (v: T) => U): Binding<U> {
      return makeBinding<U>(bloc, (s, b) => fn(readFn(s, b)));
    },
  }) as Binding<T>;
  bindingMeta.set(binding, { bloc, read: readFn });
  return binding;
}

/** Reactive selector: subscribes to exactly the paths the read touches (getters included). */
export function select<B extends StatefulSource, R>(
  bloc: B,
  readFn: (state: B['state'], bloc: B) => R,
): Binding<R> {
  return makeBinding<R>(
    bloc as unknown as StateContainer,
    readFn as unknown as ReadFn<any, R>,
  );
}

export function isBinding(v: unknown): v is Binding {
  return typeof v === 'object' && v !== null && bindingMeta.has(v as object);
}

/**
 * The `$` reactive proxy over a bloc's STATE. `bloc.$.a.b` builds a Binding for
 * path a.b. Chainable (further props extend the path); terminal access exposes
 * the Binding (renderable + .map). Getters/computed/cross-bloc: use `select`.
 */
export function reactive(bloc: StateContainer): any {
  const build = (path: string[]): any => {
    const binding = path.length
      ? makeBinding(bloc, (s: any) =>
          path.reduce((o, k) => (o == null ? o : o[k]), s),
        )
      : undefined;
    const proxy = new Proxy(binding ?? (Object.create(null) as object), {
      get(_t, prop) {
        if (
          prop === '_$litDirective$' ||
          prop === 'values' ||
          prop === 'map' ||
          typeof prop === 'symbol'
        ) {
          return binding ? (binding as any)[prop] : undefined;
        }
        return build([...path, String(prop)]);
      },
    });
    // The proxy — not the wrapped binding — is what callers pass to
    // `model`/`when`/`each`/`getBindingMeta`. The WeakMap is keyed by object
    // identity and can't see through the proxy, so mirror the terminal
    // binding's meta onto the proxy itself.
    if (binding) bindingMeta.set(proxy, getBindingMeta(binding));
    return proxy;
  };
  return build([]);
}
