import { createStore, type StoreApi } from 'zustand';
import { buildData, resetId } from '../../shared/data';
import type {
  CounterState,
  DataItem,
  NestedState,
  PureStateBenchmark,
  WideState,
} from '../../shared/types';
import { createNestedState, createWideState } from '../../shared/types';

interface DemoState {
  data: DataItem[];
  selected: number | null;
}

type Store<T> = StoreApi<T>;

interface ZustandHandle {
  demo: Store<DemoState>;
  wide: Store<WideState>;
  nested: Store<NestedState>;
  counter: Store<CounterState>;
  source: Store<{ value: number }>;
  counterA: Store<CounterState>;
  counterB: Store<CounterState>;
  counterC: Store<CounterState>;
}

export const zustandPureState: PureStateBenchmark = {
  name: 'Zustand',
  setup: () => {
    resetId();
    return {
      demo: createStore<DemoState>(() => ({ data: [], selected: null })),
      wide: createStore<WideState>(() => createWideState()),
      nested: createStore<NestedState>(() => createNestedState()),
      counter: createStore<CounterState>(() => ({ count: 0 })),
      source: createStore<{ value: number }>(() => ({ value: 0 })),
      counterA: createStore<CounterState>(() => ({ count: 0 })),
      counterB: createStore<CounterState>(() => ({ count: 0 })),
      counterC: createStore<CounterState>(() => ({ count: 0 })),
    } satisfies ZustandHandle;
  },
  operations: {
    'create 1k': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(1000), selected: null });
    },
    'create 10k': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(10000), selected: null });
    },
    'update every 10th': (h) => {
      const { demo } = h as ZustandHandle;
      if (demo.getState().data.length === 0) {
        demo.setState({ data: buildData(1000), selected: null });
      }
      const current = demo.getState();
      const newData = current.data.slice(0);
      for (let i = 0, len = newData.length; i < len; i += 10) {
        const r = newData[i];
        newData[i] = { id: r.id, label: r.label + ' !!!' };
      }
      demo.setState({ data: newData });
    },
    'append 1k': (h) => {
      const { demo } = h as ZustandHandle;
      if (demo.getState().data.length === 0) {
        demo.setState({ data: buildData(1000), selected: null });
      }
      const current = demo.getState();
      demo.setState({ data: [...current.data, ...buildData(1000)] });
    },
    clear: (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(1000), selected: null });
      demo.setState({ data: [], selected: null });
    },

    // --- Real-world scenarios ---

    'redundant emit': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(100), selected: null });
      const snapshot = demo.getState();
      for (let i = 0; i < 1000; i++) {
        demo.setState(snapshot, true);
      }
    },
    'redundant patch': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(100), selected: 5 });
      for (let i = 0; i < 1000; i++) {
        demo.setState({ selected: 5 });
      }
    },
    'patch 1 of 20 fields': (h) => {
      const { wide } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        wide.setState({ field10: i });
      }
    },
    'rapid counter': (h) => {
      const { counter } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
      }
    },
    'notify 100 subscribers': (h) => {
      const { demo } = h as ZustandHandle;
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        unsubs.push(demo.subscribe(() => {}));
      }
      for (let i = 0; i < 100; i++) {
        demo.setState({ data: [], selected: i });
      }
      unsubs.forEach((u) => u());
    },
    'nested object update': (h) => {
      const { nested } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        const current = nested.getState();
        nested.setState({
          a: {
            ...current.a,
            b: {
              ...current.a.b,
              c: { ...current.a.b.c, value: i },
            },
          },
        });
      }
    },
    'selective subscription': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(100), selected: null }, true);
      let selectedChanges = 0;
      const unsub = demo.subscribe((state) => {
        if (state.selected !== null) selectedChanges++;
      });
      for (let i = 0; i < 1000; i++) {
        demo.setState({ data: buildData(100), selected: null }, true);
      }
      unsub();
      void selectedChanges;
    },
    'derived state read': (h) => {
      const { source, counter } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        source.setState({ value: i });
        counter.setState({ count: source.getState().value * 2 });
      }
    },
    'multi-store coordination': (h) => {
      const { counterA, counterB, counterC } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        counterA.setState({ count: i });
        counterB.setState({ count: i * 2 });
        counterC.setState({ count: i * 3 });
      }
    },
    'subscribe/unsubscribe churn': (h) => {
      const { demo } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        const unsub = demo.subscribe(() => {});
        unsub();
      }
    },
    'listener with selector filter': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(100), selected: null }, true);
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        const threshold = i * 100;
        unsubs.push(
          demo.subscribe((state) => {
            if (state.data.length > threshold) {
              /* filtered hit */
            }
          }),
        );
      }
      for (let i = 0; i < 1000; i++) {
        demo.setState({ data: buildData(100), selected: i }, true);
      }
      unsubs.forEach((u) => u());
    },
  },
};
