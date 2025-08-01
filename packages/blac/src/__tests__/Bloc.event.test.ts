import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bloc } from '../Bloc';
import { Blac } from '../Blac';

// Helper function to observe state changes using generators
async function observeNextState<T>(bloc: Bloc<T, any>): Promise<{ newState: T; oldState: T }> {
  const iterator = bloc.stateChanges();
  const result = await iterator.next();
  if (!result.done) {
    return { newState: result.value.current, oldState: result.value.previous };
  }
  throw new Error('No state change emitted');
}

// Helper to collect state changes
async function collectStateChanges<T>(bloc: Bloc<T, any>, action: () => Promise<void>): Promise<Array<{ newState: T; oldState: T }>> {
  const changes: Array<{ newState: T; oldState: T }> = [];
  const iterator = bloc.stateChanges();
  
  // Start collecting in background
  const collectPromise = (async () => {
    for await (const change of iterator) {
      changes.push({ newState: change.current, oldState: change.previous });
    }
  })();
  
  // Perform action
  await action();
  
  // Wait a bit for changes to be collected
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return changes;
}

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
  });

  describe('Event Processing', () => {
    it('should handle events with proper type inference', async () => {
      const stateChangePromise = observeNextState(bloc);

      await bloc.add(new IncrementEvent(5));

      const { newState, oldState } = await stateChangePromise;
      expect(oldState).toBe(0);
      expect(newState).toBe(5);
      expect(bloc.state).toBe(5);
    });

    it('should queue events and process them sequentially', async () => {
      const changes = await collectStateChanges(bloc, async () => {
        // Add multiple events rapidly
        bloc.add(new IncrementEvent(1));
        bloc.add(new DecrementEvent(2));
        bloc.add(new IncrementEvent(3));
        
        // Wait for all events to process
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(changes).toHaveLength(3);
      expect(changes[0]).toEqual({ newState: 1, oldState: 0 });
      expect(changes[1]).toEqual({ newState: -1, oldState: 1 });
      expect(changes[2]).toEqual({ newState: 2, oldState: -1 });
      expect(bloc.state).toBe(2);
    });

    it('should handle events without emitting', async () => {
      class NoEmitEvent {}
      class NoEmitBloc extends Bloc<number, NoEmitEvent> {
        constructor() {
          super(0);
          this.on(NoEmitEvent, (event, emit) => {
            // Handler that doesn't emit
          });
        }
      }

      const noEmitBloc = new NoEmitBloc();
      const iterator = noEmitBloc.stateChanges();

      await noEmitBloc.add(new NoEmitEvent());

      // Wait to see if any state change occurs
      const result = await Promise.race([
        iterator.next(),
        new Promise(resolve => setTimeout(() => resolve({ done: true, value: undefined }), 50))
      ]);

      expect(result).toEqual({ done: true, value: undefined });
      expect(noEmitBloc.state).toBe(0);
    });

    it('should process async events in order', async () => {
      const changes = await collectStateChanges(bloc, async () => {
        // Add async events with different delays
        bloc.add(new AsyncIncrementEvent(1, 30));
        bloc.add(new AsyncIncrementEvent(2, 10));
        bloc.add(new AsyncIncrementEvent(3, 20));
        
        // Wait for all events to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Events should be processed in the order they were added,
      // regardless of their individual delays
      expect(changes).toHaveLength(3);
      expect(changes[0]).toEqual({ newState: 1, oldState: 0 });
      expect(changes[1]).toEqual({ newState: 3, oldState: 1 });
      expect(changes[2]).toEqual({ newState: 6, oldState: 3 });
    });

    it('should handle mixed sync and async events', async () => {
      const changes = await collectStateChanges(bloc, async () => {
        const promises = [
          bloc.add(new IncrementEvent(1)),
          bloc.add(new AsyncIncrementEvent(2, 20)),
          bloc.add(new DecrementEvent(1)),
          bloc.add(new AsyncIncrementEvent(3, 10)),
        ];

        await Promise.all(promises);
      });

      expect(changes).toHaveLength(4);
      expect(bloc.state).toBe(5); // 0 + 1 + 2 - 1 + 3
    });

    it('should handle errors in event handlers', async () => {
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      
      await bloc.add(new ErrorEvent('Test error'));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler:'),
        expect.any(Error),
      );
      expect(bloc.state).toBe(0); // State unchanged

      errorSpy.mockRestore();
    });

    it('should handle critical errors that crash the app', async () => {
      const criticalBloc = new CriticalErrorBloc();
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});

      await expect(
        criticalBloc.add(new CriticalErrorEvent('Critical failure')),
      ).rejects.toThrow('Critical failure');

      errorSpy.mockRestore();
    });

    it('should handle no registered handler for event', async () => {
      class UnhandledEvent {}
      const unhandledBloc = new Bloc<number, UnhandledEvent>(0);

      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});

      await unhandledBloc.add(new UnhandledEvent());

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handler registered for event type'),
      );
      expect(unhandledBloc.state).toBe(0);

      warnSpy.mockRestore();
    });

    it('should pass event instance to state change notifications', async () => {
      const event = new IncrementEvent(10);
      
      // Use events() generator to observe the event
      const eventIterator = bloc.events();
      const stateChangePromise = observeNextState(bloc);

      await bloc.add(event);

      const { newState, oldState } = await stateChangePromise;
      expect(newState).toBe(10);
      expect(oldState).toBe(0);

      // Check event was emitted
      const eventResult = await eventIterator.next();
      expect(eventResult.value).toBe(event);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle large number of events', async () => {
      const eventCount = 1000;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < eventCount; i++) {
        promises.push(bloc.add(new IncrementEvent(1)));
      }

      await Promise.all(promises);
      expect(bloc.state).toBe(eventCount);
    });

    it('should handle rapid event additions during processing', async () => {
      // Custom bloc that adds more events during processing
      class ChainReactionBloc extends Bloc<number, IncrementEvent> {
        constructor() {
          super(0);
          this.on(IncrementEvent, (event, emit) => {
            emit(this.state + event.amount);
            if (this.state < 5) {
              this.add(new IncrementEvent(1)); // Add another event
            }
          });
        }
      }

      const chainBloc = new ChainReactionBloc();
      const changes = await collectStateChanges(chainBloc, async () => {
        await chainBloc.add(new IncrementEvent(1));
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(changes).toHaveLength(5); // Initial + 4 chain reactions
      expect(chainBloc.state).toBe(5);
    });

    it('should handle multiple emits within single event handler', async () => {
      class MultiEmitBloc extends Bloc<number, IncrementEvent> {
        constructor() {
          super(0);
          this.on(IncrementEvent, (event, emit) => {
            for (let i = 0; i < event.amount; i++) {
              emit(this.state + 1);
            }
          });
        }
      }

      const multiBloc = new MultiEmitBloc();
      const changes = await collectStateChanges(multiBloc, async () => {
        await multiBloc.add(new IncrementEvent(3));
      });

      expect(changes).toHaveLength(3);
      expect(changes[0]).toEqual({ newState: 1, oldState: 0 });
      expect(changes[1]).toEqual({ newState: 2, oldState: 1 });
      expect(changes[2]).toEqual({ newState: 3, oldState: 2 });
    });
  });

  describe('Lifecycle Integration', () => {
    it('should stop processing events after disposal', async () => {
      const stateIterator = bloc.stateChanges();

      // Dispose the bloc
      bloc.dispose();

      // Try to add events after disposal
      await bloc.add(new IncrementEvent(5));

      // State should not change
      expect(bloc.state).toBe(0);

      // Iterator should be done
      const result = await stateIterator.next();
      expect(result.done).toBe(true);
    });

    it('should maintain event processing integrity during disposal', async () => {
      // Start async event processing
      const eventPromise = bloc.add(new AsyncIncrementEvent(5, 50));

      // Dispose during processing
      setTimeout(() => bloc.dispose(), 25);

      await eventPromise;

      // The async event might or might not complete depending on timing
      // But state should be valid (either 0 or 5)
      expect([0, 5]).toContain(bloc.state);
    });
  });

  describe('Event Stream', () => {
    it('should emit events through events() generator', async () => {
      const events: any[] = [];
      
      // Start collecting events
      (async () => {
        for await (const event of bloc.events()) {
          events.push(event);
          if (events.length >= 3) break;
        }
      })();

      // Add events
      const event1 = new IncrementEvent(1);
      const event2 = new DecrementEvent(2);
      const event3 = new IncrementEvent(3);

      await bloc.add(event1);
      await bloc.add(event2);
      await bloc.add(event3);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(events).toHaveLength(3);
      expect(events[0]).toBe(event1);
      expect(events[1]).toBe(event2);
      expect(events[2]).toBe(event3);
    });
  });
});