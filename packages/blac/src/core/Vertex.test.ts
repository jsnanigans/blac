/**
 * Vertex Tests
 * Testing event-driven state container with discriminated union events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vertex } from './Vertex';
import { StateContainer } from './StateContainer';
import type { EventWithMetadata } from '../types/events';

// Counter Events (discriminated union)
type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });

    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (event, emit) => {
        emit({ count: this.state.count - event.amount });
      },
      reset: (_, emit) => {
        emit({ count: 0 });
      },
    });
  }

  increment = (amount = 1) => {
    this.add({ type: 'increment', amount });
  };

  decrement = (amount = 1) => {
    this.add({ type: 'decrement', amount });
  };

  reset = () => {
    this.add({ type: 'reset' });
  };
}

// Auth Events (discriminated union)
type AuthEvent =
  | { type: 'login'; email: string; password: string }
  | { type: 'logout' };

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; name: string; email: string } | null;
  error: string | null;
}

class AuthVertex extends Vertex<AuthState, AuthEvent> {
  constructor() {
    super({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });

    this.createHandlers({
      login: (event, emit) => {
        emit({ ...this.state, isLoading: true, error: null });

        if (
          event.email === 'user@example.com' &&
          event.password === 'password'
        ) {
          emit({
            isAuthenticated: true,
            isLoading: false,
            user: { id: '123', name: 'Test User', email: 'user@example.com' },
            error: null,
          });
        } else {
          emit({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: 'Invalid credentials',
          });
        }
      },
      logout: (_, emit) => {
        emit({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      },
    });
  }

  login = (email: string, password: string) => {
    this.add({ type: 'login', email, password });
  };

  logout = () => {
    this.add({ type: 'logout' });
  };
}

// Test Events (discriminated union)
type TestEvent =
  | { type: 'add'; amount: number }
  | { type: 'multiply'; factor: number }
  | { type: 'setValue'; value: number }
  | { type: 'error' };

class TestVertex extends Vertex<{ value: number }, TestEvent> {
  public errorCount = 0;
  public lastError: Error | null = null;

  constructor(initialValue = 0) {
    super({ value: initialValue });

    this.createHandlers({
      add: (event, emit) => {
        emit({ value: this.state.value + event.amount });
      },
      multiply: (event, emit) => {
        emit({ value: this.state.value * event.factor });
      },
      setValue: (event, emit) => {
        emit({ value: event.value });
      },
      error: () => {
        throw new Error('Intentional error');
      },
    });
  }

  protected onEventError(
    _event: EventWithMetadata<TestEvent>,
    error: Error,
  ): void {
    this.errorCount++;
    this.lastError = error;
  }
}

// Queue Test Events
type QueueEvent = { type: 'add'; amount: number };

class QueueTestVertex extends Vertex<{ values: number[] }, QueueEvent> {
  constructor() {
    super({ values: [] });

    this.createHandlers({
      add: (event, emit) => {
        const newState = { values: [...this.state.values, event.amount] };
        emit(newState);

        // Trigger another event from within handler
        if (event.amount < 3) {
          this.add({ type: 'add', amount: event.amount + 1 });
        }
      },
    });
  }
}

describe('Vertex', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  // Event System

  describe('Event System', () => {
    describe('createHandlers() - Event Registration', () => {
      it('should register event handlers via createHandlers', () => {
        const vertex = new TestVertex(10);

        // Handler should be registered (we test by dispatching)
        vertex.add({ type: 'add', amount: 5 });

        expect(vertex.state).toEqual({ value: 15 });
      });

      it('should enforce exhaustive handler coverage at compile time', () => {
        // This test is primarily for documentation - TypeScript enforces
        // that all event types must have handlers in createHandlers()
        const vertex = new CounterVertex();
        expect(vertex.state).toEqual({ count: 0 });
      });
    });

    describe('add() - Event Processing', () => {
      it('should process events synchronously', () => {
        const vertex = new TestVertex(10);
        const listener = vi.fn();
        vertex.subscribe(listener);

        vertex.add({ type: 'add', amount: 5 });

        // Should be processed immediately
        expect(vertex.state).toEqual({ value: 15 });
        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith({ value: 15 });
      });

      it('should handle multiple events in sequence', () => {
        const vertex = new TestVertex(10);

        vertex.add({ type: 'add', amount: 5 });
        vertex.add({ type: 'multiply', factor: 2 });
        vertex.add({ type: 'add', amount: 10 });

        expect(vertex.state).toEqual({ value: 40 }); // (10 + 5) * 2 + 10 = 40
      });

      it('should process events with queuing', () => {
        const vertex = new QueueTestVertex();

        vertex.add({ type: 'add', amount: 1 });

        // Should process 1, then 2, then 3
        expect(vertex.state).toEqual({ values: [1, 2, 3] });
      });

      it('should auto-add timestamp to events', () => {
        const before = Date.now();

        type TimestampEvent = { type: 'test' };

        let capturedEvent: EventWithMetadata<TimestampEvent> | null = null;

        class TimestampVertex extends Vertex<
          { value: number },
          TimestampEvent
        > {
          constructor() {
            super({ value: 0 });
            this.createHandlers({
              test: (event, emit) => {
                capturedEvent = event as EventWithMetadata<TimestampEvent>;
                emit(this.state);
              },
            });
          }
        }

        const vertex = new TimestampVertex();
        vertex.add({ type: 'test' });

        const after = Date.now();

        expect(capturedEvent).not.toBeNull();
        expect(capturedEvent!.timestamp).toBeGreaterThanOrEqual(before);
        expect(capturedEvent!.timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('Event handlers receive correct emit function', () => {
      it('should provide emit function that updates state', () => {
        const vertex = new TestVertex(0);

        vertex.add({ type: 'setValue', value: 42 });

        expect(vertex.state).toEqual({ value: 42 });
      });

      it('should allow multiple emissions in one handler', () => {
        type MultiEmitEvent = { type: 'add'; amount: number };

        class MultiEmitVertex extends Vertex<
          { value: number },
          MultiEmitEvent
        > {
          constructor() {
            super({ value: 0 });

            this.createHandlers({
              add: (_, emit) => {
                emit({ value: this.state.value + 1 });
                emit({ value: this.state.value + 1 });
                emit({ value: this.state.value + 1 });
              },
            });
          }
        }

        const vertex = new MultiEmitVertex();
        const listener = vi.fn();
        vertex.subscribe(listener);

        vertex.add({ type: 'add', amount: 1 });

        // Each emit should trigger listener
        expect(listener).toHaveBeenCalledTimes(3);
        expect(vertex.state).toEqual({ value: 3 });
      });
    });

    describe('Error handling', () => {
      it('should call onEventError hook when handler throws', () => {
        const vertex = new TestVertex(10);

        vertex.add({ type: 'error' });

        expect(vertex.errorCount).toBe(1);
        expect(vertex.lastError).toBeInstanceOf(Error);
        expect(vertex.lastError?.message).toBe('Intentional error');
      });

      it('should not crash on handler error', () => {
        const vertex = new TestVertex(10);

        expect(() => vertex.add({ type: 'error' })).not.toThrow();
      });

      it('should continue processing after error', () => {
        const vertex = new TestVertex(10);

        vertex.add({ type: 'error' });
        vertex.add({ type: 'add', amount: 5 });

        expect(vertex.state).toEqual({ value: 15 });
      });
    });

    describe('No handler warning in debug mode', () => {
      it('should warn when no handler registered (debug mode)', () => {
        const consoleWarnSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {});

        // Create a vertex that doesn't handle all event types it receives
        type PartialEvent = { type: 'handled' } | { type: 'unhandled' };

        class PartialVertex extends Vertex<{ value: number }, PartialEvent> {
          constructor() {
            super({ value: 0 });
            // Only register handler for 'handled', not 'unhandled'
            // Note: In production, TypeScript would require all handlers
            // This is simulated by casting to bypass type checking
            (this as any).handlers = new Map([['handled', () => {}]]);
          }
        }

        const vertex = new PartialVertex();
        vertex.initConfig({ debug: true });

        vertex.add({ type: 'unhandled' });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'No handler registered for event type: unhandled',
          ),
        );

        consoleWarnSpy.mockRestore();
      });

      it('should not warn in non-debug mode', () => {
        const consoleWarnSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {});

        type PartialEvent = { type: 'handled' } | { type: 'unhandled' };

        class PartialVertex extends Vertex<{ value: number }, PartialEvent> {
          constructor() {
            super({ value: 0 });
            (this as any).handlers = new Map([['handled', () => {}]]);
          }
        }

        const vertex = new PartialVertex();
        // debug mode is off by default

        vertex.add({ type: 'unhandled' });

        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });
    });
  });

  // CounterVertex Example

  describe('CounterVertex Example', () => {
    let counter: CounterVertex;

    beforeEach(() => {
      counter = new CounterVertex();
    });

    it('should initialize with zero', () => {
      expect(counter.state).toEqual({ count: 0 });
    });

    it('should handle increment event', () => {
      counter.increment();
      expect(counter.state).toEqual({ count: 1 });

      counter.increment(5);
      expect(counter.state).toEqual({ count: 6 });
    });

    it('should handle decrement event', () => {
      counter.increment(10);
      counter.decrement(3);

      expect(counter.state).toEqual({ count: 7 });
    });

    it('should handle reset event', () => {
      counter.increment(100);
      counter.reset();

      expect(counter.state).toEqual({ count: 0 });
    });

    it('should notify listeners on events', () => {
      const listener = vi.fn();
      counter.subscribe(listener);

      counter.increment();
      counter.increment(5);
      counter.decrement(2);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(listener).toHaveBeenNthCalledWith(2, { count: 6 });
      expect(listener).toHaveBeenNthCalledWith(3, { count: 4 });
    });

    it('should maintain this binding for arrow functions', () => {
      const increment = counter.increment;
      const decrement = counter.decrement;
      const reset = counter.reset;

      increment(10);
      expect(counter.state).toEqual({ count: 10 });

      decrement(3);
      expect(counter.state).toEqual({ count: 7 });

      reset();
      expect(counter.state).toEqual({ count: 0 });
    });

    it('should handle rapid event dispatches', () => {
      for (let i = 0; i < 100; i++) {
        counter.increment();
      }

      expect(counter.state).toEqual({ count: 100 });

      for (let i = 0; i < 50; i++) {
        counter.decrement();
      }

      expect(counter.state).toEqual({ count: 50 });
    });
  });

  // AuthVertex Example

  describe('AuthVertex Example', () => {
    let auth: AuthVertex;

    beforeEach(() => {
      auth = new AuthVertex();
    });

    describe('Initial state', () => {
      it('should start unauthenticated', () => {
        expect(auth.state.isAuthenticated).toBe(false);
        expect(auth.state.isLoading).toBe(false);
        expect(auth.state.user).toBeNull();
        expect(auth.state.error).toBeNull();
      });
    });

    describe('Login with valid credentials', () => {
      it('should authenticate successfully', () => {
        const states: AuthState[] = [];
        auth.subscribe((state) => states.push(state));

        auth.login('user@example.com', 'password');

        // Should have intermediate loading state and final success state
        expect(states.length).toBeGreaterThanOrEqual(1);

        const finalState = auth.state;
        expect(finalState.isAuthenticated).toBe(true);
        expect(finalState.isLoading).toBe(false);
        expect(finalState.user).toEqual({
          id: '123',
          name: 'Test User',
          email: 'user@example.com',
        });
        expect(finalState.error).toBeNull();
      });

      it('should set loading state during authentication', () => {
        const states: AuthState[] = [];
        auth.subscribe((state) => states.push(state));

        auth.login('user@example.com', 'password');

        // First state should be loading
        expect(states[0].isLoading).toBe(true);
        expect(states[0].error).toBeNull();
      });
    });

    describe('Login with invalid credentials', () => {
      it('should fail with error', () => {
        auth.login('wrong@example.com', 'wrong');

        expect(auth.state.isAuthenticated).toBe(false);
        expect(auth.state.isLoading).toBe(false);
        expect(auth.state.user).toBeNull();
        expect(auth.state.error).toBe('Invalid credentials');
      });

      it('should set loading state then error', () => {
        const states: AuthState[] = [];
        auth.subscribe((state) => states.push(state));

        auth.login('wrong@example.com', 'wrong');

        // Should have loading state
        expect(states[0].isLoading).toBe(true);

        // Final state should have error
        const finalState = auth.state;
        expect(finalState.isLoading).toBe(false);
        expect(finalState.error).toBe('Invalid credentials');
      });
    });

    describe('Logout', () => {
      it('should clear authentication state', () => {
        // Login first
        auth.login('user@example.com', 'password');
        expect(auth.state.isAuthenticated).toBe(true);

        // Then logout
        auth.logout();

        expect(auth.state.isAuthenticated).toBe(false);
        expect(auth.state.user).toBeNull();
        expect(auth.state.error).toBeNull();
        expect(auth.state.isLoading).toBe(false);
      });

      it('should work even when not logged in', () => {
        expect(() => auth.logout()).not.toThrow();
        expect(auth.state.isAuthenticated).toBe(false);
      });
    });

    describe('Loading state transitions', () => {
      it('should transition correctly through states', () => {
        const states: AuthState[] = [];
        auth.subscribe((state) => states.push(state));

        auth.login('user@example.com', 'password');

        // Check state transitions
        expect(states.length).toBeGreaterThanOrEqual(2);

        // First state: loading
        expect(states[0]).toMatchObject({
          isLoading: true,
          error: null,
        });

        // Final state: success
        const finalState = states[states.length - 1];
        expect(finalState).toMatchObject({
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      });

      it('should handle login -> logout -> login flow', () => {
        auth.login('user@example.com', 'password');
        expect(auth.state.isAuthenticated).toBe(true);

        auth.logout();
        expect(auth.state.isAuthenticated).toBe(false);

        auth.login('user@example.com', 'password');
        expect(auth.state.isAuthenticated).toBe(true);
      });
    });

    describe('Integration scenarios', () => {
      it('should handle multiple failed login attempts', () => {
        auth.login('wrong1', 'wrong1');
        expect(auth.state.error).toBe('Invalid credentials');

        auth.login('wrong2', 'wrong2');
        expect(auth.state.error).toBe('Invalid credentials');

        auth.login('user@example.com', 'password');
        expect(auth.state.error).toBeNull();
        expect(auth.state.isAuthenticated).toBe(true);
      });

      it('should maintain state consistency', () => {
        const listener = vi.fn();
        auth.subscribe(listener);

        // Multiple operations
        auth.login('wrong', 'wrong');
        auth.login('user@example.com', 'password');
        auth.logout();
        auth.login('user@example.com', 'password');

        // Each operation should trigger state changes
        expect(listener.mock.calls.length).toBeGreaterThan(4);

        // Final state should be authenticated
        expect(auth.state.isAuthenticated).toBe(true);
      });
    });
  });

  // Integration with StateContainer

  describe('Integration with StateContainer', () => {
    it('should extend StateContainer properly', () => {
      const vertex = new CounterVertex();

      expect(vertex).toBeInstanceOf(Vertex);
      expect(vertex).toBeInstanceOf(StateContainer);
    });

    it('should support subscription like StateContainer', () => {
      const vertex = new CounterVertex();
      const listener = vi.fn();

      const unsubscribe = vertex.subscribe(listener);

      vertex.increment();
      expect(listener).toHaveBeenCalledWith({ count: 1 });

      unsubscribe();
      vertex.increment();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('should support disposal', () => {
      const vertex = new TestVertex(10);

      vertex.dispose();

      expect(vertex.isDisposed).toBe(true);

      // Add event after disposal - doesn't throw, but handler's emit will fail
      vertex.add({ type: 'add', amount: 5 });

      // State should not change, and error should be caught
      expect(vertex.state).toEqual({ value: 10 });
      expect(vertex.errorCount).toBe(1);
      expect(vertex.lastError?.message).toContain(
        'Cannot emit state from disposed container',
      );
    });

    it('should work with resolve/release pattern', () => {
      const vertex1 = CounterVertex.resolve();
      const vertex2 = CounterVertex.resolve();

      expect(vertex1).toBe(vertex2);

      vertex1.increment(5);
      expect(vertex2.state).toEqual({ count: 5 });

      CounterVertex.release();
      CounterVertex.release();

      expect(CounterVertex.getAll()).toHaveLength(0);
    });
  });

  // Edge Cases

  describe('Edge Cases', () => {
    it('should handle handler that emits multiple times', () => {
      type MultiEmitEvent = { type: 'add'; amount: number };

      class MultiEmitVertex extends Vertex<{ value: number }, MultiEmitEvent> {
        constructor() {
          super({ value: 0 });

          this.createHandlers({
            add: (event, emit) => {
              for (let i = 0; i < event.amount; i++) {
                emit({ value: this.state.value + 1 });
              }
            },
          });
        }
      }

      const vertex = new MultiEmitVertex();
      vertex.add({ type: 'add', amount: 5 });

      expect(vertex.state).toEqual({ value: 5 });
    });

    it('should handle complex event queue scenarios', () => {
      type ComplexEvent = { type: 'add'; amount: number };

      class ComplexQueueVertex extends Vertex<
        { values: number[] },
        ComplexEvent
      > {
        constructor() {
          super({ values: [] });

          this.createHandlers({
            add: (event, emit) => {
              emit({ values: [...this.state.values, event.amount] });

              // Trigger other events
              if (event.amount === 1) {
                this.add({ type: 'add', amount: 2 });
                this.add({ type: 'add', amount: 3 });
              }
            },
          });
        }
      }

      const vertex = new ComplexQueueVertex();
      vertex.add({ type: 'add', amount: 1 });

      expect(vertex.state).toEqual({ values: [1, 2, 3] });
    });

    it('should maintain correct state through rapid event dispatches', () => {
      const vertex = new TestVertex(0);
      const expectedFinal = 5050; // Sum of 1..100

      for (let i = 1; i <= 100; i++) {
        vertex.add({ type: 'add', amount: i });
      }

      expect(vertex.state).toEqual({ value: expectedFinal });
    });

    it('should handle event after disposal', () => {
      const vertex = new TestVertex(10);

      vertex.dispose();

      // Adding event doesn't throw, but handler's emit will fail and be caught
      expect(() => vertex.add({ type: 'add', amount: 5 })).not.toThrow();

      // State should remain unchanged
      expect(vertex.state).toEqual({ value: 10 });

      // Error should be captured via onEventError
      expect(vertex.errorCount).toBe(1);
    });
  });

  // Type Safety (compile-time tests documented here)

  describe('Type Safety', () => {
    it('should provide type narrowing in handlers', () => {
      // This test verifies that TypeScript properly narrows event types
      // in handlers. The actual type checking happens at compile time.

      type NarrowingEvent =
        | { type: 'withNumber'; value: number }
        | { type: 'withString'; value: string }
        | { type: 'noPayload' };

      let capturedNumber: number | null = null;
      let capturedString: string | null = null;

      class NarrowingVertex extends Vertex<{ result: string }, NarrowingEvent> {
        constructor() {
          super({ result: '' });

          this.createHandlers({
            withNumber: (event, emit) => {
              // event.value is typed as number here
              capturedNumber = event.value;
              emit({ result: `number: ${event.value}` });
            },
            withString: (event, emit) => {
              // event.value is typed as string here
              capturedString = event.value;
              emit({ result: `string: ${event.value}` });
            },
            noPayload: (_, emit) => {
              emit({ result: 'no payload' });
            },
          });
        }
      }

      const vertex = new NarrowingVertex();

      vertex.add({ type: 'withNumber', value: 42 });
      expect(capturedNumber).toBe(42);
      expect(vertex.state.result).toBe('number: 42');

      vertex.add({ type: 'withString', value: 'hello' });
      expect(capturedString).toBe('hello');
      expect(vertex.state.result).toBe('string: hello');

      vertex.add({ type: 'noPayload' });
      expect(vertex.state.result).toBe('no payload');
    });

    it('should provide autocomplete for add() event types', () => {
      // This test documents that add() accepts the full event union
      // and provides autocomplete for event types and their payloads

      const counter = new CounterVertex();

      // All these should compile and work
      counter.add({ type: 'increment', amount: 1 });
      counter.add({ type: 'decrement', amount: 1 });
      counter.add({ type: 'reset' });

      expect(counter.state.count).toBe(0);
    });
  });
});
