// DirtyChannel mark + flush where every subscriber is interested in the marked
// key. Measures delivery cost across N subscribers (the broadcast case).
import {
  DirtyChannel,
  SyncScheduler,
} from '../../../packages/dirtytalk-engine/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const SUBSCRIBERS = 100;
const MARKS = iterations(50_000);

// Minimal Set<string> Space (mirrors the engine README example).
const StringSetSpace = {
  empty: () => new Set(),
  isEmpty: (r) => r.size === 0,
  union: (a, b) => {
    for (const k of b) a.add(k);
    return a;
  },
  intersects: (interest, dirty) => {
    for (const k of interest) if (dirty.has(k)) return true;
    return false;
  },
};

// SyncScheduler flushes inline on every mark, so each mark = one full flush.
const channel = new DirtyChannel(StringSetSpace, new SyncScheduler());

const hot = new Set(['hot']);
for (let i = 0; i < SUBSCRIBERS; i++) {
  channel.subscribe(
    () => hot, // all subscribers interested in the same key
    (dirty) => blackhole(dirty.size),
  );
}

for (let i = 0; i < MARKS; i++) {
  channel.mark(new Set(['hot'])); // intersects all SUBSCRIBERS → all fire
}

done(`channel-broadcast(subs=${SUBSCRIBERS})`, MARKS);
