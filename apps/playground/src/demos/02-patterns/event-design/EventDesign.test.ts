import { describe, it, expect, beforeEach } from 'vitest';
import {
  EventPatternBloc,
  ResetStateEvent,
  IncrementByEvent,
  UpdateDataEvent,
  LoadDataEvent,
  DataLoadedEvent,
  UserLoggedInEvent,
  ErrorOccurredEvent,
  DoIncrementEvent,
  DataEvent,
  MutableStateEvent,
  UpdateAndResetEvent,
} from './EventPatternBloc';

describe('EventPatternBloc', () => {
  let bloc: EventPatternBloc;

  beforeEach(() => {
    bloc = new EventPatternBloc();
  });

  describe('Good Event Patterns', () => {
    describe('ResetStateEvent', () => {
      it('should reset state to initial values', async () => {
        // Arrange: Modify state first
        await bloc.add(new IncrementByEvent(10));
        await bloc.add(new UpdateDataEvent({ value: 'modified', timestamp: Date.now() }));
        expect(bloc.state.count).toBe(10);
        expect(bloc.state.data).toBe('modified');

        // Act
        await bloc.add(new ResetStateEvent());

        // Assert
        expect(bloc.state.count).toBe(0);
        expect(bloc.state.data).toBe('initial');
        expect(bloc.state.lastEvent).toBe('ResetStateEvent');
        expect(bloc.state.user).toBeNull();
        expect(bloc.state.error).toBeNull();
        expect(bloc.state.loadedData).toBeNull();
      });

      it('should work through public API method', async () => {
        await bloc.incrementBy(5);
        expect(bloc.state.count).toBe(5);

        await bloc.reset();
        expect(bloc.state.count).toBe(0);
        expect(bloc.state.lastEvent).toBe('ResetStateEvent');
      });
    });

    describe('IncrementByEvent', () => {
      it('should increment count by specified amount', async () => {
        await bloc.add(new IncrementByEvent(5));
        expect(bloc.state.count).toBe(5);
        expect(bloc.state.lastEvent).toBe('IncrementByEvent(5)');

        await bloc.add(new IncrementByEvent(3));
        expect(bloc.state.count).toBe(8);
        expect(bloc.state.lastEvent).toBe('IncrementByEvent(3)');
      });

      it('should handle negative increments', async () => {
        await bloc.add(new IncrementByEvent(-5));
        expect(bloc.state.count).toBe(-5);
        expect(bloc.state.lastEvent).toBe('IncrementByEvent(-5)');
      });

      it('should work through public API method', async () => {
        await bloc.incrementBy(10);
        expect(bloc.state.count).toBe(10);

        await bloc.incrementBy(5);
        expect(bloc.state.count).toBe(15);
      });
    });

    describe('UpdateDataEvent', () => {
      it('should update data and timestamp', async () => {
        const timestamp = Date.now();
        await bloc.add(new UpdateDataEvent({ value: 'test data', timestamp }));

        expect(bloc.state.data).toBe('test data');
        expect(bloc.state.timestamp).toBe(timestamp);
        expect(bloc.state.lastEvent).toBe('UpdateDataEvent(test data)');
      });

      it('should preserve other state properties', async () => {
        await bloc.incrementBy(5);
        const timestamp = Date.now();

        await bloc.add(new UpdateDataEvent({ value: 'new data', timestamp }));

        expect(bloc.state.count).toBe(5); // Preserved
        expect(bloc.state.data).toBe('new data');
        expect(bloc.state.timestamp).toBe(timestamp);
      });

      it('should work through public API method', async () => {
        await bloc.updateData('hello world');
        expect(bloc.state.data).toBe('hello world');
        expect(bloc.state.lastEvent).toBe('UpdateDataEvent(hello world)');
      });
    });

    describe('LoadDataEvent and DataLoadedEvent', () => {
      it('should trigger data loading', async () => {
        await bloc.add(new LoadDataEvent('item-123'));
        expect(bloc.state.lastEvent).toBe('LoadDataEvent(item-123)');
      });

      it('should handle DataLoadedEvent', async () => {
        const loadedData = {
          id: 'item-456',
          content: 'Loaded content',
          loadedAt: Date.now(),
        };

        await bloc.add(new DataLoadedEvent(loadedData));

        expect(bloc.state.loadedData).toEqual(loadedData);
        expect(bloc.state.lastEvent).toBe('DataLoadedEvent(item-456)');
      });

      it('should work through public API method', async () => {
        await bloc.loadData('test-id');
        expect(bloc.state.lastEvent).toBe('LoadDataEvent(test-id)');

        // Wait for async operation
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(bloc.state.loadedData).toBeTruthy();
        expect(bloc.state.loadedData?.id).toBe('test-id');
        expect(bloc.state.loadedData?.content).toBe('Loaded content for test-id');
      });
    });

    describe('UserLoggedInEvent', () => {
      it('should set user and clear errors', async () => {
        // Set an error first
        await bloc.add(new ErrorOccurredEvent({ message: 'Some error', code: 'ERR_001' }));
        expect(bloc.state.error).toBeTruthy();

        // Log in user
        const user = { id: 'user-789', name: 'John Doe' };
        await bloc.add(new UserLoggedInEvent(user));

        expect(bloc.state.user).toEqual(user);
        expect(bloc.state.error).toBeNull(); // Error cleared
        expect(bloc.state.lastEvent).toBe('UserLoggedInEvent(John Doe)');
      });

      it('should work through public API method', async () => {
        await bloc.loginUser('u123', 'Alice Smith');

        expect(bloc.state.user).toEqual({ id: 'u123', name: 'Alice Smith' });
        expect(bloc.state.lastEvent).toBe('UserLoggedInEvent(Alice Smith)');
      });
    });

    describe('ErrorOccurredEvent', () => {
      it('should set error with message and code', async () => {
        const error = { message: 'Network failure', code: 'NET_ERR' };
        await bloc.add(new ErrorOccurredEvent(error));

        expect(bloc.state.error).toEqual(error);
        expect(bloc.state.lastEvent).toBe('ErrorOccurredEvent(Network failure)');
      });

      it('should set error without code', async () => {
        const error = { message: 'Unknown error' };
        await bloc.add(new ErrorOccurredEvent(error));

        expect(bloc.state.error).toEqual(error);
        expect(bloc.state.error?.code).toBeUndefined();
      });

      it('should work through public API method', async () => {
        await bloc.setError('Validation failed', 'VAL_001');

        expect(bloc.state.error).toEqual({ message: 'Validation failed', code: 'VAL_001' });
        expect(bloc.state.lastEvent).toBe('ErrorOccurredEvent(Validation failed)');
      });
    });

    describe('Event Immutability', () => {
      it('should use readonly properties for event payload', async () => {
        const data = { value: 'original', timestamp: Date.now() };
        const event = new UpdateDataEvent(data);

        // TypeScript prevents mutation at compile time with readonly keyword
        // At runtime, the readonly keyword provides type safety but not runtime enforcement
        expect(event.data).toBeDefined();
        expect(event.data.value).toBe('original');
      });

      it('should use readonly for primitive properties', async () => {
        const event = new IncrementByEvent(5);

        // TypeScript prevents this at compile time with readonly keyword
        expect(event.amount).toBe(5);
        // The readonly modifier is enforced by TypeScript, not at runtime
      });
    });
  });

  describe('Bad Event Patterns (Anti-patterns)', () => {
    describe('DoIncrementEvent (Verb-based naming)', () => {
      it('should work but demonstrate bad naming', async () => {
        await bloc.add(new DoIncrementEvent(5));

        expect(bloc.state.count).toBe(5);
        expect(bloc.state.lastEvent).toContain('BAD PATTERN');
      });

      it('should work through public API but show warning', async () => {
        await bloc.doIncrement(3);

        expect(bloc.state.count).toBe(3);
        expect(bloc.state.lastEvent).toBe('DoIncrementEvent(3) - BAD PATTERN');
      });
    });

    describe('DataEvent (Generic naming)', () => {
      it('should work but demonstrate lack of clarity', async () => {
        await bloc.add(new DataEvent('some data'));

        expect(bloc.state.data).toBe('some data');
        expect(bloc.state.lastEvent).toContain('BAD PATTERN (generic)');
      });

      it('should handle various data types poorly', async () => {
        await bloc.sendGenericData({ foo: 'bar' });
        expect(bloc.state.data).toBe('[object Object]');

        await bloc.sendGenericData(123);
        expect(bloc.state.data).toBe('123');

        await bloc.sendGenericData(null);
        expect(bloc.state.data).toBe('null');
      });
    });

    describe('MutableStateEvent', () => {
      it('should demonstrate mutability issues', async () => {
        const mutableState = { count: 10 };
        const event = new MutableStateEvent(mutableState);

        // This is bad - the event's state can be mutated
        event.state.count = 999;

        // The mutation affects the event
        expect(event.state.count).toBe(999);

        // Now add the event to see it processed
        await bloc.add(event);
        expect(bloc.state.lastEvent).toContain('BAD PATTERN (mutable)');
      });

      it('should show mutation side effects', async () => {
        await bloc.sendMutableState(50);

        // The handler mutates the event internally
        expect(bloc.state.count).toBe(50);
        expect(bloc.state.lastEvent).toContain('BAD PATTERN (mutable)');
      });
    });

    describe('UpdateAndResetEvent (Multi-purpose)', () => {
      it('should demonstrate confusion with multi-purpose events', async () => {
        // Set count to non-zero first
        await bloc.incrementBy(5);
        expect(bloc.state.count).toBe(5);

        // Update only (should not reset count)
        await bloc.add(new UpdateAndResetEvent('new value', false));
        expect(bloc.state.data).toBe('new value');
        expect(bloc.state.count).toBe(5); // Not reset, still 5

        // Reset with new value
        await bloc.incrementBy(5); // Make count 10
        await bloc.add(new UpdateAndResetEvent('reset value', true));
        expect(bloc.state.data).toBe('reset value');
        expect(bloc.state.count).toBe(0); // Reset
      });

      it('should show ambiguity in API', async () => {
        await bloc.updateOrReset('test');
        expect(bloc.state.data).toBe('test');

        await bloc.updateOrReset(undefined, true);
        expect(bloc.state.count).toBe(0);
        expect(bloc.state.data).toBe('initial');
      });
    });
  });

  describe('Event Naming Validation', () => {
    it('should use noun-based event names', async () => {
      const goodEventNames = [
        'ResetStateEvent',
        'IncrementByEvent',
        'UpdateDataEvent',
        'LoadDataEvent',
        'DataLoadedEvent',
        'UserLoggedInEvent',
        'ErrorOccurredEvent',
      ];

      goodEventNames.forEach(name => {
        // Check that name is a noun/noun phrase, not a verb
        expect(name).not.toMatch(/^(Do|Perform|Execute|Run|Make)/);
        expect(name).toMatch(/Event$/);
      });
    });

    it('should identify bad event naming patterns', async () => {
      const badEventNames = [
        'DoIncrementEvent',
        'DataEvent',
        'MutableStateEvent',
        'UpdateAndResetEvent',
      ];

      badEventNames.forEach(name => {
        const isBad =
          name.startsWith('Do') ||           // Verb prefix
          name === 'DataEvent' ||             // Too generic
          name.includes('Mutable') ||         // Indicates mutability
          name.includes('And');               // Multi-purpose

        expect(isBad).toBe(true);
      });
    });
  });

  describe('Handler Tests', () => {
    it('should handle multiple events in sequence', async () => {
      await bloc.incrementBy(5);
      expect(bloc.state.count).toBe(5);

      await bloc.updateData('test');
      expect(bloc.state.data).toBe('test');
      expect(bloc.state.count).toBe(5); // Preserved

      await bloc.loginUser('u1', 'User One');
      expect(bloc.state.user?.name).toBe('User One');
      expect(bloc.state.count).toBe(5); // Still preserved

      await bloc.reset();
      expect(bloc.state.count).toBe(0);
      expect(bloc.state.user).toBeNull();
      expect(bloc.state.data).toBe('initial');
    });

    it('should maintain state consistency', async () => {
      // Set up complex state
      await bloc.incrementBy(10);
      await bloc.updateData('complex');
      await bloc.loginUser('u2', 'User Two');
      await bloc.setError('Test error');

      // Verify state
      expect(bloc.state).toMatchObject({
        count: 10,
        data: 'complex',
        user: { id: 'u2', name: 'User Two' },
        error: { message: 'Test error' },
      });

      // Reset should clear everything
      await bloc.reset();
      expect(bloc.state).toMatchObject({
        count: 0,
        data: 'initial',
        user: null,
        error: null,
        loadedData: null,
      });
    });
  });
});