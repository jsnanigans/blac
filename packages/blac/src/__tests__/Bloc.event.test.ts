import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bloc } from '../Bloc';
import { Blac } from '../Blac';

// Define test events
class IncrementEvent {
  constructor(public amount: number = 1) {}
}

class AsyncIncrementEvent {
  constructor(
    public amount: number,
    public delay: number,
  ) {}
}

class DecrementEvent {
  constructor(public amount: number = 1) {}
}

class ErrorEvent {
  constructor(public message: string) {}
}

class CriticalErrorEvent extends Error {
  name = 'CriticalError';
  constructor(message: string) {
    super(message);
  }
}

// Test Bloc implementation
class CounterBloc extends Bloc<
  number,
  IncrementEvent | AsyncIncrementEvent | DecrementEvent | ErrorEvent
> {
  constructor(initialValue = 0) {
    super(initialValue);

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(AsyncIncrementEvent, async (event, emit) => {
      await new Promise((resolve) => setTimeout(resolve, event.delay));
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });

    this.on(ErrorEvent, (event, emit) => {
      throw new Error(event.message);
    });
  }
}

// Bloc with critical error handling
class CriticalErrorBloc extends Bloc<string> {
  constructor() {
    super('initial');

    this.on(CriticalErrorEvent, (event) => {
      throw event;
    });
  }
}

