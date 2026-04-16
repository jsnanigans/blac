import { Cubit, acquire, release } from '@blac/core';
import {
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
  createGetterState,
  hasGetterChanges,
  setActiveTracker,
  clearActiveTracker,
  commitTrackedGetters,
} from '@blac/core/tracking';
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

class DemoBloc extends Cubit<DemoState> {
  constructor() {
    super({ data: [], selected: null });
  }
}

class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
}

class NestedBloc extends Cubit<NestedState> {
  constructor() {
    super(createNestedState());
  }
}

class CounterBloc extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }
}

class SourceBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 0 });
  }
}

class DerivedBloc extends Cubit<{ doubled: number }> {
  constructor() {
    super({ doubled: 0 });
  }
}

class CounterABloc extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }
}

class CounterBBloc extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }
}

class CounterCBloc extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }
}

class DeepNestedBloc extends Cubit<{
  level1: {
    level2: {
      level3: {
        level4: {
          level5: { value: number };
        };
      };
    };
  };
}> {
  constructor() {
    super({
      level1: { level2: { level3: { level4: { level5: { value: 0 } } } } },
    });
  }
}

class GetterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  get doubled(): number {
    return this.state.count * 2;
  }
  get squared(): number {
    return this.state.count ** 2;
  }
}

class WideGettersBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
  get sum(): number {
    let s = 0;
    for (let i = 0; i < 20; i++) {
      s += this.state[`field${i}` as keyof WideState] as number;
    }
    return s;
  }
}

interface BlacHandle {
  demo: DemoBloc;
  wide: WideBloc;
  nested: NestedBloc;
  counter: CounterBloc;
  source: SourceBloc;
  derived: DerivedBloc;
  counterA: CounterABloc;
  counterB: CounterBBloc;
  counterC: CounterCBloc;
  deepNested: DeepNestedBloc;
  getter: GetterBloc;
  wideGetters: WideGettersBloc;
}

