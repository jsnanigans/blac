// StructuralContainer.patch() throughput — the no-diff path. patch derives the
// dirty PathSet straight from the partial's shape, deep-merges, and marks.
import { StructuralContainer } from '../../../packages/dirtytalk-structural/dist/index.js';
import { SyncScheduler } from '../../../packages/dirtytalk-engine/dist/index.js';
import { done, iterations } from '../_bench.mjs';

const ITERS = iterations(500_000);

class Store extends StructuralContainer {
  constructor() {
    super(
      { count: 0, label: 'x', nested: { a: 1, b: 2 } },
      { scheduler: new SyncScheduler() },
    );
  }
}

const store = new Store();

for (let i = 0; i < ITERS; i++) {
  store.patch({ count: i });
}

done('patch', ITERS);
