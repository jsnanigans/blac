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
  readonly __blacBinding: true;
  readonly bloc: StateContainer;
  readonly read: ReadFn<any, T>;
  map<U>(fn: (value: T) => U): Binding<U>;
}

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
  return Object.assign(result, {
    __blacBinding: true as const,
    bloc,
    read: readFn,
    map<U>(fn: (v: T) => U): Binding<U> {
      return makeBinding<U>(bloc, (s, b) => fn(readFn(s, b)));
    },
  }) as Binding<T>;
}

/** Reactive selector: subscribes to exactly the paths the read touches (getters included). */
export function select<S = any, T = unknown>(
  bloc: StateContainer,
  readFn: (state: S, bloc: any) => T,
): Binding<T> {
  return makeBinding<T>(bloc, readFn as ReadFn<any, T>);
}

export function isBinding(v: unknown): v is Binding {
  return (
    typeof v === 'object' && v !== null && (v as any).__blacBinding === true
  );
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
    return new Proxy(binding ?? (Object.create(null) as object), {
      get(_t, prop) {
        if (
          prop === '_$litDirective$' ||
          prop === 'values' ||
          prop === '__blacBinding' ||
          prop === 'bloc' ||
          prop === 'read' ||
          prop === 'map' ||
          typeof prop === 'symbol'
        ) {
          return binding ? (binding as any)[prop] : undefined;
        }
        return build([...path, String(prop)]);
      },
    });
  };
  return build([]);
}
