// PathInterner throughput: repeated interning of a bounded path vocabulary
// (the steady-state case — paths already interned, so it's mostly Map hits)
// plus periodic fresh inserts.
import { PathInterner } from '../../../packages/dirtytalk-structural/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const VOCAB = 1000;
const ITERS = iterations(2_000_000);

const paths = [];
for (let i = 0; i < VOCAB; i++) paths.push(`a.b${i % 10}.c${i}`);

const interner = new PathInterner();
// Warm the vocabulary so the measured loop is mostly hits.
for (const p of paths) interner.intern(p);

for (let i = 0; i < ITERS; i++) {
  blackhole(interner.intern(paths[i % VOCAB]));
}

done(`intern(vocab=${VOCAB})`, ITERS);
