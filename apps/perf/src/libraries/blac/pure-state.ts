import { ALL_PATHS, Cubit, acquire, configureBlac, release } from '@blac/core';
import { ManualScheduler } from '@dirtytalk/engine';
import { expandWithAncestors } from '@dirtytalk/structural';
import { buildData } from '../../shared/data';
import { listOps } from '../../shared/list';
import { ROWS, ROW_UPDATES, op } from '../../shared/pure';
import {
  WIDE_FIELDS,
  createNestedState,
  createWideState,
  fieldKey,
  type DataItem,
  type NestedState,
  type PureStateLibrary,
  type WideState,
} from '../../shared/types';

// Several ops emit 1000× in a tight loop; the dev-only runaway-emit guard is a
// soft warning, not something to measure.
configureBlac({ maxEmitsPerSecond: Number.POSITIVE_INFINITY });

// `pump()` runs the same flush the default microtask scheduler would, but
// synchronously, so notification cost lands inside the timed loop without an
// `await` per update.
const scheduler = new ManualScheduler();
const flush = (): void => scheduler.pump();

const live: Cubit[] = [];
const track = <C extends Cubit>(c: C): C => {
  live.push(c);
  return c;
};
const teardown = (): void => {
  flush();
  for (const c of live.splice(0)) c.dispose();
};

interface ListState {
  data: DataItem[];
  selected: number | null;
}

class ListStore extends Cubit<ListState> {
  constructor(data: DataItem[] = [], selected: number | null = null) {
    super({ data, selected }, { scheduler });
  }
}

class WideStore extends Cubit<WideState> {
  constructor() {
    super(createWideState(), { scheduler });
  }
  get sum(): number {
    let s = 0;
    for (let i = 0; i < WIDE_FIELDS; i++) s += this.state[fieldKey(i)];
    return s;
  }
}

class NestedStore extends Cubit<NestedState> {
  constructor() {
    super(createNestedState(), { scheduler });
  }
}

class CounterStore extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }, { scheduler });
  }
  get doubled(): number {
    return this.state.count * 2;
  }
}

// Registry ops use the defaults a real app gets.
class KeyedCounter extends Cubit<{ count: number }, { id: string }> {
  static key = (a: { id: string }) => a.id;
  constructor() {
    super({ count: 0 });
  }
}

class PlainCounter extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

const onAll = (c: Cubit, cb: () => void): void => {
  c.subscribe(() => ALL_PATHS, cb);
};

/** A consumer watching `path`, registered the way `useBloc` does it. */
const watchPath = (c: Cubit, id: string, path: string, cb: () => void) => {
  const paths = new Set([c.interner.intern(path)]);
  c.registerConsumerPaths(id, paths);
  c.subscribePaths(cb).setInterest(expandWithAncestors(paths, c.interner));
};

