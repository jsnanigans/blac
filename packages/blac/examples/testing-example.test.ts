import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    Bloc,
    BlocEventConstraint,
    BlocTest,
    Cubit,
    MemoryLeakDetector,
    MockBloc,
    MockCubit
} from '../src';

// Example state interfaces
interface CounterState {
  count: number;
  loading: boolean;
}

interface UserState {
  id: string | null;
  name: string;
  email: string;
}

// Example Cubit
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, loading: false });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ ...this.state, count: this.state.count - 1 });
  };

  setLoading = (loading: boolean) => {
    this.emit({ ...this.state, loading });
  };

  async incrementAsync() {
    this.setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    this.increment();
    this.setLoading(false);
  }
}

// Example Events with proper BlocEventConstraint implementation
class IncrementEvent implements BlocEventConstraint {
  readonly type = 'INCREMENT';
  readonly timestamp = Date.now();
  constructor(public amount: number = 1) {}
}

class LoadUserEvent implements BlocEventConstraint {
  readonly type = 'LOAD_USER';
  readonly timestamp = Date.now();
  constructor(public userId: string) {}
}

class UserLoadedEvent implements BlocEventConstraint {
  readonly type = 'USER_LOADED';
  readonly timestamp = Date.now();
  constructor(public user: { id: string; name: string; email: string }) {}
}

// Example Bloc with proper typing
class UserBloc extends Bloc<UserState, BlocEventConstraint> {
  constructor() {
    super({ id: null, name: '', email: '' });
    
    this.on(LoadUserEvent, this.handleLoadUser);
    this.on(UserLoadedEvent, this.handleUserLoaded);
  }

  private handleLoadUser = async (event: LoadUserEvent, emit: (state: UserState) => void) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const mockUser = {
      id: event.userId,
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    this.add(new UserLoadedEvent(mockUser));
  };

  private handleUserLoaded = (event: UserLoadedEvent, emit: (state: UserState) => void) => {
    emit({
      id: event.user.id,
      name: event.user.name,
      email: event.user.email
    });
  };
}

