import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { buildData, resetId } from '../../shared/data';
import type {
  CounterState,
  DataItem,
  NestedState,
  PureStateBenchmark,
  WideState,
} from '../../shared/types';
import { createNestedState, createWideState } from '../../shared/types';

// --- Demo slice (list operations) ---

interface DemoState {
  data: DataItem[];
  selected: number | null;
}

const demoInitial: DemoState = { data: [], selected: null };

const demoSlice = createSlice({
  name: 'demo',
  initialState: demoInitial,
  reducers: {
    setData(
      state,
      action: PayloadAction<{ data: DataItem[]; selected: number | null }>,
    ) {
      state.data = action.payload.data;
      state.selected = action.payload.selected;
    },
    updateEveryTenth(state) {
      for (let i = 0, len = state.data.length; i < len; i += 10) {
        state.data[i] = {
          id: state.data[i].id,
          label: state.data[i].label + ' !!!',
        };
      }
    },
    appendData(state, action: PayloadAction<DataItem[]>) {
      state.data.push(...action.payload);
    },
    clear(state) {
      state.data = [];
      state.selected = null;
    },
    setSelected(state, action: PayloadAction<number | null>) {
      state.selected = action.payload;
    },
  },
});

// --- Wide slice (20 fields) ---

const wideSlice = createSlice({
  name: 'wide',
  initialState: createWideState() as WideState,
  reducers: {
    setField10(state, action: PayloadAction<number>) {
      state.field10 = action.payload;
    },
  },
});

// --- Nested slice ---

const nestedSlice = createSlice({
  name: 'nested',
  initialState: createNestedState() as NestedState,
  reducers: {
    setValue(state, action: PayloadAction<number>) {
      state.a.b.c.value = action.payload;
    },
  },
});

// --- Counter slice ---

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 } as CounterState,
  reducers: {
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
  },
});

const sourceSlice = createSlice({
  name: 'source',
  initialState: { value: 0 },
  reducers: {
    setValue(state, action: PayloadAction<number>) {
      state.value = action.payload;
    },
  },
});

const counterASlice = createSlice({
  name: 'counterA',
  initialState: { count: 0 } as CounterState,
  reducers: {
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
  },
});

const counterBSlice = createSlice({
  name: 'counterB',
  initialState: { count: 0 } as CounterState,
  reducers: {
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
  },
});

