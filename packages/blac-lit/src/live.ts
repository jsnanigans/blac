import { directive, type DirectiveResult } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import type { StateContainer } from '@blac/core';
import {
  asTrackable,
  expandWithAncestors,
  trackedBloc,
  trackRender,
  ProxyCache,
  emptyPathSet,
  type PathSet,
} from './internal/track';

export type ReadFn<S = any, T = unknown> = (state: S, bloc: any) => T;
export type ProjectFn = (value: any) => unknown;

/** A reactive value bound to a bloc. Renderable directly AND chainable via .map. */
export interface Binding<T = unknown> extends DirectiveResult {
  readonly __blacBinding: true;
  readonly bloc: StateContainer;
  readonly read: ReadFn<any, T>;
  map<U>(fn: (value: T) => U): Binding<U>;
}

class BindDirective extends AsyncDirective {
  private cache = new ProxyCache();
  private unsub?: () => void;
  private interest: PathSet = emptyPathSet();
  private bloc!: StateContainer;
  private readFn!: ReadFn;
  private project?: ProjectFn;

  render(bloc: StateContainer, readFn: ReadFn, project?: ProjectFn): unknown {
    this.bloc = bloc;
    this.readFn = readFn;
    this.project = project;
    const out = this.compute();
    if (this.isConnected && !this.unsub) this.subscribe();
    return out;
  }

  private compute(): unknown {
    const t = asTrackable(this.bloc);
    const tracked = trackRender(t.state, t.interner, this.cache);
    const value = this.readFn(
      tracked.value,
      trackedBloc(this.bloc, tracked.value),
    );
    queueMicrotask(tracked.disarm);
    this.interest = expandWithAncestors(tracked.paths, t.interner);
    return this.project ? this.project(value) : value;
  }

  private subscribe(): void {
    this.unsub = asTrackable(this.bloc).channel.subscribe(
      () => this.interest,
      () => this.setValue(this.compute()),
    );
  }

  protected disconnected(): void {
    this.unsub?.();
    this.unsub = undefined;
  }
  protected reconnected(): void {
    this.subscribe();
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
