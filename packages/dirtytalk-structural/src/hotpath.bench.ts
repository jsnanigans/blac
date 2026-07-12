import { bench, describe } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { StructuralContainer } from './container';
import {
  trackRender,
  ProxyCache,
  __setPersistTrackingProxies,
} from './tracker';
import { PathInterner } from './path-interner';

/**
 * Micro-benchmarks for the `@dirtytalk/structural` emit/patch/consumer-registry
 * hot paths flagged in `plans/dirtytalk-perf-stability`:
 *
 *   P4a — `emit`'s `diffAlongSkeleton` segment re-derivation cost on deep paths.
 *   P4b — `patch`'s `_refineAncestorMarks` startsWith-scan over the whole
 *         skeleton on every atomic-leaf (array) replacement.
 *   P5  — `registerConsumerPaths`/`unregisterConsumer`'s from-scratch
 *         `_recomputeSkeleton` union, O(consumers × paths) per call.
 *
 * Correctness gotchas honored throughout (a bench set up wrong measures ZERO
 * work):
 *   - `emit(next)` early-returns via `Object.is(state, next)`. Every benched
 *     emit alternates between two prebuilt distinct object references.
 *   - `patch(partial)` early-returns when `deepMerge` is reference-equal to
 *     `prev`. Array-leaf patches alternate two distinct array references
 *     (content may be equal — that's fine and intended).
 *   - The path interner is PER-CLASS (keyed by constructor via a WeakMap).
 *     Each scenario factory declares its own `class extends StructuralContainer`
 *     so scenarios never share interned paths.
 *   - No channel subscribers are registered anywhere in this file — we
 *     measure the diff/union computation only, not wake dispatch.
 *     `registerConsumerPaths` does not subscribe; it only feeds the skeleton.
 *   - Consumer ids are distinct strings (`'c' + i`) so `registerConsumerPaths`
 *     never hits its `pathSetEquals` fast-path skip.
 */

// ---------------------------------------------------------------------------
// P4a — emit / diffAlongSkeleton (deep-path segment re-derivation)
// ---------------------------------------------------------------------------

function emitScenario(K: number): () => void {
  class Box extends StructuralContainer<
    Record<string, { a: { b: { c: number } } }>
  > {}

  const initial: Record<string, { a: { b: { c: number } } }> = {};
  for (let i = 0; i < K; i++) {
    initial['e' + i] = { a: { b: { c: i } } };
  }

  const A = structuredClone(initial);
  const B = structuredClone(initial);
  for (let i = 0; i < K; i++) {
    B['e' + i].a.b.c += 1;
  }

  const c = new Box(structuredClone(initial), {
    scheduler: new SyncScheduler(),
  });
  for (let i = 0; i < K; i++) {
    c.registerConsumerPaths(
      'c' + i,
      new Set([c.interner.intern(`e${i}.a.b.c`)]),
    );
  }

  let flip = false;
  return () => {
    flip = !flip;
    c.emit(flip ? B : A);
  };
}

describe('P4a emit', () => {
  for (const K of [1, 10, 100, 1000]) {
    bench(`P4a emit — ${K} deep-path consumers`, emitScenario(K), {
      time: 500,
    });
  }
});

// ---------------------------------------------------------------------------
// P4b — patch / _refineAncestorMarks (startsWith-scans whole skeleton per
// array patch)
// ---------------------------------------------------------------------------

interface PatchState {
  items: { name: string; value: number }[];
  unrelated: Record<string, unknown>;
}

