// Signal set + synchronous notify throughput, with one subscriber.
import { Signal } from '../../../packages/dirtytalk-engine/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const ITERS = iterations(2_000_000);

const s = new Signal(0);
const unsub = s.subscribe((v) => blackhole(v));

for (let i = 0; i < ITERS; i++) {
  s.value = i; // each set runs the Object.is check + notifies the subscriber
}

unsub();
done('signal-set-notify', ITERS);
