/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Blac } from '../src/Blac';
import { Bloc } from '../src/Bloc'; // Adjust path as needed

// --- Test Setup --- //

interface TestState {
  count: number;
  lastEventProcessed?: string;
  loading: boolean;
}

// Base event class (fulfills A extends object constraint)
abstract class BaseTestEvent {
  // Added a dummy property to satisfy linter for non-empty class
  public _isEvent: boolean = true;
}

class IncrementEvent extends BaseTestEvent {
  constructor(public readonly amount: number = 1) {
    super();
  }
}

class DecrementEvent extends BaseTestEvent {
  constructor(public readonly amount: number = 1) {
    super();
  }
}

class SetLoadingEvent extends BaseTestEvent {
  constructor(public readonly isLoading: boolean) {
    super();
  }
}

class AsyncIncrementEvent extends BaseTestEvent {
  constructor(public readonly amount: number = 1, public readonly delay: number = 50) {
    super();
  }
}

class ErrorThrowingEvent extends BaseTestEvent {}

class UnregisteredEvent extends BaseTestEvent {}

class MultiEmitEvent extends BaseTestEvent {}

// Concrete Bloc for testing
class TestBloc extends Bloc<TestState, BaseTestEvent> {
  // Mockable _pushState for fine-grained testing of what Bloc passes to BlocBase
  // In a real BlocBase, this would handle state update and observer notification.
  // Here, we're focusing on testing the Bloc class's logic itself.

  constructor(initialState: TestState) {
    super(initialState);
    // Initialize _name and _id for console log testing, as BlocBase might rely on Blac manager for this.
    // In a pure unit test of Bloc, we might need to set these manually if BlocBase doesn't default them.
    this.on(IncrementEvent, (event, emit) => {
      emit({ 
        ...this.state, 
        count: this.state.count + event.amount, 
        lastEventProcessed: 'IncrementEvent' 
      });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ 
        ...this.state, 
        count: this.state.count - event.amount,
        lastEventProcessed: 'DecrementEvent' 
      });
    });

    this.on(SetLoadingEvent, (event, emit) => {
      emit({ 
        ...this.state, 
        loading: event.isLoading,
        lastEventProcessed: 'SetLoadingEvent' 
      });
    });

    this.on(AsyncIncrementEvent, async (event, emit) => {
      emit({ ...this.state, loading: true, lastEventProcessed: 'AsyncIncrementEventStart' });
      await new Promise(resolve => setTimeout(resolve, event.delay));
      emit({ 
        ...this.state, 
        count: this.state.count + event.amount, 
        loading: false, 
        lastEventProcessed: 'AsyncIncrementEventEnd' 
      });
    });

    this.on(ErrorThrowingEvent, () => {
      throw new Error('Handler error!');
    });

    this.on(MultiEmitEvent, (event, emit) => {
      emit({ ...this.state, count: this.state.count + 1, lastEventProcessed: 'MultiEmitEvent1' });
      // Simulate some logic, then emit again based on the intermediate state captured by 'this.state'
      emit({ ...this.state, count: this.state.count + 1, lastEventProcessed: 'MultiEmitEvent2' });
    });
  }

  // Expose internal state for easier assertions in tests
  public get currentState(): TestState {
    return this.state;
  }
}

// --- Tests --- //

