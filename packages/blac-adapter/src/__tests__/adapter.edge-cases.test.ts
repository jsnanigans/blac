import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vite-plus/test';
import { Cubit, clearAll } from '@blac/core';
import { createGetterState } from '@blac/core/tracking';
import {
  autoTrackInit,
  manualDepsInit,
  autoTrackSubscribe,
  manualDepsSubscribe,
  autoTrackSnapshot,
  manualDepsSnapshot,
  ExternalDepsManager,
  DependencyManager,
  ManualDepsConfig,
} from '../index';

class SimpleBloc extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'initial' });
  }
  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
  setName(name: string) {
    this.emit({ ...this.state, name });
  }
}

beforeEach(() => {
  clearAll();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('@blac/adapter edge cases', () => {
  it('autoTrackSubscribe in SSR: unsubscribing after subscription is safe', () => {
    vi.stubGlobal('window', undefined);

    const bloc = new SimpleBloc();
    const adapterState = autoTrackInit(bloc);
    const subscribe = autoTrackSubscribe(bloc, adapterState);
    const unsubscribe = subscribe(vi.fn());

    expect(() => unsubscribe()).not.toThrow();
  });

  it('manualDepsSubscribe with equal array deps prevents callback', () => {
    const bloc = new SimpleBloc();
    const adapterState = manualDepsInit(bloc);
    const config: ManualDepsConfig<typeof SimpleBloc> = {
      dependencies: (s) => [s.count],
    };
    const callback = vi.fn();

    manualDepsSnapshot(bloc, adapterState, config)();
    const unsubscribe = manualDepsSubscribe(
      bloc,
      adapterState,
      config,
    )(callback);

    bloc.setName('changed');

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('manualDepsSubscribe with changed deps triggers callback', () => {
    const bloc = new SimpleBloc();
    const adapterState = manualDepsInit(bloc);
    const config: ManualDepsConfig<typeof SimpleBloc> = {
      dependencies: (s) => [s.count],
    };
    const callback = vi.fn();

    manualDepsSnapshot(bloc, adapterState, config)();
    const unsubscribe = manualDepsSubscribe(
      bloc,
      adapterState,
      config,
    )(callback);

    bloc.increment();

    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('autoTrackSnapshot creates DependencyState lazily on first call', () => {
    const bloc = new SimpleBloc();
    const adapterState = autoTrackInit(bloc);

    expect(adapterState.dependencyState).toBeNull();

    autoTrackSnapshot(bloc, adapterState)();

    expect(adapterState.dependencyState).not.toBeNull();
  });

  it('ExternalDepsManager.updateSubscriptions() returns false when bloc has no deps', () => {
    const bloc = new SimpleBloc();
    const manager = new ExternalDepsManager();
    const getterState = createGetterState();

    const result = manager.updateSubscriptions(getterState, bloc, vi.fn());

    expect(result).toBe(false);
    manager.cleanup();
  });

  it('ExternalDepsManager.updateSubscriptions() returns false when getterState is null', () => {
    const bloc = new SimpleBloc();
    const manager = new ExternalDepsManager();

    const result = manager.updateSubscriptions(null, bloc, vi.fn());

    expect(result).toBe(false);
    manager.cleanup();
  });

  it('DependencyManager.add() is idempotent — adding same dep twice subscribes only once', () => {
    const dep = new SimpleBloc();
    const subscribeSpy = vi.spyOn(dep, 'subscribe');
    const manager = new DependencyManager();
    const callback = vi.fn();

    manager.add(dep, callback);
    manager.add(dep, callback);

    expect(subscribeSpy).toHaveBeenCalledOnce();
    expect(manager.getDependencies().size).toBe(1);

    manager.cleanup();
  });

  describe('autoTrack — nullable state transitions', () => {
    // NullableBloc uses `any` to bypass Cubit's `S extends object` constraint;
    // the runtime behaviour under test is what matters here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class NullableBloc extends Cubit<any> {
      constructor(initial: { value: number } | null) {
        super(initial);
      }
      set(v: { value: number } | null) {
        this.emit(v);
      }
    }

    it('re-renders when state transitions null → object', () => {
      const bloc = new NullableBloc(null);
      const adapterState = autoTrackInit(bloc);
      const snapshot = autoTrackSnapshot(bloc, adapterState);
      const callback = vi.fn();
      const unsubscribe = autoTrackSubscribe(bloc, adapterState)(callback);

      // Take a snapshot so lastSnapshotState is recorded as null
      snapshot();

      // Transition null → object
      bloc.set({ value: 1 });

      expect(callback).toHaveBeenCalledOnce();
      unsubscribe();
    });

    it('re-renders when state transitions object → null', () => {
      const bloc = new NullableBloc({ value: 1 });
      const adapterState = autoTrackInit(bloc);
      const snapshot = autoTrackSnapshot(bloc, adapterState);
      const callback = vi.fn();

      // Take snapshot and access .value so pathCache is non-empty
      const state = snapshot() as { value: number };
      void state.value;

      const unsubscribe = autoTrackSubscribe(bloc, adapterState)(callback);

      // Transition object → null
      bloc.set(null);

      expect(callback).toHaveBeenCalledOnce();
      unsubscribe();
    });

    it('does not re-render when null state emits another null', () => {
      const bloc = new NullableBloc(null);
      const adapterState = autoTrackInit(bloc);
      const snapshot = autoTrackSnapshot(bloc, adapterState);
      const callback = vi.fn();

      // Take snapshot so lastSnapshotState is null
      snapshot();

      const unsubscribe = autoTrackSubscribe(bloc, adapterState)(callback);

      // null → null: StateContainer deduplicates via Object.is, so no event fires
      bloc.set(null);

      expect(callback).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('per-consumer active tracker', () => {
    class TwoGettersBloc extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
      get computedA() {
        return this.state.count + 1;
      }
      get computedB() {
        return this.state.count + 2;
      }
    }

    it('two consumers of the same bloc track getters independently', () => {
      const bloc = new TwoGettersBloc();

      // Simulate two useBloc consumers sharing the same bloc instance.
      const state1 = autoTrackInit(bloc);
      const state2 = autoTrackInit(bloc);

      // The cleanest assertion: each consumer owns a distinct proxy + tracker.
      expect(state1.proxiedBloc).not.toBe(state2.proxiedBloc);
      expect(state1.getterState).not.toBe(state2.getterState);

      // Consumer 1 render: snapshot, access computedA, commit (via disable).
      autoTrackSnapshot(bloc, state1)();
      void (state1.proxiedBloc as TwoGettersBloc).computedA;
      // disableGetterTracking would normally run in useEffect; emulate it
      // here by committing directly.
      state1.getterState!.isTracking = false;
      // Snapshot already commits on entry; force one more commit so trackedGetters
      // mirrors what was accessed this render.
      const committed1 = new Set(state1.getterState!.currentlyAccessing);
      state1.getterState!.trackedGetters = committed1;
      state1.getterState!.currentlyAccessing.clear();

      // Consumer 2 render: snapshot, access computedB, commit.
      autoTrackSnapshot(bloc, state2)();
      void (state2.proxiedBloc as TwoGettersBloc).computedB;
      state2.getterState!.isTracking = false;
      const committed2 = new Set(state2.getterState!.currentlyAccessing);
      state2.getterState!.trackedGetters = committed2;
      state2.getterState!.currentlyAccessing.clear();

      expect(Array.from(state1.getterState!.trackedGetters)).toEqual([
        'computedA',
      ]);
      expect(Array.from(state2.getterState!.trackedGetters)).toEqual([
        'computedB',
      ]);
    });

    it('interleaved renders do not contaminate each others trackers', () => {
      const bloc = new TwoGettersBloc();
      const state1 = autoTrackInit(bloc);
      const state2 = autoTrackInit(bloc);

      // Both consumers start their render concurrently.
      autoTrackSnapshot(bloc, state1)();
      autoTrackSnapshot(bloc, state2)();

      // Access happens interleaved.
      void (state1.proxiedBloc as TwoGettersBloc).computedA;
      void (state2.proxiedBloc as TwoGettersBloc).computedB;

      // Both commit.
      const c1 = new Set(state1.getterState!.currentlyAccessing);
      state1.getterState!.trackedGetters = c1;
      state1.getterState!.currentlyAccessing.clear();
      state1.getterState!.isTracking = false;

      const c2 = new Set(state2.getterState!.currentlyAccessing);
      state2.getterState!.trackedGetters = c2;
      state2.getterState!.currentlyAccessing.clear();
      state2.getterState!.isTracking = false;

      expect(state1.getterState!.trackedGetters.has('computedA')).toBe(true);
      expect(state1.getterState!.trackedGetters.has('computedB')).toBe(false);
      expect(state2.getterState!.trackedGetters.has('computedB')).toBe(true);
      expect(state2.getterState!.trackedGetters.has('computedA')).toBe(false);
    });
  });
});