function patchScenario(size: number): () => void {
  class Box extends StructuralContainer<PatchState> {}

  const M = 20;
  const items = Array.from({ length: M }, (_, i) => ({
    name: 'n' + i,
    value: i,
  }));

  const unrelated: Record<string, unknown> = {};
  for (let g = 0; g < 8; g++) {
    unrelated['g' + g] = { deep: { leaf: g } };
  }

  const state0: PatchState = { items, unrelated };
  const c = new Box(state0, { scheduler: new SyncScheduler() });

  for (let j = 0; j < size; j++) {
    const path =
      j % 2 === 0
        ? `items.${j % M}.name` // descendant of the patched array
        : `unrelated.g${j % 8}.deep.leaf`; // non-descendant — rejected by startsWith
    c.registerConsumerPaths('c' + j, new Set([c.interner.intern(path)]));
  }

  const arrA = items.slice();
  const arrB = items.slice();

  let flip = false;
  return () => {
    flip = !flip;
    c.patch({ items: flip ? arrB : arrA });
  };
}

describe('P4b patch', () => {
  for (const size of [1, 10, 100, 500]) {
    bench(
      `P4b patch array-refine — ${size}-path skeleton`,
      patchScenario(size),
      {
        time: 500,
      },
    );
  }
});

// ---------------------------------------------------------------------------
// P5 — consumer-registry churn (O(N^2) from-scratch skeleton union on
// mount/unmount)
// ---------------------------------------------------------------------------

function registryScenario(N: number): () => void {
  class Box extends StructuralContainer<Record<string, number>> {}

  // Interner is per-class and shared across all containers created below, so
  // it's precomputed once outside the bench fn.
  const interner = StructuralContainer.getInternerFor(Box);
  const consumers: [string, Set<number>][] = Array.from(
    { length: N },
    (_, i) => ['c' + i, new Set([interner.intern('f' + i)])],
  );

  // Fully self-contained per iteration — measures the real mount->unmount
  // churn, which is what P5 targets. Each `registerConsumerPaths` triggers
  // `_recomputeSkeleton`, unioning ALL registered consumers from scratch.
  return () => {
    const c = new Box({}, { scheduler: new SyncScheduler() });
    for (const [id, paths] of consumers) c.registerConsumerPaths(id, paths);
    for (const [id] of consumers) c.unregisterConsumer(id);
  };
}

describe('P5 consumer-registry churn', () => {
  for (const N of [100, 500, 1000, 2000]) {
    bench(`P5 register+unregister — N=${N}`, registryScenario(N), {
      time: 500,
    });
  }
});

// ---------------------------------------------------------------------------
// PC1 — trackRender / ProxyCache (cross-render proxy reuse on array reorder)
// ---------------------------------------------------------------------------

function swapRowsScenario(n: number, persist: boolean): () => void {
  const interner = new PathInterner();
  const proxyCache = new ProxyCache();

  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, label: 'row' + i }));

  const original = { data: makeItems(n) };
  // Same item object references as `original`, with two positions swapped —
  // mirrors the js-framework-benchmark "swap rows" operation (indices 1, 998
  // for n=1000), matching apps/perf's swapRows exactly.
  const swappedData = original.data.slice();
  if (swappedData.length > 998) {
    const tmp = swappedData[1];
    swappedData[1] = swappedData[998];
    swappedData[998] = tmp;
  }
  const swapped = { data: swappedData };

  // Simulates the list component's render: read `.id` per item, as
  // `key={item.id}` does in apps/perf/src/libraries/blac/FrameworkBenchmark.tsx.
  const renderList = (state: typeof original): void => {
    __setPersistTrackingProxies(persist);
    const tracked = trackRender(
      state,
      interner,
      persist ? proxyCache : undefined,
    );
    for (const item of tracked.value.data) void item.id;
    tracked.disarm();
  };

  renderList(original); // seed: first "render" always allocates fresh proxies

  let flip = false;
  return () => {
    flip = !flip;
    renderList(flip ? swapped : original);
  };
}

describe('PC1 trackRender swap reuse', () => {
  for (const persist of [false, true]) {
    bench(
      `PC1 swap 998/1000 unchanged — persist=${persist}`,
      swapRowsScenario(1000, persist),
      { time: 500 },
    );
  }
});
