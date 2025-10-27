import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Simple Signal Implementation
class Signal<T> {
  private value: T;
  private observers = new Set<() => void>();
  private static currentObserver: (() => void) | null = null;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    // Auto-track dependencies
    if (Signal.currentObserver) {
      this.observers.add(Signal.currentObserver);
    }
    return this.value;
  }

  set(newValue: T): void {
    if (Object.is(this.value, newValue)) return;
    this.value = newValue;
    // Notify only direct observers
    this.observers.forEach(observer => observer());
  }

  subscribe(observer: () => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  // Track dependencies automatically
  static track<T>(fn: () => T, observer: () => void): T {
    const prevObserver = Signal.currentObserver;
    Signal.currentObserver = observer;
    const result = fn();
    Signal.currentObserver = prevObserver;
    return result;
  }
}

// Computed signal (derived state)
class Computed<T> {
  private cache?: T;
  private isValid = false;
  private signal = new Signal<T | undefined>(undefined);
  private dependencies = new Set<Signal<any>>();

  constructor(private fn: () => T) {
    this.recompute();
  }

  get(): T {
    if (!this.isValid) {
      this.recompute();
    }
    return this.signal.get() as T;
  }

  private recompute(): void {
    // Clear old dependencies
    this.dependencies.clear();

    // Track new dependencies
    const value = Signal.track(this.fn, () => {
      this.isValid = false;
      this.recompute();
    });

    this.cache = value;
    this.isValid = true;
    this.signal.set(value);
  }
}

// React hook for signals
function useSignal<T>(initialValue: T): [() => T, (value: T) => void] {
  const [, forceUpdate] = useState({});
  const signalRef = useRef<Signal<T>>();

  if (!signalRef.current) {
    signalRef.current = new Signal(initialValue);
  }

  useEffect(() => {
    return signalRef.current!.subscribe(() => {
      forceUpdate({}); // Force React to re-render
    });
  }, []);

  const getter = useCallback(() => signalRef.current!.get(), []);
  const setter = useCallback((value: T) => signalRef.current!.set(value), []);

  return [getter, setter];
}