export const blacPureState: PureStateLibrary = {
  name: 'Blac',
  ops: {
    'create 1k': op({
      setup: () => ({ s: track(new ListStore()), rows: buildData(1000) }),
      run: ({ s, rows }) => s.emit({ data: rows, selected: null }),
      teardown,
    }),
    'append 1k': op({
      setup: () => {
        const base = buildData(1000);
        return { s: track(new ListStore(base)), base, more: buildData(1000) };
      },
      // Appends to the same base each call, so repeated calls cost the same.
      run: ({ s, base, more }) => s.patch({ data: [...base, ...more] }),
      teardown,
    }),
    'update every 10th': op({
      setup: () => track(new ListStore(buildData(1000))),
      run: (s) => s.patch({ data: listOps.updateEvery10th(s.state.data) }),
      teardown,
    }),
    clear: op({
      setup: () => ({ s: track(new ListStore()), rows: buildData(1000) }),
      run: ({ s, rows }) => {
        s.emit({ data: rows, selected: null });
        s.emit({ data: [], selected: null });
      },
      teardown,
    }),

    'redundant emit': op({
      setup: () => track(new ListStore(buildData(100))),
      run: (s) => {
        const snapshot = s.state;
        for (let i = 0; i < 1000; i++) s.emit(snapshot);
      },
      teardown,
    }),
    'redundant patch': op({
      setup: () => track(new ListStore(buildData(100), 5)),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.patch({ selected: 5 });
      },
      teardown,
    }),
    'patch 1 of 20 fields': op({
      setup: () => track(new WideStore()),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.patch({ field10: i });
      },
      teardown,
    }),
    'nested object update': op({
      setup: () => track(new NestedStore()),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          const user = s.state.user;
          s.emit({ user: { ...user, profile: { ...user.profile, age: i } } });
        }
      },
      teardown,
    }),
    // One tick: the flush coalesces the burst into one notification.
    'batch rapid updates': op({
      setup: () => {
        const s = track(new CounterStore());
        onAll(s, () => void s.state.count);
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.patch({ count: i });
        flush();
      },
      teardown,
    }),
    'same-tick burst 1000 (tracked consumer)': op({
      setup: () => {
        const s = track(new WideStore());
        watchPath(s, 'bench', 'field0', () => void s.state.field0);
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.patch({ field0: i });
        flush();
      },
      teardown,
    }),

    'notify 100 subscribers': op({
      setup: () => {
        const s = track(new ListStore());
        for (let i = 0; i < 100; i++) onAll(s, () => {});
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 100; i++) {
          s.patch({ selected: i });
          flush();
        }
      },
      teardown,
    }),
    'subscriber with computed filter': op({
      setup: () => {
        const s = track(new ListStore());
        const hits = { n: 0 };
        for (let i = 0; i < 10; i++) {
          const threshold = (i + 1) * 10;
          onAll(s, () => {
            const { selected } = s.state;
            if (selected !== null && selected >= threshold) hits.n++;
          });
        }
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.patch({ selected: i % 100 });
          flush();
        }
      },
      teardown,
    }),
    'multi-store coordination': op({
      setup: () => {
        const stores = [0, 1, 2].map(() => track(new CounterStore()));
        for (const s of stores) onAll(s, () => {});
        return stores;
      },
      run: ([a, b, c]) => {
        for (let i = 0; i < 1000; i++) {
          a.patch({ count: i });
          b.patch({ count: a.state.count * 2 });
          c.patch({ count: a.state.count + b.state.count });
          flush();
        }
      },
      teardown,
    }),
    '1 of 1,000 row subscribers': op({
      setup: () => {
        const s = track(new ListStore(buildData(ROWS)));
        for (let i = 0; i < ROWS; i++) {
          watchPath(s, `row${i}`, `data.${i}.label`, () => {
            void s.state.data[i].label;
          });
        }
        return s;
      },
      run: (s) => {
        for (let i = 0; i < ROW_UPDATES; i++) {
          s.patch({ data: listOps.relabel(s.state.data, (i * 7) % ROWS) });
          flush();
        }
      },
      teardown,
    }),

    'read 20 fields (baseline)': op({
      setup: () => track(new WideStore()),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          const state = s.state;
          for (let j = 0; j < WIDE_FIELDS; j++) void state[fieldKey(j)];
        }
      },
      teardown,
    }),
    // Blac getters are plain class accessors over `this.state`.
    'getter track simple': op({
      setup: () => track(new CounterStore()),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.emit({ count: i });
          void s.doubled;
        }
      },
      teardown,
    }),
    'getter track wide aggregate': op({
      setup: () => track(new WideStore()),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.patch({ field0: i });
          void s.sum;
        }
      },
      teardown,
    }),

    'acquire/release cycle': op({
      setup: () => undefined,
      run: () => {
        for (let i = 0; i < 1000; i++) {
          const ref = { args: { id: `bench-${i}` }, refId: `bench-${i}` };
          acquire(KeyedCounter, ref);
          release(KeyedCounter, ref);
        }
      },
    }),
    'instance create/dispose': op({
      setup: () => undefined,
      run: () => {
        for (let i = 0; i < 1000; i++) new PlainCounter().dispose();
      },
    }),
  },
  retain: (n) => {
    const blocs = Array.from({ length: n }, () => new PlainCounter());
    return () => blocs.forEach((b) => b.dispose());
  },
};
