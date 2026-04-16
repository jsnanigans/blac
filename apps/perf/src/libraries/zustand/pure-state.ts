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
  derived: Store<{ doubled: number }>;
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
      derived: createStore<{ doubled: number }>(() => ({ doubled: 0 })),
      counterA: createStore<CounterState>(() => ({ count: 0 })),
      counterB: createStore<CounterState>(() => ({ count: 0 })),
      counterC: createStore<CounterState>(() => ({ count: 0 })),
    } satisfies ZustandHandle;
  },
  operations: {
    // ── CRUD Operations ──

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

    // ── State Update Patterns ──

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
    'batch rapid updates': (h) => {
      const { counter } = h as ZustandHandle;
      let total = 0;
      const unsub = counter.subscribe((s) => {
        total += s.count;
      });
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
      }
      unsub();
      void total;
    },

    // ── Subscription & Notification ──

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
    'selector notification skip': (h) => {
      const { demo } = h as ZustandHandle;
      demo.setState({ data: buildData(100), selected: 42 });
      let notifyCount = 0;
      const unsub = demo.subscribe((state) => {
        void state.selected;
        notifyCount++;
      });
      for (let i = 0; i < 1000; i++) {
        demo.setState({ selected: 42 });
      }
      unsub();
      void notifyCount;
    },
    'subscriber with computed filter': (h) => {
      const { demo } = h as ZustandHandle;
      let hitCount = 0;
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        const threshold = (i + 1) * 10;
        unsubs.push(
          demo.subscribe((state) => {
            if (state.selected !== null && state.selected >= threshold) {
              hitCount++;
            }
          }),
        );
      }
      for (let i = 0; i < 1000; i++) {
        demo.setState({ data: [], selected: i % 100 });
      }
      unsubs.forEach((u) => u());
      void hitCount;
    },

    // ── Derived & Cross-Store ──

    'derived state computation': (h) => {
      const { source } = h as ZustandHandle;
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        source.setState({ value: i });
        result = source.getState().value * 2;
      }
      void result;
    },
    'cross-store propagation': (h) => {
      const { source, derived } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        source.setState({ value: i });
        derived.setState({ doubled: source.getState().value * 2 });
      }
    },
    'multi-store coordination': (h) => {
      const { counterA, counterB, counterC } = h as ZustandHandle;
      let notifications = 0;
      const unsubA = counterA.subscribe(() => { notifications++; });
      const unsubB = counterB.subscribe(() => { notifications++; });
      const unsubC = counterC.subscribe(() => { notifications++; });
      for (let i = 0; i < 1000; i++) {
        counterA.setState({ count: i });
        counterB.setState({ count: counterA.getState().count * 2 });
        counterC.setState({ count: counterA.getState().count + counterB.getState().count });
      }
      unsubA();
      unsubB();
      unsubC();
      void notifications;
    },

    // ── Proxy Tracking Overhead (no equivalent, measure raw state access) ──

    'proxy track 1 field': (h) => {
      const { counter } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
        const s = counter.getState();
        void s.count;
      }
    },
    'proxy track 20 fields': (h) => {
      const { wide } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        const s = wide.getState();
        for (let j = 0; j < 20; j++) {
          void s[`field${j}` as keyof WideState];
        }
      }
    },
    'proxy track deep nested (5 levels)': (h) => {
      const { nested } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        void nested.getState().a.b.c;
      }
    },
    'proxy change detection miss': (h) => {
      const { counter } = h as ZustandHandle;
      counter.setState({ count: 42 });
      const ref = counter.getState();
      for (let i = 0; i < 1000; i++) {
        counter.getState() === ref;
      }
    },
    'proxy change detection hit': (h) => {
      const { counter } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
        counter.getState();
      }
    },
    'proxy cache reuse': (h) => {
      const { wide } = h as ZustandHandle;
      for (let i = 0; i < 1000; i++) {
        const s = wide.getState();
        for (let j = 0; j < 20; j++) {
          void s[`field${j}` as keyof WideState];
        }
      }
    },

    // ── Getter Tracking (use selector functions) ──

    'getter track simple': (h) => {
      const { counter } = h as ZustandHandle;
      const select = (s: CounterState) => s.count * 2;
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
        void select(counter.getState());
      }
    },
    'getter track multiple': (h) => {
      const { counter } = h as ZustandHandle;
      const selectDoubled = (s: CounterState) => s.count * 2;
      const selectSquared = (s: CounterState) => s.count ** 2;
      for (let i = 0; i < 1000; i++) {
        counter.setState({ count: i });
        void selectDoubled(counter.getState());
        void selectSquared(counter.getState());
      }
    },
    'getter track wide aggregate': (h) => {
      const { wide } = h as ZustandHandle;
      const selectSum = (s: WideState) => {
        let sum = 0;
        for (let j = 0; j < 20; j++) {
          sum += s[`field${j}` as keyof WideState] as number;
        }
        return sum;
      };
      for (let i = 0; i < 1000; i++) {
        wide.setState({ field0: i });
        void selectSum(wide.getState());
      }
    },
    'getter change detection miss': (h) => {
      const { counter } = h as ZustandHandle;
      counter.setState({ count: 42 });
      const select = (s: CounterState) => s.count * 2;
      for (let i = 0; i < 1000; i++) {
        void select(counter.getState());
      }
    },

    // ── Registry Lifecycle (store create + destroy) ──

    'acquire/release cycle': () => {
      for (let i = 0; i < 1000; i++) {
        const store = createStore<CounterState>(() => ({ count: 0 }));
        void store.getState();
      }
    },
    'acquire shared instance': () => {
      const store = createStore<CounterState>(() => ({ count: 0 }));
      for (let i = 0; i < 1000; i++) {
        void store.getState();
      }
    },
    'instance create/dispose': () => {
      for (let i = 0; i < 1000; i++) {
        const store = createStore<CounterState>(() => ({ count: 0 }));
        void store.getState();
      }
    },
  },
};