describe('Bloc', () => {
  let testBloc: TestBloc;
  const initialState: TestState = { count: 0, loading: false };
  let pushStateSpy: any;
  let errorSpy: any;
  let warnSpy: any;

  beforeEach(() => {
    testBloc = new TestBloc(initialState);
    // Reset spies for Blac static methods before each test
    vi.restoreAllMocks(); // Or more targeted: vi.mocked(Blac.log).mockClear(), etc. if using vi.mock
    pushStateSpy = vi.spyOn(testBloc, '_pushState');
    errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {}); // Mock implementation
    warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});   // Mock implementation
  });

  describe('constructor and on() registration', () => {
    it('should initialize with the given initial state', () => {
      expect(testBloc.currentState).toEqual(initialState);
    });

    it('should register event handlers via on() in the constructor', () => {
      const handlers = testBloc.eventHandlers
      expect(handlers.has(IncrementEvent)).toBe(true);
      expect(handlers.has(DecrementEvent)).toBe(true);
      expect(handlers.has(AsyncIncrementEvent)).toBe(true);
      expect(handlers.has(ErrorThrowingEvent)).toBe(true);
    });

    it('should log a warning if a handler is registered multiple times (overwritten)', () => {
      class OverwriteBloc extends Bloc<TestState, BaseTestEvent> {
        constructor() {
          super(initialState);
          this.on(IncrementEvent, () => {}); // First registration
          this.on(IncrementEvent, () => {}); // Second registration (overwrite)
        }
      }
      new OverwriteBloc(); // Instantiate to trigger constructor logic
      expect(warnSpy).toHaveBeenCalledTimes(1);
      // The name and ID might be dynamic, using stringContaining for a more resilient check
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Handler for event 'IncrementEvent' already registered. It will be overwritten."));
    });
  });

  describe('add() method and event processing', () => {
    it('should process a registered synchronous event and update state via emit', async () => {
      const incrementAction = new IncrementEvent(5);
      const expectedNewState: TestState = { ...initialState, count: 5, lastEventProcessed: 'IncrementEvent' };

      await testBloc.add(incrementAction);

      // Check _pushState was called correctly by emit
      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(pushStateSpy).toHaveBeenCalledWith(expectedNewState, initialState, incrementAction);
    });

    it('should process a registered asynchronous event and update state via multiple emits', async () => {
      const asyncAction = new AsyncIncrementEvent(10, 10); // amount, delay
      const intermediateState: TestState = { ...initialState, loading: true, lastEventProcessed: 'AsyncIncrementEventStart' };
      const finalExpectedState: TestState = { ...initialState, count: 10, loading: false, lastEventProcessed: 'AsyncIncrementEventEnd' };

      const addPromise = testBloc.add(asyncAction); // Don't await yet if checking intermediate
      
      // Check first emit (loading state)
      // Need a brief moment for the first part of async handler to execute
      await vi.waitFor(() => {
        expect(pushStateSpy).toHaveBeenCalledWith(intermediateState, initialState, asyncAction);
      });
      
      await addPromise; // Await completion of the async handler

      expect(pushStateSpy).toHaveBeenCalledTimes(2);
      // The second call to _pushState will have `intermediateState` as its `previousState` argument
      expect(pushStateSpy).toHaveBeenCalledWith(finalExpectedState, intermediateState, asyncAction);
    });

    it('should log a warning and not call any handler if no handler is registered for an event', async () => {
      const unregisteredAction = new UnregisteredEvent();
      await testBloc.add(unregisteredAction);

      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      // Check for the correct warning message and the passed action object
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No handler registered for action type: 'UnregisteredEvent'. Action was:"),
        unregisteredAction
      );
    });

    it('should catch errors thrown by event handlers, log them, and not crash', async () => {
      const errorAction = new ErrorThrowingEvent();
      
      await expect(testBloc.add(errorAction)).resolves.toBeUndefined(); // add itself should not throw

      expect(pushStateSpy).not.toHaveBeenCalled(); // No state should be emitted if handler errors before emit
      expect(errorSpy).toHaveBeenCalledTimes(1);
      // Check for the correct error message format and the passed error and action objects
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in event handler for 'ErrorThrowingEvent':"),
        expect.any(Error),
        "Action:",
        errorAction
      );
    });

    it('should correctly pass the specific event instance to the handler', async () => {
      const handlerSpy = vi.fn();
      class EventWithPayload extends BaseTestEvent { constructor(public data: string) { super(); } }
      class SpyBloc extends Bloc<{log: string[]}, BaseTestEvent> {
        constructor() {
          super({log: []});
          this.on(EventWithPayload, handlerSpy);
        }
      }
      const spyBloc = new SpyBloc();
      const testEvent = new EventWithPayload('test-data');

      await spyBloc.add(testEvent);

      expect(handlerSpy).toHaveBeenCalledTimes(1);
      expect(handlerSpy).toHaveBeenCalledWith(
        testEvent, // Crucially, the exact event instance
        expect.any(Function) // The emit function
      );
      expect(testEvent.data).toBe('test-data'); // Ensure event wasn't mutated or misconstrued
    });

    it('handler should use the latest state for subsequent emits within the same handler execution', async () => {
      const multiEmitAction = new MultiEmitEvent();
      const firstEmitExpectedState: TestState = { ...initialState, count: 1, lastEventProcessed: 'MultiEmitEvent1' };
      const secondEmitExpectedState: TestState = { ...firstEmitExpectedState, count: 2, lastEventProcessed: 'MultiEmitEvent2' };

      await testBloc.add(multiEmitAction);

      expect(pushStateSpy).toHaveBeenCalledTimes(2);
      expect(pushStateSpy).toHaveBeenNthCalledWith(1, firstEmitExpectedState, initialState, multiEmitAction);
      // The crucial part: the `previousState` for the second emit should be the state after the first emit.
      expect(pushStateSpy).toHaveBeenNthCalledWith(2, secondEmitExpectedState, firstEmitExpectedState, multiEmitAction);
    });
  });
});