describe('Blac Testing Utilities Examples', () => {
  beforeEach(() => {
    BlocTest.setUp();
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  describe('BlocTest.createBloc', () => {
    it('should create and activate a cubit', () => {
      const counter = BlocTest.createBloc(CounterCubit);
      
      expect(counter).toBeInstanceOf(CounterCubit);
      expect(counter.state).toEqual({ count: 0, loading: false });
    });

    it('should create multiple independent instances', () => {
      const counter1 = BlocTest.createBloc(CounterCubit);
      const counter2 = BlocTest.createBloc(CounterCubit);
      
      counter1.increment();
      
      expect(counter1.state.count).toBe(1);
      expect(counter2.state.count).toBe(0);
    });
  });

  describe('BlocTest.waitForState', () => {
    it('should wait for a specific state condition', async () => {
      const counter = BlocTest.createBloc(CounterCubit);
      
      // Start async operation
      counter.incrementAsync();
      
      // Wait for loading to become true
      await BlocTest.waitForState(
        counter,
        (state: CounterState) => state.loading === true,
        1000
      );
      
      expect(counter.state.loading).toBe(true);
      
      // Wait for loading to complete
      await BlocTest.waitForState(
        counter,
        (state: CounterState) => state.loading === false && state.count === 1,
        1000
      );
      
      expect(counter.state).toEqual({ count: 1, loading: false });
    });

    it('should timeout if condition is never met', async () => {
      const counter = BlocTest.createBloc(CounterCubit);
      
      await expect(
        BlocTest.waitForState(
          counter,
          (state: CounterState) => state.count === 999,
          100 // Short timeout
        )
      ).rejects.toThrow('Timeout waiting for state matching predicate after 100ms');
    });
  });

  describe('BlocTest.expectStates', () => {
    it('should verify a sequence of state changes', async () => {
      const counter = BlocTest.createBloc(CounterCubit);
      
      // For synchronous operations, we need to trigger AFTER setting up the expectation
      // and expect the ACTUAL states that will be emitted (starting from count: 0)
      const statePromise = BlocTest.expectStates(counter, [
        { count: 1, loading: false },  // First increment (0 -> 1)
        { count: 2, loading: false },  // Second increment (1 -> 2) 
        { count: 1, loading: false }   // Decrement (2 -> 1)
      ], 1000);
      
      // Trigger state changes AFTER setting up the expectation
      counter.increment(); // State becomes { count: 1, loading: false }
      counter.increment(); // State becomes { count: 2, loading: false }
      counter.decrement(); // State becomes { count: 1, loading: false }
      
      // This should succeed because the states match exactly
      await statePromise;
    });

    it('should work with async state changes', async () => {
      const counter = BlocTest.createBloc(CounterCubit);
      
      // Set up expectation for the states that will be emitted by incrementAsync
      const statePromise = BlocTest.expectStates(counter, [
        { count: 0, loading: true },   // setLoading(true)
        { count: 1, loading: true },   // increment() 
        { count: 1, loading: false }   // setLoading(false)
      ]);
      
      // Then trigger the async operation
      counter.incrementAsync();
      
      await statePromise;
    });
  });

  describe('MockBloc', () => {
    it('should allow mocking event handlers', async () => {
      const mockBloc = new MockBloc<CounterState>({ count: 0, loading: false });
      
      // Mock the increment event handler
      mockBloc.mockEventHandler(IncrementEvent, (event, emit) => {
        const currentState = mockBloc.state;
        emit({
          ...currentState,
          count: currentState.count + event.amount
        });
      });
      
      await mockBloc.add(new IncrementEvent(5));
      
      expect(mockBloc.state.count).toBe(5);
    });

    it('should track handler registration', () => {
      const mockBloc = new MockBloc<CounterState>({ count: 0, loading: false });
      
      expect(mockBloc.getHandlerCount()).toBe(0);
      
      mockBloc.mockEventHandler(IncrementEvent, (event, emit) => {
        // Mock handler
      });
      
      expect(mockBloc.getHandlerCount()).toBe(1);
      expect(mockBloc.hasHandler(IncrementEvent)).toBe(true);
    });
  });

  describe('MockCubit', () => {
    it('should track state history', () => {
      const mockCubit = new MockCubit<CounterState>({ count: 0, loading: false });
      
      mockCubit.emit({ count: 1, loading: false });
      mockCubit.emit({ count: 2, loading: true });
      mockCubit.emit({ count: 3, loading: false });
      
      const history = mockCubit.getStateHistory();
      
      expect(history).toHaveLength(4); // Initial + 3 emissions
      expect(history[0]).toEqual({ count: 0, loading: false });
      expect(history[1]).toEqual({ count: 1, loading: false });
      expect(history[2]).toEqual({ count: 2, loading: true });
      expect(history[3]).toEqual({ count: 3, loading: false });
    });

    it('should clear state history', () => {
      const mockCubit = new MockCubit<CounterState>({ count: 0, loading: false });
      
      mockCubit.emit({ count: 1, loading: false });
      mockCubit.emit({ count: 2, loading: false });
      
      expect(mockCubit.getStateHistory()).toHaveLength(3);
      
      mockCubit.clearStateHistory();
      
      const history = mockCubit.getStateHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(mockCubit.state);
    });
  });

  describe('MemoryLeakDetector', () => {
    it('should detect leaks when blocs are created without cleanup', () => {
      const detector = new MemoryLeakDetector();
      
      const counter1 = BlocTest.createBloc(CounterCubit);
      const counter2 = BlocTest.createBloc(CounterCubit);
      
      // Use the blocs
      counter1.increment();
      counter2.decrement();
      
      // Check for leaks BEFORE tearDown (which would clean them up)
      const result = detector.checkForLeaks();
      
      // Should detect leaks since we created blocs after the detector was initialized
      expect(result.hasLeaks).toBe(true);
      expect(result.stats.registeredBlocs).toBeGreaterThan(detector['initialStats'].registeredBlocs);
    });

    it('should provide detailed leak report', () => {
      const detector = new MemoryLeakDetector();
      
      // Create some blocs (these will be cleaned up by tearDown)
      BlocTest.createBloc(CounterCubit);
      BlocTest.createBloc(UserBloc);
      
      const result = detector.checkForLeaks();
      
      expect(result).toHaveProperty('hasLeaks');
      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('stats');
      expect(typeof result.report).toBe('string');
      expect(result.report).toContain('Memory Leak Detection Report');
    });
  });

  describe('Integration Testing', () => {
    it('should test complex bloc interactions', async () => {
      const userBloc = BlocTest.createBloc(UserBloc);
      
      // Start loading user
      userBloc.add(new LoadUserEvent('user-123'));
      
      // Wait for user to be loaded
      await BlocTest.waitForState(
        userBloc,
        (state: UserState) => state.id !== null,
        1000
      );
      
      expect(userBloc.state).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should test error scenarios with mocked blocs', async () => {
      const mockBloc = new MockBloc<UserState>({ id: null, name: '', email: '' });
      
      // Mock an error scenario - the error should be caught and logged, not thrown
      mockBloc.mockEventHandler(LoadUserEvent, async (event, emit) => {
        throw new Error('Network error');
      });
      
      // The add method should complete successfully (error is caught internally)
      // but no state change should occur
      await mockBloc.add(new LoadUserEvent('user-123'));
      
      // Verify the state didn't change due to the error
      expect(mockBloc.state).toEqual({ id: null, name: '', email: '' });
    });
  });
}); 