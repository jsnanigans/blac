// DirtyChannel mark + flush where many subscribers each watch a distinct key
// and a single mark intersects only one of them. Measures the per-flush
// interest-scan cost across N subscribers (the selectivity case — the whole
// point of the engine).
import {
  DirtyChannel,
  SyncScheduler,
} from '../../../packages/dirtytalk-engine/dist/index.js';
import { blackhole, done, iterations } from '../_bench.mjs';

const SUBSCRIBERS = 1000;
const MARKS = iterations(10_000);

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

const channel = new DirtyChannel(StringSetSpace, new SyncScheduler());

// Each subscriber watches its own unique key.
const interests = [];
for (let i = 0; i < SUBSCRIBERS; i++) {
  const interest = new Set([`key:${i}`]);
  interests.push(interest);
  channel.subscribe(
    () => interest,
    (dirty) => blackhole(dirty.size),
  );
}

// Every mark targets exactly one subscriber; the flush still evaluates every
// interest thunk to decide who cares.
for (let i = 0; i < MARKS; i++) {
  channel.mark(new Set([`key:${i % SUBSCRIBERS}`]));
}

done(`channel-selective(subs=${SUBSCRIBERS})`, MARKS);
