import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
  type Reducer,
} from '@reduxjs/toolkit';
import { buildData } from '../../shared/data';
import { ROWS, ROW_UPDATES, op } from '../../shared/pure';
import {
  WIDE_FIELDS,
  createNestedState,
  createWideState,
  fieldKey,
  type DataItem,
  type PureStateLibrary,
  type WideState,
} from '../../shared/types';

// Redux notifies synchronously on every dispatch, so no op needs a flush.
// Each op builds a store holding only the slice it uses.

interface ListState {
  data: DataItem[];
  selected: number | null;
}

const list = createSlice({
  name: 'list',
  initialState: { data: [], selected: null } as ListState,
  reducers: {
    set(_state, action: PayloadAction<ListState>) {
      return action.payload;
    },
    append(state, action: PayloadAction<DataItem[]>) {
      state.data.push(...action.payload);
    },
    updateEvery10th(state) {
      for (let i = 0; i < state.data.length; i += 10) {
        state.data[i].label += ' !!!';
      }
    },
    relabel(state, action: PayloadAction<number>) {
      state.data[action.payload].label += ' !!!';
    },
    select(state, action: PayloadAction<number | null>) {
      state.selected = action.payload;
    },
  },
});

const wide = createSlice({
  name: 'wide',
  initialState: createWideState(),
  reducers: {
    set(state, action: PayloadAction<{ field: number; value: number }>) {
      state[fieldKey(action.payload.field)] = action.payload.value;
    },
  },
});

const nested = createSlice({
  name: 'nested',
  initialState: createNestedState(),
  reducers: {
    setAge(state, action: PayloadAction<number>) {
      state.user.profile.age = action.payload;
    },
  },
});

const counter = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    set(state, action: PayloadAction<number>) {
      state.count = action.payload;
    },
  },
});

const storeOf = <S>(reducer: Reducer<S>, preloadedState?: S) =>
  configureStore({
    reducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });

const listStore = (data: DataItem[] = [], selected: number | null = null) =>
  storeOf(list.reducer, { data, selected });

const counterStore = () => storeOf(counter.reducer);

const sumFields = (s: WideState): number => {
  let sum = 0;
  for (let j = 0; j < WIDE_FIELDS; j++) sum += s[fieldKey(j)];
  return sum;
};

export const reduxToolkitPureState: PureStateLibrary = {
  name: 'Redux Toolkit',
  ops: {
    'create 1k': op({
      setup: () => ({ s: listStore(), rows: buildData(1000) }),
      run: ({ s, rows }) =>
        s.dispatch(list.actions.set({ data: rows, selected: null })),
    }),
    'append 1k': op({
      setup: () => ({ s: listStore(buildData(1000)), more: buildData(1000) }),
      run: ({ s, more }) => s.dispatch(list.actions.append(more)),
    }),
    'update every 10th': op({
      setup: () => listStore(buildData(1000)),
      run: (s) => s.dispatch(list.actions.updateEvery10th()),
    }),
    clear: op({
      setup: () => ({ s: listStore(), rows: buildData(1000) }),
      run: ({ s, rows }) => {
        s.dispatch(list.actions.set({ data: rows, selected: null }));
        s.dispatch(list.actions.set({ data: [], selected: null }));
      },
    }),

    'redundant emit': op({
      setup: () => listStore(buildData(100)),
      run: (s) => {
        const snapshot = s.getState();
        for (let i = 0; i < 1000; i++) s.dispatch(list.actions.set(snapshot));
      },
    }),
    'redundant patch': op({
      setup: () => listStore(buildData(100), 5),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.dispatch(list.actions.select(5));
      },
    }),
    'patch 1 of 20 fields': op({
      setup: () => storeOf(wide.reducer),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.dispatch(wide.actions.set({ field: 10, value: i }));
        }
      },
    }),
    'nested object update': op({
      setup: () => storeOf(nested.reducer),
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.dispatch(nested.actions.setAge(i));
      },
    }),
    'batch rapid updates': op({
      setup: () => {
        const s = counterStore();
        s.subscribe(() => void s.getState().count);
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) s.dispatch(counter.actions.set(i));
      },
    }),
    'same-tick burst 1000 (tracked consumer)': op({
      setup: () => {
        const s = storeOf(wide.reducer);
        let prev = s.getState().field0;
        s.subscribe(() => {
          const v = s.getState().field0;
          if (v !== prev) prev = v;
        });
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.dispatch(wide.actions.set({ field: 0, value: i }));
        }
      },
    }),

    'notify 100 subscribers': op({
      setup: () => {
        const s = listStore();
        for (let i = 0; i < 100; i++) s.subscribe(() => {});
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 100; i++) s.dispatch(list.actions.select(i));
      },
    }),
    'subscriber with computed filter': op({
      setup: () => {
        const s = listStore();
        const hits = { n: 0 };
        for (let i = 0; i < 10; i++) {
          const threshold = (i + 1) * 10;
          s.subscribe(() => {
            const { selected } = s.getState();
            if (selected !== null && selected >= threshold) hits.n++;
          });
        }
        return s;
      },
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          s.dispatch(list.actions.select(i % 100));
        }
      },
    }),
    // Three stores, like the other libraries; one store with three slices is
    // the more idiomatic Redux shape but would run every reducer per dispatch.
    'multi-store coordination': op({
      setup: () => {
        const stores = [0, 1, 2].map(counterStore);
        for (const s of stores) s.subscribe(() => {});
        return stores;
      },
      run: ([a, b, c]) => {
        for (let i = 0; i < 1000; i++) {
          a.dispatch(counter.actions.set(i));
          b.dispatch(counter.actions.set(a.getState().count * 2));
          c.dispatch(
            counter.actions.set(a.getState().count + b.getState().count),
          );
        }
      },
    }),
    // Each row subscriber compares its own item, as a `useSelector` does.
    '1 of 1,000 row subscribers': op({
      setup: () => {
        const s = listStore(buildData(ROWS));
        for (let i = 0; i < ROWS; i++) {
          let prev = s.getState().data[i];
          s.subscribe(() => {
            const item = s.getState().data[i];
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
          s.dispatch(list.actions.relabel((i * 7) % ROWS));
        }
      },
    }),

    'read 20 fields (baseline)': op({
      setup: () => storeOf(wide.reducer),
      run: (s) => {
        for (let i = 0; i < 1000; i++) {
          const state = s.getState();
          for (let j = 0; j < WIDE_FIELDS; j++) void state[fieldKey(j)];
        }
      },
    }),
    'getter track simple': op({
      setup: () => ({
        s: counterStore(),
        doubled: createSelector(
          (st: { count: number }) => st.count,
          (count) => count * 2,
        ),
      }),
      run: ({ s, doubled }) => {
        for (let i = 0; i < 1000; i++) {
          s.dispatch(counter.actions.set(i));
          void doubled(s.getState());
        }
      },
    }),
    'getter track wide aggregate': op({
      setup: () => ({
        s: storeOf(wide.reducer),
        sum: createSelector((st: WideState) => st, sumFields),
      }),
      run: ({ s, sum }) => {
        for (let i = 0; i < 1000; i++) {
          s.dispatch(wide.actions.set({ field: 0, value: i }));
          void sum(s.getState());
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
