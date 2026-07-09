import { nothing } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { bind, type Binding } from './live';

/** Swap templates on a boolean-ish Binding. */
export function when(
  condition: Binding,
  then: () => unknown,
  otherwise?: () => unknown,
): unknown {
  return bind(condition.bloc, condition.read, (v) =>
    v ? then() : otherwise ? otherwise() : nothing,
  );
}

/** Keyed list from an array Binding. */
export function each<T>(
  list: Binding<readonly T[]>,
  renderItem: (item: T, index: number) => unknown,
  key?: (item: T, index: number) => unknown,
): unknown {
  return bind(list.bloc, list.read, (arr: readonly T[]) =>
    key
      ? repeat(arr ?? [], key, renderItem)
      : repeat(arr ?? [], renderItem as any),
  );
}

/** Switch on a Binding's value. */
export function match<K extends string | number>(
  selector: Binding<K>,
  cases: Partial<Record<K, () => unknown>>,
  fallback?: () => unknown,
): unknown {
  return bind(selector.bloc, selector.read, (v: K) => {
    const c = cases[v];
    return c ? c() : fallback ? fallback() : nothing;
  });
}