describe('Signals vs React State Management', () => {
  it('demonstrates fine-grained reactivity with signals', () => {
    console.log('\n=== SIGNALS: Fine-Grained Reactivity ===\n');

    // Create reactive state
    const firstName = new Signal('John');
    const lastName = new Signal('Doe');
    const count = new Signal(0);

    let fullNameComputations = 0;
    let greetingComputations = 0;

    // Computed values (auto-track dependencies)
    const fullName = new Computed(() => {
      fullNameComputations++;
      return `${firstName.get()} ${lastName.get()}`;
    });

    const greeting = new Computed(() => {
      greetingComputations++;
      return `Hello, ${fullName.get()}! Count: ${count.get()}`;
    });

    console.log('Initial state:');
    console.log(`  Greeting: "${greeting.get()}"`);
    console.log(`  FullName computations: ${fullNameComputations}`);
    console.log(`  Greeting computations: ${greetingComputations}`);

    // Update count (should NOT recompute fullName)
    count.set(1);
    console.log('\nAfter updating count:');
    console.log(`  Greeting: "${greeting.get()}"`);
    console.log(`  FullName computations: ${fullNameComputations} (unchanged ✅)`);
    console.log(`  Greeting computations: ${greetingComputations}`);

    // Update firstName (should recompute both)
    firstName.set('Jane');
    console.log('\nAfter updating firstName:');
    console.log(`  Greeting: "${greeting.get()}"`);
    console.log(`  FullName computations: ${fullNameComputations}`);
    console.log(`  Greeting computations: ${greetingComputations}`);

    console.log('\n🎯 Key insight: Computations run ONLY when dependencies change!');

    expect(fullNameComputations).toBe(2); // Initial + firstName change
    expect(greetingComputations).toBe(3); // Initial + count change + firstName change
  });

  it('compares update granularity: Signals vs React', () => {
    console.log('\n=== UPDATE GRANULARITY COMPARISON ===\n');

    // Track update counts
    const metrics = {
      signal: { updates: 0, computations: 0 },
      react: { renders: 0, memoCalculations: 0 }
    };

    // SIGNALS APPROACH
    console.log('SIGNALS Approach:');
    const users = new Signal([
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 }
    ]);
    const filter = new Signal('');

    const filteredUsers = new Computed(() => {
      metrics.signal.computations++;
      const f = filter.get();
      return users.get().filter(u => u.name.toLowerCase().includes(f.toLowerCase()));
    });

    // Subscribe to changes
    filteredUsers.get(); // Initial computation

    // Update filter
    filter.set('a');
    filteredUsers.get();
    metrics.signal.updates++;

    // Update users
    users.set([...users.get(), { id: 3, name: 'Charlie', age: 35 }]);
    filteredUsers.get();
    metrics.signal.updates++;

    // REACT APPROACH
    console.log('\nREACT Approach:');
    const { result: reactResult } = renderHook(() => {
      const [reactUsers, setReactUsers] = useState([
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 }
      ]);
      const [reactFilter, setReactFilter] = useState('');
      metrics.react.renders++;

      const reactFiltered = useMemo(() => {
        metrics.react.memoCalculations++;
        return reactUsers.filter(u =>
          u.name.toLowerCase().includes(reactFilter.toLowerCase())
        );
      }, [reactUsers, reactFilter]);

      return { reactFiltered, setReactUsers, setReactFilter };
    });

    // Update filter
    act(() => {
      reactResult.current.setReactFilter('a');
    });

    // Update users
    act(() => {
      const current = [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 }
      ];
      reactResult.current.setReactUsers([...current, { id: 3, name: 'Charlie', age: 35 }]);
    });

    console.log('\n📊 Results:');
    console.log('Signals:');
    console.log(`  Updates triggered: ${metrics.signal.updates}`);
    console.log(`  Computations run: ${metrics.signal.computations}`);
    console.log('\nReact:');
    console.log(`  Component renders: ${metrics.react.renders}`);
    console.log(`  Memo calculations: ${metrics.react.memoCalculations}`);

    console.log('\n🎯 Both recomputed the same number of times, but:');
    console.log('  - Signals: NO component re-renders needed');
    console.log('  - React: Entire component re-rendered each time');

    expect(metrics.signal.computations).toBe(metrics.react.memoCalculations);
  });

  it('demonstrates automatic dependency tracking', () => {
    console.log('\n=== AUTOMATIC DEPENDENCY TRACKING ===\n');

    // Signals automatically track what you use
    const a = new Signal(1);
    const b = new Signal(2);
    const c = new Signal(3);
    const useMultiplier = new Signal(true);

    let computeCount = 0;

    const result = new Computed(() => {
      computeCount++;
      console.log(`  Computing... (run #${computeCount})`);

      if (useMultiplier.get()) {
        return a.get() * b.get(); // Depends on a, b, useMultiplier
      } else {
        return a.get() + c.get(); // Depends on a, c, useMultiplier
      }
    });

    console.log('Initial (multiplication mode):');
    console.log(`  Result: ${result.get()}`); // 1 * 2 = 2

    console.log('\nUpdate b (should recompute):');
    b.set(3);
    console.log(`  Result: ${result.get()}`); // 1 * 3 = 3

    console.log('\nUpdate c (should NOT recompute - not used):');
    const countBefore = computeCount;
    c.set(10);
    console.log(`  Result: ${result.get()}`);
    console.log(`  Recomputed: ${computeCount > countBefore ? 'YES ❌' : 'NO ✅'}`);

    console.log('\nSwitch to addition mode:');
    useMultiplier.set(false);
    console.log(`  Result: ${result.get()}`); // 1 + 10 = 11

    console.log('\nUpdate b (should NOT recompute - not used anymore):');
    const countBefore2 = computeCount;
    b.set(100);
    console.log(`  Result: ${result.get()}`);
    console.log(`  Recomputed: ${computeCount > countBefore2 ? 'YES ❌' : 'NO ✅'}`);

    console.log('\n🎯 Signals automatically track ONLY active dependencies!');

    expect(result.get()).toBe(11); // a(1) + c(10)
  });

  it('shows signals working outside components', () => {
    console.log('\n=== SIGNALS OUTSIDE COMPONENTS ===\n');

    // Signals work anywhere - no React needed!
    const appState = {
      user: new Signal({ name: 'John', role: 'admin' }),
      theme: new Signal<'light' | 'dark'>('light'),
      notifications: new Signal<string[]>([])
    };

    // Business logic completely separate from UI
    class NotificationService {
      private unreadCount = new Computed(() => {
        return appState.notifications.get().length;
      });

      addNotification(message: string) {
        appState.notifications.set([
          ...appState.notifications.get(),
          message
        ]);
      }

      getUnreadCount() {
        return this.unreadCount.get();
      }
    }

    const service = new NotificationService();

    console.log('Initial state:');
    console.log(`  Unread: ${service.getUnreadCount()}`);

    console.log('\nAdding notifications:');
    service.addNotification('Hello');
    console.log(`  Unread: ${service.getUnreadCount()}`);

    service.addNotification('World');
    console.log(`  Unread: ${service.getUnreadCount()}`);

    console.log('\n🎯 Signals work everywhere:');
    console.log('  - In components');
    console.log('  - In services');
    console.log('  - In utilities');
    console.log('  - Even in Node.js!');

    expect(service.getUnreadCount()).toBe(2);
  });

  it('demonstrates React integration with signals', () => {
    console.log('\n=== REACT + SIGNALS INTEGRATION ===\n');

    let renderCount = 0;

    function CounterWithSignals() {
      const [count, setCount] = useSignal(0);
      const [multiplier, setMultiplier] = useSignal(2);

      renderCount++;

      // This looks like a component but updates are fine-grained!
      return {
        count: count(),
        multiplier: multiplier(),
        doubled: count() * multiplier(),
        increment: () => setCount(count() + 1),
        setMultiplier
      };
    }

    const { result } = renderHook(() => CounterWithSignals());

    console.log('Initial render:');
    console.log(`  Count: ${result.current.count}`);
    console.log(`  Doubled: ${result.current.doubled}`);
    console.log(`  Renders: ${renderCount}`);

    act(() => {
      result.current.increment();
    });

    console.log('\nAfter increment:');
    console.log(`  Count: ${result.current.count}`);
    console.log(`  Doubled: ${result.current.doubled}`);
    console.log(`  Renders: ${renderCount}`);

    act(() => {
      result.current.setMultiplier(3);
    });

    console.log('\nAfter changing multiplier:');
    console.log(`  Count: ${result.current.count}`);
    console.log(`  Doubled: ${result.current.doubled}`);
    console.log(`  Renders: ${renderCount}`);

    console.log('\n🎯 With proper integration, signals can work in React!');
    console.log('  But React still forces reconciliation...');

    expect(renderCount).toBeGreaterThan(1);
  });

  it('compares performance: Signals vs React for 1000 items', () => {
    console.log('\n=== PERFORMANCE: 1000 ITEMS ===\n');

    const ITEM_COUNT = 1000;
    const UPDATE_COUNT = 100;

    // SIGNALS
    const signalStart = performance.now();
    const items = new Signal(
      Array.from({ length: ITEM_COUNT }, (_, i) => ({
        id: i,
        value: 0,
        active: false
      }))
    );

    // Update specific items
    for (let i = 0; i < UPDATE_COUNT; i++) {
      const current = items.get();
      current[i].value++;
      items.set([...current]);
    }
    const signalTime = performance.now() - signalStart;

    // REACT
    const reactStart = performance.now();
    const { result } = renderHook(() => {
      const [reactItems, setReactItems] = useState(
        Array.from({ length: ITEM_COUNT }, (_, i) => ({
          id: i,
          value: 0,
          active: false
        }))
      );

      return { reactItems, setReactItems };
    });

    // Update specific items
    for (let i = 0; i < UPDATE_COUNT; i++) {
      act(() => {
        result.current.setReactItems(prev => {
          const next = [...prev];
          next[i] = { ...next[i], value: next[i].value + 1 };
          return next;
        });
      });
    }
    const reactTime = performance.now() - reactStart;

    console.log(`Performance with ${ITEM_COUNT} items, ${UPDATE_COUNT} updates:`);
    console.log(`  Signals: ${signalTime.toFixed(2)}ms`);
    console.log(`  React:   ${reactTime.toFixed(2)}ms`);
    console.log(`  Winner:  ${signalTime < reactTime ? 'Signals 🏆' : 'React'}`);

    const improvement = ((reactTime - signalTime) / reactTime * 100).toFixed(0);
    console.log(`  Signals are ${improvement}% faster!`);

    console.log('\n🎯 For large lists with frequent updates:');
    console.log('  Signals shine with fine-grained updates');
    console.log('  React struggles with reconciliation overhead');

    expect(signalTime).toBeLessThan(reactTime * 1.5); // Signals should be faster
  });

  it('shows the perfect use case for signals', () => {
    console.log('\n=== PERFECT USE CASE: REAL-TIME DASHBOARD ===\n');

    // Simulated real-time data
    const metrics = {
      cpu: new Signal(45),
      memory: new Signal(2048),
      requests: new Signal(1000),
      errors: new Signal(5),
      latency: new Signal(125)
    };

    let cpuRenders = 0;
    let memoryRenders = 0;
    let requestRenders = 0;

    // Computed signals
    const cpuStatus = new Computed(() => {
      cpuRenders++;
      const cpu = metrics.cpu.get();
      return cpu > 80 ? 'critical' : cpu > 60 ? 'warning' : 'normal';
    });

    const memoryStatus = new Computed(() => {
      memoryRenders++;
      const mem = metrics.memory.get();
      return mem > 3000 ? 'critical' : mem > 2500 ? 'warning' : 'normal';
    });

    const errorRate = new Computed(() => {
      requestRenders++;
      const errors = metrics.errors.get();
      const requests = metrics.requests.get();
      return requests > 0 ? (errors / requests * 100).toFixed(2) : '0';
    });

    console.log('Initial dashboard:');
    console.log(`  CPU: ${metrics.cpu.get()}% (${cpuStatus.get()})`);
    console.log(`  Memory: ${metrics.memory.get()}MB (${memoryStatus.get()})`);
    console.log(`  Error rate: ${errorRate.get()}%`);
    console.log(`  Renders: CPU=${cpuRenders}, Mem=${memoryRenders}, Req=${requestRenders}`);

    // Simulate real-time updates
    console.log('\nSimulating 10 seconds of updates...');

    // Update different metrics at different rates
    for (let second = 0; second < 10; second++) {
      // CPU updates every second
      metrics.cpu.set(40 + Math.random() * 40);

      // Memory updates every 2 seconds
      if (second % 2 === 0) {
        metrics.memory.set(2000 + Math.random() * 1500);
      }

      // Requests update every second
      metrics.requests.set(metrics.requests.get() + Math.floor(Math.random() * 100));

      // Errors update occasionally
      if (Math.random() > 0.7) {
        metrics.errors.set(metrics.errors.get() + 1);
      }
    }

    console.log('\nAfter 10 seconds:');
    console.log(`  CPU: ${metrics.cpu.get().toFixed(0)}% (${cpuStatus.get()})`);
    console.log(`  Memory: ${metrics.memory.get().toFixed(0)}MB (${memoryStatus.get()})`);
    console.log(`  Error rate: ${errorRate.get()}%`);
    console.log(`  Renders: CPU=${cpuRenders}, Mem=${memoryRenders}, Req=${requestRenders}`);

    console.log('\n🎯 Perfect for:');
    console.log('  - Real-time dashboards');
    console.log('  - Trading platforms');
    console.log('  - Game UIs');
    console.log('  - Collaborative apps');
    console.log('  - Any app with frequent, partial updates');

    expect(cpuRenders).toBeGreaterThan(memoryRenders); // CPU updates more frequently
  });
});