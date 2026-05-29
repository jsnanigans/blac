// trackRender proxy-recording cost: wrap state, read a handful of nested paths
// (as a component render would), and collect the accessed PathSet. Fresh proxy
// + path set per call, matching the per-render lifecycle.
import {
  PathInterner,
  trackRender,
} from '../../../packages/dirtytalk-structural/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const ITERS = iterations(200_000);

const state = {
  user: { name: 'ada', email: 'ada@x.dev', prefs: { theme: 'dark' } },
  count: 0,
  items: [1, 2, 3, 4, 5],
};

// Per-class interner is shared across renders in real usage.
const interner = new PathInterner();

for (let i = 0; i < ITERS; i++) {
  const { value, paths } = trackRender(state, interner);
  // Simulate a render reading several paths, including nested + an array.
  blackhole(value.user.name.length);
  blackhole(value.user.prefs.theme.length);
  blackhole(value.count);
  blackhole(value.items.length);
  blackhole(paths.size);
}

done('track-render', ITERS);