export const blacPureState: PureStateBenchmark = {
  name: 'Blac',
  setup: () => {
    resetId();
    return {
      demo: new DemoBloc(),
      wide: new WideBloc(),
      nested: new NestedBloc(),
      counter: new CounterBloc(),
      source: new SourceBloc(),
      derived: new DerivedBloc(),
      counterA: new CounterABloc(),
      counterB: new CounterBBloc(),
      counterC: new CounterCBloc(),
      deepNested: new DeepNestedBloc(),
      getter: new GetterBloc(),
      wideGetters: new WideGettersBloc(),
    } satisfies BlacHandle;
  },
  operations: {
    // ── CRUD Operations ──

    'create 1k': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(1000), selected: null });
    },
    'create 10k': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(10000), selected: null });
    },
    'update every 10th': (h) => {
      const { demo } = h as BlacHandle;
      if (demo.state.data.length === 0) {
        demo.emit({ data: buildData(1000), selected: null });
      }
      const newData = demo.state.data.slice(0);
      for (let i = 0, len = newData.length; i < len; i += 10) {
        const r = newData[i];
        newData[i] = { id: r.id, label: r.label + ' !!!' };
      }
      demo.patch({ data: newData });
    },
    'append 1k': (h) => {
      const { demo } = h as BlacHandle;
      if (demo.state.data.length === 0) {
        demo.emit({ data: buildData(1000), selected: null });
      }
      demo.patch({ data: [...demo.state.data, ...buildData(1000)] });
    },
    clear: (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(1000), selected: null });
      demo.emit({ data: [], selected: null });
    },

    // ── State Update Patterns ──

    'redundant emit': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(100), selected: null });
      const snapshot = demo.state;
      for (let i = 0; i < 1000; i++) {
        demo.emit(snapshot);
      }
    },
    'redundant patch': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(100), selected: 5 });
      for (let i = 0; i < 1000; i++) {
        demo.patch({ selected: 5 });
      }
    },
    'patch 1 of 20 fields': (h) => {
      const { wide } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        wide.patch({ field10: i });
      }
    },
    'nested object update': (h) => {
      const { nested } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        const current = nested.state;
        nested.emit({
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
      const { counter } = h as BlacHandle;
      let total = 0;
      const unsub = counter.subscribe((s) => {
        total += s.count;
      });
      for (let i = 0; i < 1000; i++) {
        counter.patch({ count: i });
      }
      unsub();
      void total;
    },

    // ── Subscription & Notification ──

    'notify 100 subscribers': (h) => {
      const { demo } = h as BlacHandle;
      const unsubs: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        unsubs.push(demo.subscribe(() => {}));
      }
      for (let i = 0; i < 100; i++) {
        demo.emit({ data: [], selected: i });
      }
      unsubs.forEach((u) => u());
    },
    'selector notification skip': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(100), selected: 42 });
      let notifyCount = 0;
      const unsub = demo.subscribe((state) => {
        void state.selected;
        notifyCount++;
      });
      for (let i = 0; i < 1000; i++) {
        demo.patch({ selected: 42 });
      }
      unsub();
      void notifyCount;
    },
    'subscriber with computed filter': (h) => {
      const { demo } = h as BlacHandle;
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
        demo.emit({ data: [], selected: i % 100 });
      }
      unsubs.forEach((u) => u());
      void hitCount;
    },

    // ── Derived & Cross-Store ──

    'derived state computation': (h) => {
      const { source } = h as BlacHandle;
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        source.patch({ value: i });
        result = source.state.value * 2;
      }
      void result;
    },
    'cross-store propagation': (h) => {
      const { source, derived } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        source.patch({ value: i });
        derived.patch({ doubled: source.state.value * 2 });
      }
    },
    'multi-store coordination': (h) => {
      const { counterA, counterB, counterC } = h as BlacHandle;
      let notifications = 0;
      const unsubA = counterA.subscribe(() => { notifications++; });
      const unsubB = counterB.subscribe(() => { notifications++; });
      const unsubC = counterC.subscribe(() => { notifications++; });
      for (let i = 0; i < 1000; i++) {
        counterA.patch({ count: i });
        counterB.patch({ count: counterA.state.count * 2 });
        counterC.patch({ count: counterA.state.count + counterB.state.count });
      }
      unsubA();
      unsubB();
      unsubC();
      void notifications;
    },

    // ── Proxy Tracking Overhead ──

    'proxy track 1 field': (h) => {
      const { counter } = h as BlacHandle;
      counter.emit({ count: 0 });
      for (let i = 0; i < 1000; i++) {
        const depState = createDependencyState<{ count: number }>();
        startDependency(depState);
        const proxy = createDependencyProxy(depState, counter.state);
        void (proxy as any).count;
        capturePaths(depState, counter.state);
        hasDependencyChanges(depState, counter.state);
      }
    },
    'proxy track 20 fields': (h) => {
      const { wide } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        const depState = createDependencyState<WideState>();
        startDependency(depState);
        const proxy = createDependencyProxy(depState, wide.state);
        for (let j = 0; j < 20; j++) {
          void (proxy as any)[`field${j}`];
        }
        capturePaths(depState, wide.state);
        hasDependencyChanges(depState, wide.state);
      }
    },
    'proxy track deep nested (5 levels)': (h) => {
      const { deepNested } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        const depState = createDependencyState();
        startDependency(depState);
        const proxy = createDependencyProxy(depState, deepNested.state);
        void (proxy as any).level1.level2.level3.level4.level5.value;
        capturePaths(depState, deepNested.state);
        hasDependencyChanges(depState, deepNested.state);
      }
    },
    'proxy change detection miss': (h) => {
      const { counter } = h as BlacHandle;
      counter.emit({ count: 42 });
      const depState = createDependencyState<{ count: number }>();
      startDependency(depState);
      const proxy = createDependencyProxy(depState, counter.state);
      void (proxy as any).count;
      capturePaths(depState, counter.state);
      for (let i = 0; i < 1000; i++) {
        hasDependencyChanges(depState, counter.state);
      }
    },
    'proxy change detection hit': (h) => {
      const { counter } = h as BlacHandle;
      const depState = createDependencyState<{ count: number }>();
      for (let i = 0; i < 1000; i++) {
        counter.emit({ count: i });
        startDependency(depState);
        const proxy = createDependencyProxy(depState, counter.state);
        void (proxy as any).count;
        capturePaths(depState, counter.state);
        hasDependencyChanges(depState, counter.state);
      }
    },
    'proxy cache reuse': (h) => {
      const { wide } = h as BlacHandle;
      const depState = createDependencyState<WideState>();
      startDependency(depState);
      const proxy = createDependencyProxy(depState, wide.state);
      for (let j = 0; j < 20; j++) {
        void (proxy as any)[`field${j}`];
      }
      capturePaths(depState, wide.state);
      for (let i = 0; i < 1000; i++) {
        startDependency(depState);
        const p = createDependencyProxy(depState, wide.state);
        for (let j = 0; j < 20; j++) {
          void (p as any)[`field${j}`];
        }
        capturePaths(depState, wide.state);
      }
    },

    // ── Getter Tracking ──

    'getter track simple': (h) => {
      const { getter } = h as BlacHandle;
      const g = getter as any;
      for (let i = 0; i < 1000; i++) {
        getter.emit({ count: i });
        const gs = createGetterState();
        gs.isTracking = true;
        setActiveTracker(g, gs);
        void g.doubled;
        commitTrackedGetters(gs);
        clearActiveTracker(g);
        hasGetterChanges(g, gs);
      }
    },
    'getter track multiple': (h) => {
      const { getter } = h as BlacHandle;
      const g = getter as any;
      for (let i = 0; i < 1000; i++) {
        getter.emit({ count: i });
        const gs = createGetterState();
        gs.isTracking = true;
        setActiveTracker(g, gs);
        void g.doubled;
        void g.squared;
        commitTrackedGetters(gs);
        clearActiveTracker(g);
        hasGetterChanges(g, gs);
      }
    },
    'getter track wide aggregate': (h) => {
      const { wideGetters } = h as BlacHandle;
      const g = wideGetters as any;
      for (let i = 0; i < 1000; i++) {
        wideGetters.patch({ field0: i });
        const gs = createGetterState();
        gs.isTracking = true;
        setActiveTracker(g, gs);
        void g.sum;
        commitTrackedGetters(gs);
        clearActiveTracker(g);
        hasGetterChanges(g, gs);
      }
    },
    'getter change detection miss': (h) => {
      const { getter } = h as BlacHandle;
      const g = getter as any;
      getter.emit({ count: 42 });
      const gs = createGetterState();
      gs.isTracking = true;
      setActiveTracker(g, gs);
      void g.doubled;
      commitTrackedGetters(gs);
      clearActiveTracker(g);
      for (let i = 0; i < 1000; i++) {
        hasGetterChanges(g, gs);
      }
    },

    // ── Registry Lifecycle ──

    'acquire/release cycle': () => {
      for (let i = 0; i < 1000; i++) {
        const inst = acquire(CounterBloc, undefined, `bench-${i}`);
        release(CounterBloc, `bench-${i}`, false, `bench-${i}`);
        void inst;
      }
    },
    'acquire shared instance': () => {
      const key = 'shared-bench';
      for (let i = 0; i < 1000; i++) {
        const inst = acquire(CounterBloc, key, `ref-${i}`);
        release(CounterBloc, key, false, `ref-${i}`);
        void inst;
      }
    },
    'instance create/dispose': () => {
      for (let i = 0; i < 1000; i++) {
        const bloc = new CounterBloc();
        bloc.dispose();
      }
    },
  },
  teardown: (h) => {
    const handle = h as BlacHandle;
    handle.demo.dispose();
    handle.wide.dispose();
    handle.nested.dispose();
    handle.counter.dispose();
    handle.source.dispose();
    handle.derived.dispose();
    handle.counterA.dispose();
    handle.counterB.dispose();
    handle.counterC.dispose();
    handle.deepNested.dispose();
    handle.getter.dispose();
    handle.wideGetters.dispose();
  },
};
