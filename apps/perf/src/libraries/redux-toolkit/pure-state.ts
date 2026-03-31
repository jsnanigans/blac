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
    'create 1k': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(1000), selected: null }),
      );
    },
    'create 10k': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(10000), selected: null }),
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

    // --- Real-world scenarios ---

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
    'rapid counter': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterSlice.actions.setCount(i));
      }
    },
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
    'nested object update': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(nestedSlice.actions.setValue(i));
      }
    },
    'selective subscription': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(100), selected: null }),
      );
      let selectedChanges = 0;
      const unsub = store.subscribe(() => {
        if (store.getState().demo.selected !== null) selectedChanges++;
      });
      for (let i = 0; i < 1000; i++) {
        store.dispatch(
          demoSlice.actions.setData({ data: buildData(100), selected: null }),
        );
      }
      unsub();
      void selectedChanges;
    },
    'derived state read': (h) => {
      const store = h as BenchmarkStore;
      const selectDerived = createSelector(
        (state: ReturnType<BenchmarkStore['getState']>) => state.source.value,
        (value) => value * 2,
      );
      for (let i = 0; i < 1000; i++) {
        store.dispatch(sourceSlice.actions.setValue(i));
        selectDerived(store.getState());
      }
    },
    'multi-store coordination': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        store.dispatch(counterASlice.actions.setCount(i));
        store.dispatch(counterBSlice.actions.setCount(i * 2));
        store.dispatch(counterCSlice.actions.setCount(i * 3));
      }
    },
    'subscribe/unsubscribe churn': (h) => {
      const store = h as BenchmarkStore;
      for (let i = 0; i < 1000; i++) {
        const unsub = store.subscribe(() => {});
        unsub();
      }
    },
    'listener with selector filter': (h) => {
      const store = h as BenchmarkStore;
      store.dispatch(
        demoSlice.actions.setData({ data: buildData(100), selected: null }),
      );
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        const threshold = i * 100;
        unsubs.push(
          store.subscribe(() => {
            if (store.getState().demo.data.length > threshold) {
              /* filtered hit */
            }
          }),
        );
      }
      for (let i = 0; i < 1000; i++) {
        store.dispatch(
          demoSlice.actions.setData({ data: buildData(100), selected: i }),
        );
      }
      unsubs.forEach((u) => u());
    },
  },
};
