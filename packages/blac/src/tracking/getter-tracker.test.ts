import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '../core/Cubit';
import {
  createGetterTracker,
  setActiveTracker,
  clearActiveTracker,
  getActiveTracker,
  commitTrackedGetters,
  createBlocProxy,
  hasGetterChanges,
  invalidateRenderCache,
  clearExternalDependencies,
  resetGetterTracker,
  isGetter,
  getDescriptor,
} from './getter-tracker';

class TestBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  get doubled() {
    return this.state.count * 2;
  }

  get tripled() {
    return this.state.count * 3;
  }

  get complex() {
    return {
      doubled: this.doubled,
      tripled: this.tripled,
      sum: this.doubled + this.tripled
    };
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  regularMethod() {
    return this.state.count + 1;
  }
}

describe('getter-tracker', () => {
  let bloc: TestBloc;

  beforeEach(() => {
    bloc = new TestBloc();
    clearActiveTracker(bloc);
  });

  describe('isGetter', () => {
    it('should identify getters correctly', () => {
      expect(isGetter(bloc, 'doubled')).toBe(true);
      expect(isGetter(bloc, 'tripled')).toBe(true);
      expect(isGetter(bloc, 'complex')).toBe(true);
      expect(isGetter(bloc, 'state')).toBe(true); // state is also a getter
    });

    it('should return false for non-getters', () => {
      expect(isGetter(bloc, 'increment')).toBe(false); // arrow function
      expect(isGetter(bloc, 'regularMethod')).toBe(false); // method
      expect(isGetter(bloc, 'emit')).toBe(false); // inherited method
    });

    it('should return false for non-existent properties', () => {
      expect(isGetter(bloc, 'nonExistent')).toBe(false);
    });
  });

  describe('getDescriptor', () => {
    it('should get descriptor for getters', () => {
      const descriptor = getDescriptor(bloc, 'doubled');
      expect(descriptor).toBeDefined();
      expect(descriptor?.get).toBeDefined();
      expect(typeof descriptor?.get).toBe('function');
    });

    it('should cache descriptors', () => {
      const descriptor1 = getDescriptor(bloc, 'doubled');
      const descriptor2 = getDescriptor(bloc, 'doubled');
      expect(descriptor1).toBe(descriptor2);
    });

    it('should return undefined for non-existent properties', () => {
      const descriptor = getDescriptor(bloc, 'nonExistent');
      expect(descriptor).toBeUndefined();
    });
  });

  describe('createGetterTracker', () => {
    it('should create tracker with correct initial state', () => {
      const tracker = createGetterTracker();
      expect(tracker.trackedValues).toBeInstanceOf(Map);
      expect(tracker.trackedValues.size).toBe(0);
      expect(tracker.currentlyAccessing).toBeInstanceOf(Set);
      expect(tracker.currentlyAccessing.size).toBe(0);
      expect(tracker.trackedGetters).toBeInstanceOf(Set);
      expect(tracker.trackedGetters.size).toBe(0);
      expect(tracker.isTracking).toBe(false);
      expect(tracker.renderCache).toBeInstanceOf(Map);
      expect(tracker.renderCache.size).toBe(0);
      expect(tracker.cacheValid).toBe(false);
      expect(tracker.externalDependencies).toBeInstanceOf(Set);
      expect(tracker.externalDependencies.size).toBe(0);
    });
  });

  describe('tracker management', () => {
    it('should set and get active tracker', () => {
      const tracker = createGetterTracker();
      setActiveTracker(bloc, tracker);
      expect(getActiveTracker(bloc)).toBe(tracker);
    });

    it('should clear active tracker', () => {
      const tracker = createGetterTracker();
      setActiveTracker(bloc, tracker);
      clearActiveTracker(bloc);
      expect(getActiveTracker(bloc)).toBeUndefined();
    });

    it('should return undefined for bloc without tracker', () => {
      expect(getActiveTracker(bloc)).toBeUndefined();
    });
  });

  describe('commitTrackedGetters', () => {
    it('should commit currently accessing getters to tracked getters', () => {
      const tracker = createGetterTracker();
      tracker.currentlyAccessing.add('doubled');
      tracker.currentlyAccessing.add('tripled');

      commitTrackedGetters(tracker);

      expect(tracker.trackedGetters.size).toBe(2);
      expect(tracker.trackedGetters.has('doubled')).toBe(true);
      expect(tracker.trackedGetters.has('tripled')).toBe(true);
      expect(tracker.currentlyAccessing.size).toBe(0);
    });

    it('should clear currently accessing set', () => {
      const tracker = createGetterTracker();
      tracker.currentlyAccessing.add('doubled');

      commitTrackedGetters(tracker);

      expect(tracker.currentlyAccessing.size).toBe(0);
    });

    it('should not clear trackedGetters if nothing was accessing', () => {
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('doubled');

      commitTrackedGetters(tracker);

      expect(tracker.trackedGetters.has('doubled')).toBe(true);
    });
  });

  describe('createBlocProxy', () => {
    it('should create a proxy that tracks getter access', () => {
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      setActiveTracker(bloc, tracker);

      const proxy = createBlocProxy(bloc);
      const value = proxy.doubled;

      expect(value).toBe(0); // count is 0, so doubled is 0
      expect(tracker.currentlyAccessing.has('doubled')).toBe(true);
      expect(tracker.trackedValues.get('doubled')).toBe(0);
    });

    it('should not track when isTracking is false', () => {
      const tracker = createGetterTracker();
      tracker.isTracking = false;
      setActiveTracker(bloc, tracker);

      const proxy = createBlocProxy(bloc);
      const value = proxy.doubled;

      expect(value).toBe(0);
      expect(tracker.currentlyAccessing.has('doubled')).toBe(false);
    });

    it('should not track non-getter properties', () => {
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      setActiveTracker(bloc, tracker);

      const proxy = createBlocProxy(bloc);
      const incrementFn = proxy.increment; // Access arrow function (not a getter)

      expect(incrementFn).toBeDefined();
      expect(tracker.currentlyAccessing.has('increment')).toBe(false);
    });

    it('should cache proxies per bloc instance', () => {
      const proxy1 = createBlocProxy(bloc);
      const proxy2 = createBlocProxy(bloc);
      expect(proxy1).toBe(proxy2);
    });

    it('should use render cache when available', () => {
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      tracker.cacheValid = true;
      tracker.renderCache.set('doubled', 999);
      setActiveTracker(bloc, tracker);

      const proxy = createBlocProxy(bloc);
      const value = proxy.doubled;

      expect(value).toBe(999); // Should use cached value
    });
  });

  describe('hasGetterChanges', () => {
    it('should detect when getter value changes', () => {
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('doubled');
      tracker.trackedValues.set('doubled', 0);

      bloc.increment(); // count becomes 1, doubled becomes 2

      const hasChanges = hasGetterChanges(bloc, tracker);
      expect(hasChanges).toBe(true);
      expect(tracker.trackedValues.get('doubled')).toBe(2);
    });

    it('should return false when getter value unchanged', () => {
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('doubled');
      tracker.trackedValues.set('doubled', 0);

      const hasChanges = hasGetterChanges(bloc, tracker);
      expect(hasChanges).toBe(false);
    });

    it('should return false when no getters tracked', () => {
      const tracker = createGetterTracker();
      const hasChanges = hasGetterChanges(bloc, tracker);
      expect(hasChanges).toBe(false);
    });

    it('should return false when tracker is null', () => {
      const hasChanges = hasGetterChanges(bloc, null);
      expect(hasChanges).toBe(false);
    });

    it('should populate render cache for all tracked getters', () => {
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('doubled');
      tracker.trackedGetters.add('tripled');
      tracker.trackedValues.set('doubled', 0);
      tracker.trackedValues.set('tripled', 0);

      bloc.increment(); // count becomes 1

      hasGetterChanges(bloc, tracker);

      expect(tracker.renderCache.get('doubled')).toBe(2);
      expect(tracker.renderCache.get('tripled')).toBe(3);
      expect(tracker.cacheValid).toBe(true);
    });

    it('should use Object.is for comparison', () => {
      class ObjectBloc extends Cubit<{ data: { value: number } }> {
        constructor() {
          super({ data: { value: 1 } });
        }

        get obj() {
          return this.state.data;
        }
      }

      const objBloc = new ObjectBloc();
      const tracker = createGetterTracker();
      const sameRef = objBloc.state.data;
      tracker.trackedGetters.add('obj');
      tracker.trackedValues.set('obj', sameRef);

      // Emit same state (same reference)
      objBloc.emit(objBloc.state);

      const hasChanges = hasGetterChanges(objBloc, tracker);
      expect(hasChanges).toBe(false);
    });

    it('should handle getter errors gracefully', () => {
      class ErrorBloc extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }

        get throwing() {
          throw new Error('Getter error');
        }
      }

      const errorBloc = new ErrorBloc();
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('throwing');

      // Should not throw, should return true and stop tracking the getter
      const hasChanges = hasGetterChanges(errorBloc, tracker);
      expect(hasChanges).toBe(true);
      expect(tracker.trackedGetters.has('throwing')).toBe(false);
      expect(tracker.cacheValid).toBe(false);
    });
  });

  describe('invalidateRenderCache', () => {
    it('should invalidate render cache', () => {
      const tracker = createGetterTracker();
      tracker.cacheValid = true;
      tracker.renderCache.set('doubled', 999);

      invalidateRenderCache(tracker);

      expect(tracker.cacheValid).toBe(false);
      // Cache map is not cleared, just marked invalid
      expect(tracker.renderCache.size).toBe(1);
    });
  });

  describe('clearExternalDependencies', () => {
    it('should clear external dependencies set', () => {
      const tracker = createGetterTracker();
      const externalBloc = new TestBloc();
      tracker.externalDependencies.add(externalBloc);

      clearExternalDependencies(tracker);

      expect(tracker.externalDependencies.size).toBe(0);
    });
  });

  describe('resetGetterTracker', () => {
    it('should reset all tracker state', () => {
      const tracker = createGetterTracker();
      tracker.trackedValues.set('doubled', 10);
      tracker.currentlyAccessing.add('tripled');
      tracker.trackedGetters.add('doubled');
      tracker.renderCache.set('doubled', 20);
      tracker.cacheValid = true;
      tracker.isTracking = true;
      tracker.externalDependencies.add(new TestBloc());

      resetGetterTracker(tracker);

      expect(tracker.trackedValues.size).toBe(0);
      expect(tracker.currentlyAccessing.size).toBe(0);
      expect(tracker.trackedGetters.size).toBe(0);
      expect(tracker.renderCache.size).toBe(0);
      expect(tracker.cacheValid).toBe(false);
      expect(tracker.isTracking).toBe(false);
      expect(tracker.externalDependencies.size).toBe(0);
    });
  });

  describe('circular dependency detection', () => {
    it('should detect and handle simple circular dependencies', () => {
      class CircularBloc extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }

        get circular(): any {
          // Access via proxy to trigger circular detection
          const proxy = createBlocProxy(this);
          return proxy.circular; // Recursive access through proxy
        }
      }

      const circularBloc = new CircularBloc();
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      setActiveTracker(circularBloc, tracker);

      const proxy = createBlocProxy(circularBloc);
      const value = proxy.circular;

      // Should return undefined instead of causing stack overflow
      expect(value).toBeUndefined();
    });

    it('should handle deeply nested getter calls', () => {
      class DeepBloc extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }

        get level1() {
          return this.level2 + 1;
        }

        get level2() {
          return this.level3 + 1;
        }

        get level3() {
          return this.state.count;
        }
      }

      const deepBloc = new DeepBloc();
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      setActiveTracker(deepBloc, tracker);

      const proxy = createBlocProxy(deepBloc);
      const value = proxy.level1;

      expect(value).toBe(2); // 0 + 1 + 1
    });
  });

  describe('complex getter scenarios', () => {
    it('should handle getters that access other getters', () => {
      const tracker = createGetterTracker();
      tracker.isTracking = true;
      setActiveTracker(bloc, tracker);

      const proxy = createBlocProxy(bloc);
      const value = proxy.complex;

      expect(value).toEqual({
        doubled: 0,
        tripled: 0,
        sum: 0
      });

      // Should track 'complex' getter
      expect(tracker.currentlyAccessing.has('complex')).toBe(true);
    });

    it('should detect changes in complex getters', () => {
      const tracker = createGetterTracker();
      tracker.trackedGetters.add('complex');
      const initialValue = {
        doubled: 0,
        tripled: 0,
        sum: 0
      };
      tracker.trackedValues.set('complex', initialValue);

      bloc.increment();

      const hasChanges = hasGetterChanges(bloc, tracker);
      expect(hasChanges).toBe(true);
      expect(tracker.trackedValues.get('complex')).toEqual({
        doubled: 2,
        tripled: 3,
        sum: 5
      });
    });
  });
});