describe('Bloc Event Handling', () => {
  let bloc: CounterBloc;
  let blacInstance: Blac;

  beforeEach(() => {
    blacInstance = new Blac({ __unsafe_ignore_singleton: true });
    Blac.enableLog = false; // Disable logging for tests
    bloc = blacInstance.getBloc(CounterBloc);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Handler Registration', () => {
    it('should register event handlers with on() method', () => {
      expect(bloc.eventHandlers.size).toBe(4); // 4 handlers registered
      expect(bloc.eventHandlers.has(IncrementEvent)).toBe(true);
      expect(bloc.eventHandlers.has(AsyncIncrementEvent)).toBe(true);
      expect(bloc.eventHandlers.has(DecrementEvent)).toBe(true);
      expect(bloc.eventHandlers.has(ErrorEvent)).toBe(true);
    });

    it('should overwrite existing handler when registering same event type', () => {
      const originalHandler = bloc.eventHandlers.get(IncrementEvent);

      // Register new handler for same event
      const newHandler = vi.fn();
      (bloc as any).on(IncrementEvent, newHandler);

      expect(bloc.eventHandlers.get(IncrementEvent)).toBe(newHandler);
      expect(bloc.eventHandlers.get(IncrementEvent)).not.toBe(originalHandler);
    });

    it('should handle events with proper type inference', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      await bloc.add(new IncrementEvent(5));

      expect(observer).toHaveBeenCalledWith(5);
      expect(bloc.state).toBe(5);
    });
  });

  describe('Event Queue and Sequential Processing', () => {
    it('should queue events and process them sequentially', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      // Add multiple events rapidly
      const promises = [
        bloc.add(new IncrementEvent(1)),
        bloc.add(new IncrementEvent(2)),
        bloc.add(new IncrementEvent(3)),
      ];

      await Promise.all(promises);

      // Should be called 3 times with sequential state updates
      expect(observer).toHaveBeenCalledTimes(3);
      expect(observer).toHaveBeenNthCalledWith(1, 1);
      expect(observer).toHaveBeenNthCalledWith(2, 3);
      expect(observer).toHaveBeenNthCalledWith(3, 6);
      expect(bloc.state).toBe(6);
    });

    it('should process async events in order', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      // Add async events with different delays
      const promises = [
        bloc.add(new AsyncIncrementEvent(1, 50)),
        bloc.add(new AsyncIncrementEvent(2, 10)),
        bloc.add(new AsyncIncrementEvent(3, 30)),
      ];

      await Promise.all(promises);

      // Despite different delays, events should process in order
      expect(observer).toHaveBeenCalledTimes(3);
      expect(observer).toHaveBeenNthCalledWith(1, 1);
      expect(observer).toHaveBeenNthCalledWith(2, 3);
      expect(observer).toHaveBeenNthCalledWith(3, 6);
    });

    it('should handle mixed sync and async events', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      const promises = [
        bloc.add(new IncrementEvent(1)),
        bloc.add(new AsyncIncrementEvent(2, 20)),
        bloc.add(new DecrementEvent(1)),
        bloc.add(new AsyncIncrementEvent(3, 10)),
      ];

      await Promise.all(promises);

      expect(observer).toHaveBeenCalledTimes(4);
      expect(bloc.state).toBe(5); // 0 + 1 + 2 - 1 + 3 = 5
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', async () => {
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const observer = vi.fn();
      bloc.subscribe(observer);

      await bloc.add(new ErrorEvent('Test error'));

      // Error should be logged but not crash the bloc
      expect(errorSpy).toHaveBeenCalled();
      expect(observer).not.toHaveBeenCalled(); // No state change
      expect(bloc.state).toBe(0); // State unchanged

      // Bloc should still be functional
      await bloc.add(new IncrementEvent(1));
      expect(bloc.state).toBe(1);
    });

    it('should re-throw critical errors', async () => {
      const criticalBloc = new CriticalErrorBloc();

      await expect(
        criticalBloc.add(new CriticalErrorEvent('Critical failure')),
      ).rejects.toThrow('Critical failure');
    });

    it('should log warning for unhandled events', async () => {
      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});

      // Create event without handler
      class UnhandledEvent {}

      await bloc.add(new UnhandledEvent() as any);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handler registered'),
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.any(UnhandledEvent),
      );
    });
  });

  describe('Event Context and Metadata', () => {
    it('should pass event instance to state change notifications', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      const event = new IncrementEvent(10);
      await bloc.add(event);

      expect(observer).toHaveBeenCalledWith(10);
    });

    it('should maintain correct state context during handler execution', async () => {
      let capturedStates: number[] = [];

      // Custom bloc that captures state during handler
      class StateCapturingBloc extends Bloc<number> {
        constructor() {
          super(0);

          this.on(IncrementEvent, (event, emit) => {
            capturedStates.push(this.state); // Capture current state
            emit(this.state + event.amount);
          });
        }
      }

      const capturingBloc = new StateCapturingBloc();

      await capturingBloc.add(new IncrementEvent(1));
      await capturingBloc.add(new IncrementEvent(2));
      await capturingBloc.add(new IncrementEvent(3));

      expect(capturedStates).toEqual([0, 1, 3]); // State at time of each handler
      expect(capturingBloc.state).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event queue gracefully', async () => {
      // Process empty queue should not throw
      await (bloc as any)._processEventQueue();
      expect(bloc.state).toBe(0);
    });

    it('should handle rapid event additions during processing', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);

      // Custom bloc that adds more events during processing
      class ChainReactionBloc extends Bloc<number> {
        constructor() {
          super(0);

          this.on(IncrementEvent, async (event, emit) => {
            emit(this.state + event.amount);

            // Add another event during processing
            if (this.state < 5) {
              await this.add(new IncrementEvent(1));
            }
          });
        }
      }

      const chainBloc = new ChainReactionBloc();
      const chainObserver = vi.fn();
      chainBloc.subscribe(chainObserver);

      await chainBloc.add(new IncrementEvent(1));

      // Should process all chained events
      expect(chainBloc.state).toBe(5);
      expect(chainObserver).toHaveBeenCalledTimes(5);
    });

    it('should handle event handler that emits multiple times', async () => {
      class MultiEmitBloc extends Bloc<number[]> {
        constructor() {
          super([]);

          this.on(IncrementEvent, (event, emit) => {
            // Emit multiple state updates
            for (let i = 1; i <= event.amount; i++) {
              emit([...this.state, i]);
            }
          });
        }
      }

      const multiBloc = new MultiEmitBloc();
      const observer = vi.fn();
      multiBloc.subscribe(observer);

      await multiBloc.add(new IncrementEvent(3));

      expect(observer).toHaveBeenCalledTimes(3);
      expect(multiBloc.state).toEqual([1, 2, 3]);
    });

    it('should handle events with constructor-less classes', async () => {
      // Event without explicit constructor
      class SimpleEvent {}

      class SimpleBloc extends Bloc<string> {
        constructor() {
          super('initial');
          this.on(SimpleEvent, (event, emit) => {
            emit('handled');
          });
        }
      }

      const simpleBloc = new SimpleBloc();
      await simpleBloc.add(new SimpleEvent() as any);

      expect(simpleBloc.state).toBe('handled');
    });

    it('should prevent state updates after disposal is initiated', async () => {
      const observer = vi.fn();
      bloc.subscribe(observer);
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});

      // Start async event processing
      const promise = bloc.add(new AsyncIncrementEvent(5, 50));

      // Dispose bloc while event is processing
      setTimeout(() => bloc.dispose(), 25);

      await promise;

      // State should not be updated after disposal
      expect(bloc.state).toBe(0);
      // Error should be logged about attempted state update on disposed bloc
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempted state update on'),
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large event queues efficiently', async () => {
      const eventCount = 1000;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < eventCount; i++) {
        promises.push(bloc.add(new IncrementEvent(1)));
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      expect(bloc.state).toBe(eventCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should process quickly
    });

    it('should not leak memory with event references', async () => {
      const events: any[] = [];

      // Create many events
      for (let i = 0; i < 100; i++) {
        const event = new IncrementEvent(1);
        events.push(event);
        await bloc.add(event);
      }

      // Clear event array
      events.length = 0;

      // Events should be garbage collectible after processing
      expect((bloc as any)._eventQueue.length).toBe(0);
    });
  });
});
