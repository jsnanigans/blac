/**
 * Vertex Tests
 * Testing event-driven state container (Bloc pattern)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vertex, CounterVertex, AuthVertex, type AuthState } from './Vertex';
import { StateContainer } from './StateContainer';
import type { BaseEvent } from '../types/events';

// Test events
class AddEvent implements BaseEvent {
  readonly type = 'add';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number) {}
}

class MultiplyEvent implements BaseEvent {
  readonly type = 'multiply';
  readonly timestamp = Date.now();
  constructor(public readonly factor: number) {}
}

class SetValueEvent implements BaseEvent {
  readonly type = 'setValue';
  readonly timestamp = Date.now();
  constructor(public readonly value: number) {}
}

class ErrorEvent implements BaseEvent {
  readonly type = 'error';
  readonly timestamp = Date.now();
}

// Test Vertex implementation
class TestVertex extends Vertex<number> {
  public errorCount = 0;
  public lastError: Error | null = null;

  constructor(initialValue = 0) {
    super(initialValue);

    this.on(AddEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(MultiplyEvent, (event, emit) => {
      emit(this.state * event.factor);
    });

    this.on(SetValueEvent, (event, emit) => {
      emit(event.value);
    });

    this.on(ErrorEvent, () => {
      throw new Error('Intentional error');
    });
  }

  protected onEventError(event: BaseEvent, error: Error): void {
    this.errorCount++;
    this.lastError = error;
  }
}

// Test Vertex with multiple handlers for same event
class MultiHandlerVertex extends Vertex<string[]> {
  public callOrder: string[] = [];

  constructor() {
    super([]);

    this.on(AddEvent, (event, emit) => {
      this.callOrder.push('handler1');
      emit([...this.state, `handler1:${event.amount}`]);
    });

    this.on(AddEvent, (event, emit) => {
      this.callOrder.push('handler2');
      emit([...this.state, `handler2:${event.amount}`]);
    });

    this.on(AddEvent, (event, emit) => {
      this.callOrder.push('handler3');
      emit([...this.state, `handler3:${event.amount}`]);
    });
  }
}

// Test Vertex for event queue testing
class QueueTestVertex extends Vertex<number[]> {
  constructor() {
    super([]);

    this.on(AddEvent, (event, emit) => {
      const newState = [...this.state, event.amount];
      emit(newState);

      // Trigger another event from within handler
      if (event.amount < 3) {
        this.add(new AddEvent(event.amount + 1));
      }
    });
  }
}

describe('Vertex', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  // Event System

  describe('Event System', () => {
    describe('on() - Event Registration', () => {
      it('should register event handlers', () => {
        const vertex = new TestVertex(10);

        // Handler should be registered (we test by dispatching)
        vertex.add(new AddEvent(5));

        expect(vertex.state).toBe(15);
      });

      it('should register multiple handlers for same event', () => {
        const vertex = new MultiHandlerVertex();

        vertex.add(new AddEvent(1));

        expect(vertex.state.length).toBe(3);
        expect(vertex.state).toEqual([
          'handler1:1',
          'handler2:1',
          'handler3:1',
        ]);
      });

      it('should execute handlers in registration order', () => {
        const vertex = new MultiHandlerVertex();

        vertex.add(new AddEvent(1));

        expect(vertex.callOrder).toEqual(['handler1', 'handler2', 'handler3']);
      });
    });

    describe('add() - Event Processing', () => {
      it('should process events synchronously', () => {
        const vertex = new TestVertex(10);
        const listener = vi.fn();
        vertex.subscribe(listener);

        vertex.add(new AddEvent(5));

        // Should be processed immediately
        expect(vertex.state).toBe(15);
        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith(15);
      });

      it('should handle multiple events in sequence', () => {
        const vertex = new TestVertex(10);

        vertex.add(new AddEvent(5));
        vertex.add(new MultiplyEvent(2));
        vertex.add(new AddEvent(10));

        expect(vertex.state).toBe(40); // (10 + 5) * 2 + 10 = 40
      });

      it('should process events with queuing', () => {
        const vertex = new QueueTestVertex();

        vertex.add(new AddEvent(1));

        // Should process 1, then 2, then 3
        expect(vertex.state).toEqual([1, 2, 3]);
      });
    });

    describe('Event handlers receive correct emit function', () => {
      it('should provide emit function that updates state', () => {
        const vertex = new TestVertex(0);

        vertex.add(new SetValueEvent(42));

        expect(vertex.state).toBe(42);
      });

      it('should allow multiple emissions in one handler', () => {
        class MultiEmitVertex extends Vertex<number> {
          constructor() {
            super(0);

            this.on(AddEvent, (event, emit) => {
              emit(this.state + 1);
              emit(this.state + 1);
              emit(this.state + 1);
            });
          }
        }

        const vertex = new MultiEmitVertex();
        const listener = vi.fn();
        vertex.subscribe(listener);

        vertex.add(new AddEvent(1));

        // Each emit should trigger listener
        expect(listener).toHaveBeenCalledTimes(3);
        expect(vertex.state).toBe(3);
      });
    });

    describe('Error handling', () => {
      it('should call onEventError hook when handler throws', () => {
        const vertex = new TestVertex(10);

        vertex.add(new ErrorEvent());

        expect(vertex.errorCount).toBe(1);
        expect(vertex.lastError).toBeInstanceOf(Error);
        expect(vertex.lastError?.message).toBe('Intentional error');
      });

      it('should not crash on handler error', () => {
        const vertex = new TestVertex(10);

        expect(() => vertex.add(new ErrorEvent())).not.toThrow();
      });

      it('should continue processing after error', () => {
        const vertex = new TestVertex(10);

        vertex.add(new ErrorEvent());
        vertex.add(new AddEvent(5));

        expect(vertex.state).toBe(15);
      });
    });

    describe('No handler warning in debug mode', () => {
      it('should warn when no handler registered (debug mode)', () => {
        const consoleWarnSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {});

        class UnhandledEvent implements BaseEvent {
          readonly type = 'unhandled';
          readonly timestamp = Date.now();
        }

        const vertex = new TestVertex(10);
        vertex.initiConfig({ debug: true });

        vertex.add(new UnhandledEvent());

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'No handler registered for event: UnhandledEvent',
          ),
        );

        consoleWarnSpy.mockRestore();
      });

      it('should not warn in non-debug mode', () => {
        const consoleWarnSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {});

        class UnhandledEvent implements BaseEvent {
          readonly type = 'unhandled';
          readonly timestamp = Date.now();
        }

        const vertex = new TestVertex(10);
        // debug mode is off by default

        vertex.add(new UnhandledEvent());

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
      expect(counter.state).toBe(0);
    });

    it('should handle increment event', () => {
      counter.increment();
      expect(counter.state).toBe(1);

      counter.increment(5);
      expect(counter.state).toBe(6);
    });

    it('should handle decrement event', () => {
      counter.increment(10);
      counter.decrement(3);

      expect(counter.state).toBe(7);
    });

    it('should handle reset event', () => {
      counter.increment(100);
      counter.reset();

      expect(counter.state).toBe(0);
    });

    it('should notify listeners on events', () => {
      const listener = vi.fn();
      counter.subscribe(listener);

      counter.increment();
      counter.increment(5);
      counter.decrement(2);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, 1);
      expect(listener).toHaveBeenNthCalledWith(2, 6);
      expect(listener).toHaveBeenNthCalledWith(3, 4);
    });

    it('should maintain this binding for arrow functions', () => {
      const increment = counter.increment;
      const decrement = counter.decrement;
      const reset = counter.reset;

      increment(10);
      expect(counter.state).toBe(10);

      decrement(3);
      expect(counter.state).toBe(7);

      reset();
      expect(counter.state).toBe(0);
    });

    it('should handle rapid event dispatches', () => {
      for (let i = 0; i < 100; i++) {
        counter.increment();
      }

      expect(counter.state).toBe(100);

      for (let i = 0; i < 50; i++) {
        counter.decrement();
      }

      expect(counter.state).toBe(50);
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
      expect(listener).toHaveBeenCalledWith(1);

      unsubscribe();
      vertex.increment();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('should support disposal', () => {
      const vertex = new TestVertex(10);

      vertex.dispose();

      expect(vertex.isDisposed).toBe(true);

      // Add event after disposal - doesn't throw, but handler's emit will fail
      vertex.add(new AddEvent(5));

      // State should not change, and error should be caught
      expect(vertex.state).toBe(10);
      expect(vertex.errorCount).toBe(1);
      expect(vertex.lastError?.message).toContain(
        'Cannot emit state from disposed container',
      );
    });

    it('should work with attach pattern', () => {
      const vertex1 = CounterVertex.resolve();
      const vertex2 = CounterVertex.resolve();

      expect(vertex1).toBe(vertex2);

      vertex1.increment(5);
      expect(vertex2.state).toBe(5);

      CounterVertex.release();
      CounterVertex.release();

      expect(CounterVertex.getAll()).toHaveLength(0);
    });
  });

  // Edge Cases

  describe('Edge Cases', () => {
    it('should handle event with no handlers gracefully', () => {
      class NoHandlerEvent implements BaseEvent {
        readonly type = 'noHandler';
        readonly timestamp = Date.now();
      }

      const vertex = new TestVertex(10);

      expect(() => vertex.add(new NoHandlerEvent())).not.toThrow();
      expect(vertex.state).toBe(10); // State unchanged
    });

    it('should handle handler that emits multiple times', () => {
      class MultiEmitVertex extends Vertex<number> {
        constructor() {
          super(0);

          this.on(AddEvent, (event, emit) => {
            for (let i = 0; i < event.amount; i++) {
              emit(this.state + 1);
            }
          });
        }
      }

      const vertex = new MultiEmitVertex();
      vertex.add(new AddEvent(5));

      expect(vertex.state).toBe(5);
    });

    it('should handle complex event queue scenarios', () => {
      class ComplexQueueVertex extends Vertex<number[]> {
        constructor() {
          super([]);

          this.on(AddEvent, (event, emit) => {
            emit([...this.state, event.amount]);

            // Trigger other events
            if (event.amount === 1) {
              this.add(new AddEvent(2));
              this.add(new AddEvent(3));
            }
          });
        }
      }

      const vertex = new ComplexQueueVertex();
      vertex.add(new AddEvent(1));

      expect(vertex.state).toEqual([1, 2, 3]);
    });

    it('should maintain correct state through rapid event dispatches', () => {
      const vertex = new TestVertex(0);
      const expectedFinal = 5050; // Sum of 1..100

      for (let i = 1; i <= 100; i++) {
        vertex.add(new AddEvent(i));
      }

      expect(vertex.state).toBe(expectedFinal);
    });

    it('should handle event after disposal', () => {
      const vertex = new TestVertex(10);

      vertex.dispose();

      // Adding event doesn't throw, but handler's emit will fail and be caught
      expect(() => vertex.add(new AddEvent(5))).not.toThrow();

      // State should remain unchanged
      expect(vertex.state).toBe(10);

      // Error should be captured via onEventError
      expect(vertex.errorCount).toBe(1);
    });
  });
});
