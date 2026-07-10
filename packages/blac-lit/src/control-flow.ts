import { nothing } from 'lit-html';
import { directive } from 'lit-html/directive.js';
import { AsyncDirective } from 'lit-html/async-directive.js';
import { repeat } from 'lit-html/directives/repeat.js';
import type { StateContainer } from '@blac/core';
import { bind, getBindingMeta, type Binding } from './live';
import { BindingSession } from './internal/binding-session';

/** Swap templates on a boolean-ish Binding. */
export function when(
  condition: Binding,
  then: () => unknown,
  otherwise?: () => unknown,
): unknown {
  const { bloc, read } = getBindingMeta(condition);
  return bind(bloc, read, (v) =>
    v ? then() : otherwise ? otherwise() : nothing,
  );
}

type RenderItem = (item: any, index: number) => unknown;
type KeyFn = (item: any, index: number) => unknown;

/**
 * Keyed-list directive backing `each`. Beyond the normal reactive projection,
 * it defends against a lit-html 3.3.3 `repeat` bug: `removePart` removes only an
 * item ChildPart's `_$startNode` and `_$clear` stops at `_$endNode`, so every
 * removed key orphans one `_$endNode` comment in the live DOM. When a keyed
 * list's key set fully turns over (0 overlap) without ever emptying — the
 * benchmark's "replace with all-new ids" pattern — those orphans accumulate in
 * the container unbounded and slow every subsequent reconcile. On such a
 * turnover we commit `nothing` first (clearing this part sweeps every orphan)
 * before committing the fresh `repeat`. Partial updates keep some keys and skip
 * the collapse, preserving `repeat`'s move/reuse fast-path.
 */
class EachDirective extends AsyncDirective {
  private readFn!: (state: unknown, bloc: unknown) => readonly unknown[];
  private renderItem!: RenderItem;
  private keyFn?: KeyFn;
  private prevKeys: Set<unknown> | null = null;
  private readonly session = new BindingSession<readonly unknown[]>((arr) =>
    this.apply(arr),
  );

  render(
    bloc: StateContainer,
    readFn: (state: unknown, bloc: unknown) => readonly unknown[],
    renderItem: RenderItem,
    keyFn?: KeyFn,
  ): unknown {
    this.readFn = readFn;
    this.renderItem = renderItem;
    this.keyFn = keyFn;
    const arr = this.session.compute(bloc, (state, trackedBloc) =>
      this.readFn(state, trackedBloc),
    );
    if (this.isConnected) this.session.connect();
    this.prevKeys = this.computeKeys(arr);
    return this.build(arr);
  }

  private apply(arr: readonly unknown[]): void {
    const newKeys = this.computeKeys(arr);
    const turnover =
      !!this.keyFn &&
      newKeys !== null &&
      this.prevKeys !== null &&
      this.prevKeys.size > 0 &&
      arr.length > 0 &&
      this.isDisjoint(this.prevKeys, newKeys);
    this.prevKeys = newKeys;
    // Collapse to `nothing` first on a full key turnover so lit clears this
    // part and sweeps the orphaned `_$endNode` markers before the fresh repeat.
    if (turnover) this.setValue(nothing);
    this.setValue(this.build(arr));
  }

  private build(arr: readonly unknown[]): unknown {
    // Empty list also collapses to `nothing` (not `repeat([])`): an emptied but
    // still-alive `repeat` persists in the part and holds removed ChildParts;
    // tearing it down lets the next non-empty render start from a clean part.
    if (!arr || arr.length === 0) return nothing;
    return this.keyFn
      ? repeat(arr, this.keyFn, this.renderItem)
      : repeat(arr, this.renderItem as any);
  }

  private computeKeys(arr: readonly unknown[]): Set<unknown> | null {
    if (!this.keyFn || !arr) return null;
    const keys = new Set<unknown>();
    for (let i = 0; i < arr.length; i++) keys.add(this.keyFn(arr[i], i));
    return keys;
  }

  private isDisjoint(a: Set<unknown>, b: Set<unknown>): boolean {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const k of small) if (large.has(k)) return false;
    return true;
  }

  protected disconnected(): void {
    this.session.disconnect();
  }

  protected reconnected(): void {
    this.session.reconnect();
  }
}

const eachDirective = directive(EachDirective);

/** Keyed list from an array Binding. */
export function each<T>(
  list: Binding<readonly T[]>,
  renderItem: (item: T, index: number) => unknown,
  key?: (item: T, index: number) => unknown,
): unknown {
  const { bloc, read } = getBindingMeta(list);
  return eachDirective(
    bloc,
    read as (state: unknown, bloc: unknown) => readonly unknown[],
    renderItem as RenderItem,
    key as KeyFn | undefined,
  );
}

/** Switch on a Binding's value. */
export function match<K extends string | number>(
  selector: Binding<K>,
  cases: Record<K, () => unknown>,
): unknown;
export function match<K extends string | number>(
  selector: Binding<K>,
  cases: Partial<Record<K, () => unknown>>,
  fallback: () => unknown,
): unknown;
export function match<K extends string | number>(
  selector: Binding<K>,
  cases: Partial<Record<K, () => unknown>>,
  fallback?: () => unknown,
): unknown {
  const { bloc, read } = getBindingMeta(selector);
  return bind(bloc, read, (v: K) => {
    const c = cases[v];
    return c ? c() : fallback ? fallback() : nothing;
  });
}