const counterCSlice = createSlice({
  name: 'counterC',
  initialState: { count: 0 } as CounterState,
  reducers: {
    setCount(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
  },
});

function createBenchmarkStore() {
  return configureStore({
    reducer: {
      demo: demoSlice.reducer,
      wide: wideSlice.reducer,
      nested: nestedSlice.reducer,
      counter: counterSlice.reducer,
      source: sourceSlice.reducer,
      counterA: counterASlice.reducer,
      counterB: counterBSlice.reducer,
      counterC: counterCSlice.reducer,
    },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}

type BenchmarkStore = ReturnType<typeof createBenchmarkStore>;

export const reduxToolkitPureState: PureStateBenchmark = {
  name: 'Redux Toolkit',
  setup: () => {
    resetId();
    return createBenchmarkStore();
  },
  operations: {
    // ── CRUD Operations ──

    'create 1k': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(1000), selected: null }),
      );
    },
    'update every 10th': (h) => {
      const store = h as BenchmarkStore;
      if (store.getState().demo.data.length === 0) {
        store.dispatch(
          demoSlice.actions.setData({ data: buildData(1000), selected: null }),
        );
      }
      store.dispatch(demoSlice.actions.updateEveryTenth());
    },
    'append 1k': (h) => {
      const store = h as BenchmarkStore;
      if (store.getState().demo.data.length === 0) {
        store.dispatch(
          demoSlice.actions.setData({ data: buildData(1000), selected: null }),
        );
      }
      store.dispatch(demoSlice.actions.appendData(buildData(1000)));
    },
    clear: (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(1000), selected: null }),
      );
      store.dispatch(demoSlice.actions.clear());
    },

    // ── State Update Patterns ──

    'redundant emit': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(100), selected: null }),
      );
      const snapshot = store.getState().demo;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(
          demoSlice.actions.setData({
            data: snapshot.data,
            selected: snapshot.selected,
          }),
        );
      }
    },
    'redundant patch': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(100), selected: 5 }),
      );
      for (let i = 0; i < 1000; i++) {
        store.dispatch(demoSlice.actions.setSelected(5));
      }
    },
    'patch 1 of 20 fields': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(wideSlice.actions.setField10(i));
      }
    },
    'nested object update': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(nestedSlice.actions.setValue(i));
      }
    },
    'batch rapid updates': (h) => {
      const store = h as BenchmarkStore;
      let total = 0;
      const unsub = store.subscribe(() => {
        total += store.getState().counter.count;
      });
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterSlice.actions.setCount(i));
      }
      unsub();
      void total;
    },

    // ── Same-tick burst (scoped subscriber) ──
    //
    // Counterpart to Blac's path-scoped consumer: a subscriber reading one
    // field. 1000 synchronous dispatches in one tick.
    'same-tick burst 1000 (tracked consumer)': (h) => {
      const store = h as BenchmarkStore;
      let seen = 0;
      const unsub = store.subscribe(() => {
        seen += store.getState().wide.field10;
      });
      for (let i = 0; i < 1000; i++) {
        store.dispatch(wideSlice.actions.setField10(i));
      }
      unsub();
      void seen;
    },

    // ── Subscription & Notification ──

    'notify 100 subscribers': (h) => {
      const store = h as BenchmarkStore;
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        unsubs.push(store.subscribe(() => {}));
      }
      for (let i = 0; i < 100; i++) {
        store.dispatch(demoSlice.actions.setData({ data: [], selected: i }));
      }
      unsubs.forEach((u) => u());
    },
    'subscriber with computed filter': (h) => {
      const store = h as BenchmarkStore;
      let hitCount = 0;
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        const threshold = (i + 1) * 10;
        unsubs.push(
          store.subscribe(() => {
            const selected = store.getState().demo.selected;
            if (selected !== null && selected >= threshold) {
              hitCount++;
            }
          }),
        );
      }
      for (let i = 0; i < 1000; i++) {
        store.dispatch(
          demoSlice.actions.setData({ data: [], selected: i % 100 }),
        );
      }
      unsubs.forEach((u) => u());
      void hitCount;
    },

    // ── Derived & Cross-Store ──

    'derived state computation': (h) => {
      const store = h as BenchmarkStore;
      const selectDerived = createSelector(
        (state: ReturnType<BenchmarkStore['getState']>) => state.source.value,
        (value) => value * 2,
      );
      for (let i = 0; i < 1000; i++) {
        store.dispatch(sourceSlice.actions.setValue(i));
        void selectDerived(store.getState());
      }
    },
    'multi-store coordination': (h) => {
      const store = h as BenchmarkStore;
      let notifications = 0;
      const unsub = store.subscribe(() => {
        notifications++;
      });
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterASlice.actions.setCount(i));
        store.dispatch(
          counterBSlice.actions.setCount(store.getState().counterA.count * 2),
        );
        store.dispatch(
          counterCSlice.actions.setCount(
            store.getState().counterA.count + store.getState().counterB.count,
          ),
        );
      }
      unsub();
      void notifications;
    },

    // ── Proxy Tracking Overhead (raw state access) ──

    'proxy track 1 field': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterSlice.actions.setCount(i));
        void store.getState().counter.count;
      }
    },
    // Pure read cost: `.state`/`getState()` is an O(1) field read in every
    // library here, so this measures the 20 dynamic `field${j}` string lookups
    // in this loop, not library machinery. Kept as a shared baseline.
    'read 20 fields (baseline)': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        const s = store.getState().wide;
        for (let j = 0; j < 20; j++) {
          void s[`field${j}` as keyof WideState];
        }
      }
    },

    // ── Getter Tracking (selectors) ──

    'getter track simple': (h) => {
      const store = h as BenchmarkStore;
      const selectDoubled = createSelector(
        (state: ReturnType<BenchmarkStore['getState']>) => state.counter.count,
        (count) => count * 2,
      );
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterSlice.actions.setCount(i));
        void selectDoubled(store.getState());
      }
    },
    'getter track wide aggregate': (h) => {
      const store = h as BenchmarkStore;
      const selectSum = createSelector(
        (state: ReturnType<BenchmarkStore['getState']>) => state.wide,
        (wide) => {
          let sum = 0;
          for (let j = 0; j < 20; j++) {
            sum += wide[`field${j}` as keyof WideState] as number;
          }
          return sum;
        },
      );
      for (let i = 0; i < 1000; i++) {
        store.dispatch(wideSlice.actions.setField10(i));
        void selectSum(store.getState());
      }
    },

    // ── Registry Lifecycle (store create + destroy) ──

    'acquire/release cycle': () => {
      for (let i = 0; i < 1000; i++) {
        const s = createBenchmarkStore();
        void s.getState();
      }
    },
    'instance create/dispose': () => {
      for (let i = 0; i < 1000; i++) {
        const s = createBenchmarkStore();
        void s.getState();
      }
    },
  },
  retain: (n) => {
    const stores = Array.from({ length: n }, () =>
      configureStore({ reducer: { counter: counterSlice.reducer } }),
    );
    return () => {
      stores.length = 0;
    };
  },
};
