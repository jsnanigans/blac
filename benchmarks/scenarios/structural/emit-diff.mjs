// StructuralContainer.emit() with many consumers — exercises the
// diff-along-skeleton path (>=2 consumers, so the single-consumer ALL_PATHS
// skip does NOT fire). Each consumer reads a distinct field, so the skeleton
// is the union of all read paths and every emit diffs against it.
import {
  StructuralContainer,
  trackRender,
} from '../../../packages/dirtytalk-structural/dist/index.js';
import { SyncScheduler } from '../../../packages/dirtytalk-engine/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const CONSUMERS = 50;
const EMITS = iterations(20_000);

class Store extends StructuralContainer {
  constructor() {
    const initial = {};
    for (let i = 0; i < CONSUMERS; i++) initial[`f${i}`] = 0;
    super(initial, { scheduler: new SyncScheduler() });
  }
}

const store = new Store();

// Register CONSUMERS distinct consumers, each interested in one field, by
// recording its read path and subscribing with that interest.
for (let i = 0; i < CONSUMERS; i++) {
  const field = `f${i}`;
  const { value, paths } = trackRender(store.state, store.interner);
  blackhole(value[field]); // touch the field so the proxy records its path
  store.registerConsumerPaths(`c${i}`, paths);
  store.subscribe(
    () => paths,
    (dirty) => blackhole(typeof dirty === 'symbol' ? 1 : dirty.size),
  );
}

// Each emit replaces state changing exactly one field; the diff walks the full
// skeleton (CONSUMERS paths) to find the single changed one.
for (let i = 0; i < EMITS; i++) {
  const next = { ...store.state };
  next[`f${i % CONSUMERS}`] = i;
  store.emit(next);
}

done(`emit-diff(consumers=${CONSUMERS})`, EMITS);
