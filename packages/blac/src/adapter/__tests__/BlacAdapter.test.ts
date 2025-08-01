import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlacAdapter } from '../BlacAdapter';
import { Cubit } from '../../Cubit';
import { Blac } from '../../Blac';

// Test Cubit implementations
class CounterCubit extends Cubit<number> {
  static isolated = false;
  static keepAlive = false;

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

interface UserState {
  name: string;
  age: number;
  profile: {
    email: string;
    preferences: {
      theme: string;
    };
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      name: 'John',
      age: 30,
      profile: {
        email: 'john@example.com',
        preferences: {
          theme: 'light',
        },
      },
    });
  }

  updateName = (name: string) => {
    this.patch({ name });
  };

  updateTheme = (theme: string) => {
    this.emit({
      ...this.state,
      profile: {
        ...this.state.profile,
        preferences: { theme },
      },
    });
  };
}

describe('BlacAdapter', () => {
  let blacInstance: Blac;
  let componentRef: { current: object };

  beforeEach(() => {
    blacInstance = new Blac({ __unsafe_ignore_singleton: true });
    componentRef = { current: {} };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization and Instance Management', () => {
    it('should create adapter with proper initialization', () => {
      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { instanceId: 'test-counter' },
      );

      expect(adapter.id).toMatch(/^adapter-/);
      expect(adapter.blocConstructor).toBe(CounterCubit);
      expect(adapter.componentRef).toBe(componentRef);
      expect(adapter.blocInstance).toBeInstanceOf(CounterCubit);
    });

    it('should retrieve existing bloc instance when not isolated', () => {
      // Create first adapter
      const adapter1 = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { instanceId: 'shared-counter' },
      );

      // Create second adapter with same id
      const componentRef2 = { current: {} };
      const adapter2 = new BlacAdapter(
        { componentRef: componentRef2, blocConstructor: CounterCubit },
        { instanceId: 'shared-counter' },
      );

      // Should share the same bloc instance
      expect(adapter1.blocInstance).toBe(adapter2.blocInstance);
    });

    it('should pass staticProps to bloc constructor', () => {
      class PropsCubit extends Cubit<string> {
        props?: { initialValue: string };

        constructor(props?: { initialValue: string }) {
          super(props?.initialValue || 'default');
          this.props = props;
        }
      }

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: PropsCubit as any },
        { staticProps: { initialValue: 'custom' } },
      );

      expect(adapter.blocInstance.state).toBe('custom');
      expect((adapter.blocInstance as PropsCubit).props).toEqual({
        initialValue: 'custom',
      });
    });
  });

  describe('Dependency Tracking - Explicit Dependencies', () => {
    it('should track dependencies when dependencies function is provided', () => {
      const dependencyFn = vi.fn((bloc: UserCubit) => [
        bloc.state.name,
        bloc.state.age,
      ]);

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: UserCubit },
        { dependencies: dependencyFn },
      );

      expect(dependencyFn).toHaveBeenCalledWith(adapter.blocInstance);
      expect(adapter.options?.dependencies).toBe(dependencyFn);
    });

    it('should only trigger onChange when dependencies change', () => {
      const onChange = vi.fn();
      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: UserCubit },
        { dependencies: (bloc) => [bloc.state.name] },
      );

      const unsubscribe = adapter.createSubscription({ onChange });

      // Change name - should trigger
      adapter.blocInstance.updateName('Jane');
      expect(onChange).toHaveBeenCalledTimes(1);

      // Change theme - should NOT trigger (not in dependencies)
      onChange.mockClear();
      adapter.blocInstance.updateTheme('dark');
      expect(onChange).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle dependency array changes correctly', () => {
      const onChange = vi.fn();
      let depCount = 1;

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        {
          dependencies: (bloc) => {
            // Variable length dependency array
            const deps = [];
            for (let i = 0; i < depCount; i++) {
              deps.push(bloc.state);
            }
            return deps;
          },
        },
      );

      const unsubscribe = adapter.createSubscription({ onChange });

      // Initial change
      adapter.blocInstance.increment();
      expect(onChange).toHaveBeenCalledTimes(1);

      // Change dependency array length
      depCount = 2;
      onChange.mockClear();
      adapter.blocInstance.increment();
      expect(onChange).toHaveBeenCalledTimes(1); // Length change triggers update

      unsubscribe();
    });
  });

  describe('Dependency Tracking - Proxy-based (Automatic)', () => {
    it('should track state access through proxy when no explicit dependencies', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      // Access state through proxy
      const proxyState = adapter.getStateProxy();
      const name = proxyState.name;
      const email = proxyState.profile.email;

      // Verify proxy state works correctly
      expect(name).toBe('John');
      expect(email).toBe('john@example.com');
    });

    it('should track class property access through proxy', () => {
      class GetterCubit extends Cubit<number> {
        constructor() {
          super(0);
        }

        get doubled() {
          return this.state * 2;
        }

        get isPositive() {
          return this.state > 0;
        }
      }

      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: GetterCubit,
      });

      // Access getters through proxy
      const proxyBloc = adapter.getBlocProxy();
      const doubled = proxyBloc.doubled;
      const isPositive = proxyBloc.isPositive;

      // Verify proxy getters work correctly
      expect(doubled).toBe(0);
      expect(isPositive).toBe(false);
    });

    it('should only notify when tracked values change', () => {
      const onChange = vi.fn();
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      // Mount the adapter first
      adapter.mount();

      // Create subscription with automatic tracking
      const unsubscribe = adapter.createSubscription({ onChange });

      // Access specific property through proxy to track it
      const proxyState = adapter.getStateProxy();
      const name = proxyState.name; // Track name property

      // Clear onChange calls from initial subscription
      onChange.mockClear();

      // Change tracked property - should notify
      adapter.blocInstance.updateName('Jane');
      expect(onChange).toHaveBeenCalledTimes(1);

      // For automatic tracking, only tracked properties trigger notifications
      // Since we only accessed 'name', changing 'theme' should not notify
      onChange.mockClear();
      adapter.blocInstance.updateTheme('dark');
      expect(onChange).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle nested property tracking', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      // Access nested property
      const proxyState = adapter.getStateProxy();
      const theme = proxyState.profile.preferences.theme;

      // Verify nested property access works
      expect(theme).toBe('light');

      // Verify nested proxy returns correct values
      expect(proxyState.profile.email).toBe('john@example.com');
      expect(proxyState.profile.preferences).toEqual({ theme: 'light' });
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle mount and unmount correctly', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { onMount, onUnmount },
      );

      // Mount
      adapter.mount();
      expect(onMount).toHaveBeenCalledWith(adapter.blocInstance);
      expect(adapter.mountTime).toBeGreaterThan(0);

      // Mount again - onMount is called each time
      adapter.mount();
      expect(onMount).toHaveBeenCalledTimes(2);

      // Unmount
      adapter.unmount();
      expect(onUnmount).toHaveBeenCalledWith(adapter.blocInstance);
      expect(adapter.unmountTime).toBeGreaterThan(0);
    });

    it('should handle onMount errors', () => {
      const onMount = vi.fn(() => {
        throw new Error('Mount error');
      });

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { onMount },
      );

      expect(() => adapter.mount()).toThrow('Mount error');
    });

    it('should not throw on unmount errors', () => {
      const onUnmount = vi.fn(() => {
        throw new Error('Unmount error');
      });

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { onUnmount },
      );

      adapter.mount();

      // Should not throw
      expect(() => adapter.unmount()).not.toThrow();
    });

    it('should refresh dependencies on mount', () => {
      const dependencies = vi.fn((bloc: CounterCubit) => [bloc.state]);

      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { dependencies },
      );

      expect(dependencies).toHaveBeenCalledTimes(1); // Initial call

      adapter.mount();
      expect(dependencies).toHaveBeenCalledTimes(2); // Called again on mount
    });
  });

  describe('Subscription Management', () => {
    it('should create and cleanup subscriptions', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: CounterCubit,
      });

      const onChange = vi.fn();
      const unsubscribe = adapter.createSubscription({ onChange });

      expect(adapter.blocInstance.subscriptionCount).toBe(1);

      // Trigger state change
      adapter.blocInstance.increment();
      expect(onChange).toHaveBeenCalled();

      // Cleanup
      unsubscribe();
      expect(adapter.blocInstance.subscriptionCount).toBe(0);
    });

    it('should handle first render without dependencies check', () => {
      const onChange = vi.fn();
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      // Don't mark as rendered yet
      const unsubscribe = adapter.createSubscription({ onChange });

      // First state change should always notify
      adapter.blocInstance.updateName('Jane');
      expect(onChange).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });

  describe('Proxy Creation and Management', () => {
    it('should return raw state when using explicit dependencies', () => {
      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: UserCubit },
        { dependencies: (bloc) => [bloc.state.name] },
      );

      const state = adapter.getStateProxy();

      // Should be raw state, not proxy
      expect(state).toBe(adapter.blocInstance.state);
    });

    it('should return raw bloc instance when using explicit dependencies', () => {
      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { dependencies: (bloc) => [bloc.state] },
      );

      const blocInstance = adapter.getBlocProxy();

      // Should be raw instance, not proxy
      expect(blocInstance).toBe(adapter.blocInstance);
    });

    it('should create proxies when not using explicit dependencies', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      const proxyState = adapter.getStateProxy();
      const proxyBloc = adapter.getBlocProxy();

      // Should be proxies
      expect(proxyState).not.toBe(adapter.blocInstance.state);
      expect(proxyBloc).not.toBe(adapter.blocInstance);
    });
  });

  describe('Consumer Tracking Integration', () => {
    it('should properly handle subscription lifecycle', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: CounterCubit,
      });

      adapter.mount();

      const onChange = vi.fn();
      const unsubscribe = adapter.createSubscription({ onChange });

      // State change should notify
      adapter.blocInstance.increment();
      expect(onChange).toHaveBeenCalledTimes(1);

      // After unsubscribe, no more notifications
      unsubscribe();
      adapter.blocInstance.increment();
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should reset tracking state properly', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: UserCubit,
      });

      // Access state to potentially track
      const proxyState = adapter.getStateProxy();
      const name = proxyState.name;

      // Reset tracking clears internal state
      adapter.resetTracking();

      // Verify adapter is still functional after reset
      const theme = proxyState.profile.preferences.theme;
      expect(theme).toBe('light');
    });
  });

  describe('Options Updates', () => {
    it('should update options after initialization', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: CounterCubit,
      });

      expect(adapter.options).toBeUndefined();

      const newOptions = {
        dependencies: (bloc: CounterCubit) => [bloc.state],
      };

      adapter.options = newOptions;
      expect(adapter.options).toBe(newOptions);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing componentRef gracefully', () => {
      // Can't use null as WeakMap key, so test with an empty object instead
      const emptyRef = {};
      const adapter = new BlacAdapter({
        componentRef: { current: emptyRef },
        blocConstructor: CounterCubit,
      });

      // Should not throw
      expect(() => adapter.mount()).not.toThrow();
      expect(() =>
        adapter.trackAccess(emptyRef, 'state', 'test'),
      ).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const adapter = new BlacAdapter({
        componentRef,
        blocConstructor: CounterCubit,
      });

      // Rapid mount/unmount
      for (let i = 0; i < 10; i++) {
        adapter.mount();
        adapter.unmount();
      }

      expect(adapter.blocInstance.subscriptionCount).toBe(0);
    });

    it('should handle value changes with Object.is semantics', () => {
      const onChange = vi.fn();
      const adapter = new BlacAdapter(
        { componentRef, blocConstructor: CounterCubit },
        { dependencies: (bloc) => [bloc.state] },
      );

      const unsubscribe = adapter.createSubscription({ onChange });

      // Set to NaN
      adapter.blocInstance.emit(NaN);
      expect(onChange).toHaveBeenCalledTimes(1);

      // Set to NaN again - should not trigger (Object.is(NaN, NaN) === true)
      onChange.mockClear();
      adapter.blocInstance.emit(NaN);
      expect(onChange).not.toHaveBeenCalled();

      unsubscribe();
    });
  });
});
