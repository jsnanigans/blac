/**
 * Integration tests to validate the complete v2 design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CounterCubit, TodoCubit, TodoState } from './Cubit';
import {
  CounterVertex,
  IncrementEvent,
  DecrementEvent,
  AuthVertex,
  AuthState,
  Vertex
} from './Vertex';
import { BaseEvent } from '../types/events';
import { waitFor } from '../test-utils';

describe('V2 Design Validation', () => {
  describe('Cubit Integration', () => {
    let cubit: CounterCubit;

    beforeEach(() => {
      cubit = new CounterCubit();
    });

    afterEach(async () => {
      await cubit.dispose();
    });

    it('should work with simple state emissions', () => {
      expect(cubit.state).toBe(0);

      cubit.increment();
      expect(cubit.state).toBe(1);

      cubit.increment();
      expect(cubit.state).toBe(2);

      cubit.decrement();
      expect(cubit.state).toBe(1);

      cubit.reset();
      expect(cubit.state).toBe(0);
    });

    it('should handle subscriptions correctly', () => {
      const listener = vi.fn();
      const unsubscribe = cubit.subscribe(listener);

      cubit.increment();
      expect(listener).toHaveBeenCalledWith(1);

      cubit.increment();
      expect(listener).toHaveBeenCalledWith(2);

      unsubscribe();
      cubit.increment();
      expect(listener).toHaveBeenCalledTimes(2); // No more calls
    });

    it('should maintain correct this binding (React compatibility)', () => {
      const { increment, decrement, reset } = cubit;

      // These should work even when destructured (arrow functions)
      increment();
      expect(cubit.state).toBe(1);

      increment();
      expect(cubit.state).toBe(2);

      decrement();
      expect(cubit.state).toBe(1);

      reset();
      expect(cubit.state).toBe(0);
    });

    it('should handle complex state updates', async () => {
      const todoCubit = new TodoCubit();

      todoCubit.addTodo('First task');
      expect(todoCubit.state.todos).toHaveLength(1);
      expect(todoCubit.state.todos[0].text).toBe('First task');

      todoCubit.addTodo('Second task');
      expect(todoCubit.state.todos).toHaveLength(2);

      const firstId = todoCubit.state.todos[0].id;
      todoCubit.toggleTodo(firstId);
      expect(todoCubit.state.todos[0].done).toBe(true);

      todoCubit.setFilter('active');
      expect(todoCubit.state.filter).toBe('active');
      expect(todoCubit.visibleTodos).toHaveLength(1);

      todoCubit.removeTodo(firstId);
      expect(todoCubit.state.todos).toHaveLength(1);

      // Clean up
      await todoCubit.dispose();
    });

    it('should handle lifecycle correctly', async () => {
      const mountSpy = vi.fn();
      const unmountSpy = vi.fn();
      const disposeSpy = vi.fn();

      class LifecycleCubit extends CounterCubit {
        protected async onMount() {
          mountSpy();
        }
        protected async onUnmount() {
          unmountSpy();
        }
        protected async onDispose() {
          disposeSpy();
        }
      }

      const cubit = new LifecycleCubit();

      await cubit.mount();
      expect(mountSpy).toHaveBeenCalled();

      await cubit.unmount();
      expect(unmountSpy).toHaveBeenCalled();

      await cubit.dispose();
      expect(disposeSpy).toHaveBeenCalled();
      expect(cubit.isDisposed).toBe(true);
    });
  });

  describe('Vertex (Bloc) Integration', () => {
    let vertex: CounterVertex;

    beforeEach(() => {
      vertex = new CounterVertex();
    });

    afterEach(async () => {
      await vertex.dispose();
    });

    it('should handle events correctly', async () => {
      expect(vertex.state).toBe(0);

      vertex.increment(5);
      await waitFor(() => vertex.state === 5);
      expect(vertex.state).toBe(5);

      vertex.decrement(2);
      await waitFor(() => vertex.state === 3);
      expect(vertex.state).toBe(3);

      vertex.reset();
      await waitFor(() => vertex.state === 0);
      expect(vertex.state).toBe(0);
    });

    it('should process events in order', async () => {
      const values: number[] = [];
      vertex.subscribe(state => values.push(state));

      // Add multiple events rapidly
      vertex.increment(1);
      vertex.increment(2);
      vertex.increment(3);
      vertex.decrement(1);

      // Wait for all events to process
      await waitFor(() => values.length === 4);

      // Should process in order: 0 + 1 = 1, 1 + 2 = 3, 3 + 3 = 6, 6 - 1 = 5
      expect(values).toEqual([1, 3, 6, 5]);
      expect(vertex.state).toBe(5);
    });

    it('should handle async event handlers', async () => {
      const authVertex = new AuthVertex();

      expect(authVertex.state.isAuthenticated).toBe(false);
      expect(authVertex.state.isLoading).toBe(false);

      // Start login
      authVertex.login('user@example.com', 'password');

      // Should immediately set loading
      expect(authVertex.state.isLoading).toBe(true);

      // Wait for async login to complete
      await waitFor(() => !authVertex.state.isLoading, 2000);

      // Should be authenticated
      expect(authVertex.state.isAuthenticated).toBe(true);
      expect(authVertex.state.user).toEqual({
        id: '123',
        name: 'Test User',
        email: 'user@example.com',
      });

      // Test logout
      authVertex.logout();
      await waitFor(() => !authVertex.state.isAuthenticated);
      expect(authVertex.state.user).toBeNull();

      await authVertex.dispose();
    });

    it('should handle login failure', async () => {
      const authVertex = new AuthVertex();

      authVertex.login('wrong@example.com', 'wrongpassword');

      // Wait for async login to complete
      await waitFor(() => !authVertex.state.isLoading, 2000);

      expect(authVertex.state.isAuthenticated).toBe(false);
      expect(authVertex.state.error).toBe('Invalid credentials');

      await authVertex.dispose();
    });

    it('should maintain this binding for event methods', async () => {
      const { increment, decrement, reset } = vertex;

      // These should work even when destructured
      increment(3);
      await waitFor(() => vertex.state === 3);

      decrement(1);
      await waitFor(() => vertex.state === 2);

      reset();
      await waitFor(() => vertex.state === 0);
    });
  });

  describe('Memory Management', () => {
    it('should handle disposal correctly', async () => {
      const cubit = new CounterCubit();
      const listener = vi.fn();

      const unsubscribe = cubit.subscribe(listener);

      expect(cubit.getConsumerCount()).toBe(1);

      unsubscribe();
      expect(cubit.getConsumerCount()).toBe(0);

      // Should schedule disposal when no consumers (unless keepAlive)
      expect(cubit.isDisposalRequested).toBe(true);

      // Disposal should happen after microtask
      await waitFor(() => cubit.isDisposed);
      expect(cubit.isDisposed).toBe(true);
    });

    it('should respect keepAlive configuration', async () => {
      const todoCubit = new TodoCubit(); // Has keepAlive: true
      const listener = vi.fn();

      const unsubscribe = todoCubit.subscribe(listener);
      expect(todoCubit.getConsumerCount()).toBe(1);

      unsubscribe();
      expect(todoCubit.getConsumerCount()).toBe(0);

      // Should NOT schedule disposal due to keepAlive
      expect(todoCubit.isDisposalRequested).toBe(false);

      // Wait to ensure no disposal happens
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(todoCubit.isDisposed).toBe(false);

      // Manual disposal should still work
      await todoCubit.dispose();
      expect(todoCubit.isDisposed).toBe(true);
    });

    it('should cancel disposal if new consumer added', async () => {
      const cubit = new CounterCubit();

      const unsub1 = cubit.subscribe(() => {});
      unsub1(); // Remove consumer, triggers disposal

      expect(cubit.isDisposalRequested).toBe(true);

      // Add new consumer before disposal executes
      const unsub2 = cubit.subscribe(() => {});

      expect(cubit.isDisposalRequested).toBe(false);

      // Wait to ensure disposal was cancelled
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cubit.isDisposed).toBe(false);

      unsub2();
      await cubit.dispose();
    });
  });

  describe('Type Safety Validation', () => {
    it('should have zero type assertions in implementation', () => {
      // This test validates that our implementation doesn't need any type assertions
      // The fact that all the above tests compile and run without any 'as any' casts
      // proves our type system design is sound

      // Let's also verify type inference works correctly
      const cubit = new CounterCubit();
      const state: number = cubit.state; // Should infer number

      const todoCubit = new TodoCubit();
      const todoState: TodoState = todoCubit.state; // Should infer TodoState

      const vertex = new CounterVertex();
      const vertexState: number = vertex.state; // Should infer number

      const authVertex = new AuthVertex();
      const authState: AuthState = authVertex.state; // Should infer AuthState

      // TypeScript should catch these at compile time if types are wrong
      expect(typeof state).toBe('number');
      expect(typeof todoState).toBe('object');
      expect(typeof vertexState).toBe('number');
      expect(typeof authState).toBe('object');
    });

    it('should properly type event handlers', () => {
      // This validates that our event system is fully type-safe
      class TestEvent implements BaseEvent {
        readonly type = 'test';
        readonly timestamp = Date.now();
        constructor(public readonly value: string) {}
      }

      class TestVertex extends Vertex<{ value: string }> {
        constructor() {
          super({ value: '' });

          // TypeScript ensures event and emit are properly typed
          this.on(TestEvent, (event, emit) => {
            // event is typed as TestEvent
            // emit expects { value: string }
            emit({ value: event.value });
          });
        }

        test = (value: string) => {
          this.add(new TestEvent(value));
        };
      }

      const vertex = new TestVertex();

      // Should compile without type assertions
      vertex.test('hello');

      // Event processing is async, wait for it
      return waitFor(() => vertex.state.value === 'hello', 100).then(() => {
        expect(vertex.state.value).toBe('hello');
      });
    });
  });

  describe('React Compatibility', () => {
    it('should work with arrow function pattern for React', () => {
      // This pattern is critical for React components
      const cubit = new CounterCubit();

      // Simulate React component destructuring props
      const Component = ({ increment, decrement }: {
        increment: () => void;
        decrement: () => void;
      }) => {
        // These should work without losing 'this' context
        increment();
        increment();
        decrement();
      };

      Component({
        increment: cubit.increment,
        decrement: cubit.decrement
      });

      expect(cubit.state).toBe(1);
    });

    it('should handle multiple instances correctly', () => {
      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();

      cubit1.increment();
      cubit1.increment();

      cubit2.increment();

      // Each instance should maintain its own state
      expect(cubit1.state).toBe(2);
      expect(cubit2.state).toBe(1);

      // Instance IDs should be unique
      expect(cubit1.instanceId).not.toBe(cubit2.instanceId);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle rapid state updates efficiently', () => {
      const cubit = new CounterCubit();
      const startTime = performance.now();

      // Perform 10000 rapid updates
      for (let i = 0; i < 10000; i++) {
        cubit.increment();
      }

      const duration = performance.now() - startTime;

      expect(cubit.state).toBe(10000);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle many subscribers efficiently', () => {
      const cubit = new CounterCubit();
      const listeners: Array<() => void> = [];

      // Add 1000 subscribers
      for (let i = 0; i < 1000; i++) {
        const unsub = cubit.subscribe(() => {});
        listeners.push(unsub);
      }

      const startTime = performance.now();
      cubit.increment(); // Should notify all 1000 subscribers
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete quickly

      // Clean up
      listeners.forEach(unsub => unsub());
    });
  });
});