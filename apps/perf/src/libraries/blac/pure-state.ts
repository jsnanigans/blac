import { Cubit } from '@blac/core';
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

interface BlacHandle {
  demo: DemoBloc;
  wide: WideBloc;
  nested: NestedBloc;
  counter: CounterBloc;
  source: SourceBloc;
  counterA: CounterABloc;
  counterB: CounterBBloc;
  counterC: CounterCBloc;
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
      counterA: new CounterABloc(),
      counterB: new CounterBBloc(),
      counterC: new CounterCBloc(),
    } satisfies BlacHandle;
  },
  operations: {
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

    // --- Real-world scenarios ---

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
    'rapid counter': (h) => {
      const { counter } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        counter.patch({ count: i });
      }
    },
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
    'selective subscription': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(100), selected: null });
      let selectedChanges = 0;
      const unsub = demo.subscribe((state) => {
        if (state.selected !== null) selectedChanges++;
      });
      for (let i = 0; i < 1000; i++) {
        demo.emit({ data: buildData(100), selected: null });
      }
      unsub();
      void selectedChanges;
    },
    'derived state read': (h) => {
      const { source, counter } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        source.patch({ value: i });
        counter.patch({ count: source.state.value * 2 });
      }
    },
    'multi-store coordination': (h) => {
      const { counterA, counterB, counterC } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        counterA.patch({ count: i });
        counterB.patch({ count: i * 2 });
        counterC.patch({ count: i * 3 });
      }
    },
    'subscribe/unsubscribe churn': (h) => {
      const { demo } = h as BlacHandle;
      for (let i = 0; i < 1000; i++) {
        const unsub = demo.subscribe(() => {});
        unsub();
      }
    },
    'listener with selector filter': (h) => {
      const { demo } = h as BlacHandle;
      demo.emit({ data: buildData(100), selected: null });
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
        demo.emit({ data: buildData(100), selected: i });
      }
      unsubs.forEach((u) => u());
    },
  },
  teardown: (h) => {
    const handle = h as BlacHandle;
    handle.demo.dispose();
    handle.wide.dispose();
    handle.nested.dispose();
    handle.counter.dispose();
    handle.source.dispose();
    handle.counterA.dispose();
    handle.counterB.dispose();
    handle.counterC.dispose();
  },
};
