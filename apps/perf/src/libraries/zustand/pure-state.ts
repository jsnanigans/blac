import { createStore } from 'zustand';
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

// Zustand notifies synchronously on every `setState`, so no op needs a flush.

interface ListState {
  data: DataItem[];
  selected: number | null;
}

const listStore = (data: DataItem[] = [], selected: number | null = null) =>
  createStore<ListState>(() => ({ data, selected }));

const counterStore = () => createStore<{ count: number }>(() => ({ count: 0 }));

const sumFields = (s: WideState): number => {
  let sum = 0;
  for (let j = 0; j < WIDE_FIELDS; j++) sum += s[fieldKey(j)];
  return sum;
};

export const zustandPureState: PureStateLibrary = {
  name: 'Zustand',
  ops: {
    'create 1k': op({
      setup: () => ({ s: listStore(), rows: buildData(1000) }),
      run: ({ s, rows }) => s.setState({ data: rows, selected: null }),
    }),
    'append 1k': op({
      setup: () => {
        const base = buildData(1000);
        return { s: listStore(base), base, more: buildData(1000) };
      },
      run: ({ s, base, more }) => s.setState({ data: [...base, ...more] }),
    }),
    'update every 10th': op({
      setup: () => listStore(buildData(1000)),
      run: (s) =>
        s.setState((st) => ({ data: listOps.updateEvery10th(st.data) })),
    }),
    clear: op({
      setup: () => ({ s: listStore(), rows: buildData(1000) }),
      run: ({ s, rows }) => {
        s.setState({ data: rows, selected: null });
        s.setState({ data: [], selected: null });
      },
    }),

    'redundant emit': op({
      setup: () => listStore(buildData(100)),
      run: (s) => {
        const snapshot = s.getState();
        for (let i = 0; i < 1000; i++) s.setState(snapshot, true);
      },
    }),
    // A partial is a new object, so Zustand notifies every time.
    'redundant patch': op({
      setup: () => listStore(buildData(100), 5),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.setState({ selected: 5 });
      },
    }),
    'patch 1 of 20 fields': op({
      setup: () => createStore<WideState>(createWideState),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.setState({ field10: i });
      },
    }),
    'nested object update': op({
      setup: () => createStore<NestedState>(createNestedState),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          const user = s.getState().user;
          s.setState({
            user: { ...user, profile: { ...user.profile, age: i } },
          });
        }
      },
    }),
    'batch rapid updates': op({
      setup: () => {
        const s = counterStore();
        s.subscribe((st) => void st.count);
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.setState({ count: i });
      },
    }),
    'same-tick burst 1000 (tracked consumer)': op({
      setup: () => {
        const s = createStore<WideState>(createWideState);
        let prev = s.getState().field0;
        s.subscribe((st) => {
          if (st.field0 !== prev) prev = st.field0;
        });
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.setState({ field0: i });
      },
    }),

    'notify 100 subscribers': op({
      setup: () => {
        const s = listStore();
        for (let i = 0; i < 100; i++) s.subscribe(() => {});
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 100; i++) s.setState({ selected: i });
      },
    }),
    'subscriber with computed filter': op({
      setup: () => {
        const s = listStore();
        const hits = { n: 0 };
        for (let i = 0; i < 10; i++) {
          const threshold = (i + 1) * 10;
          s.subscribe(({ selected }) => {
            if (selected !== null && selected >= threshold) hits.n++;
          });
        }
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.setState({ selected: i % 100 });
      },
    }),
    'multi-store coordination': op({
      setup: () => {
        const stores = [0, 1, 2].map(counterStore);
        for (const s of stores) s.subscribe(() => {});
        return stores;
      },
      run: ([a, b, c]) => {
        for (let i = 0; i < 1000; i++) {
          a.setState({ count: i });
          b.setState({ count: a.getState().count * 2 });
          c.setState({ count: a.getState().count + b.getState().count });
        }
      },
    }),
    // Each row subscriber compares its own item, as a `useStore` selector does.
    '1 of 1,000 row subscribers': op({
      setup: () => {
        const s = listStore(buildData(ROWS));
        for (let i = 0; i < ROWS; i++) {
          let prev = s.getState().data[i];
          s.subscribe((st) => {
            const item = st.data[i];
            if (item !== prev) {
              prev = item;
              void item.label;
            }
          });
        }
        return s;
      },
      run: (s) => {
        for (let i = 0; i < ROW_UPDATES; i++) {
          s.setState((st) => ({
            data: listOps.relabel(st.data, (i * 7) % ROWS),
          }));
        }
      },
    }),

    'read 20 fields (baseline)': op({
      setup: () => createStore<WideState>(createWideState),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          const state = s.getState();
          for (let j = 0; j < WIDE_FIELDS; j++) void state[fieldKey(j)];
        }
      },
    }),
    'getter track simple': op({
      setup: () => counterStore(),
      run: (s) => {
        const doubled = (st: { count: number }) => st.count * 2;
        for (let i = 0; i < 1000; i++) {
          s.setState({ count: i });
          void doubled(s.getState());
        }
      },
    }),
    'getter track wide aggregate': op({
      setup: () => createStore<WideState>(createWideState),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.setState({ field0: i });
          void sumFields(s.getState());
        }
      },
    }),
  },
  retain: (n) => {
    const stores = Array.from({ length: n }, counterStore);
    return () => {
      stores.length = 0;
    };
  },
};
