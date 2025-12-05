import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReduxDevToolsAdapter } from '../ReduxDevToolsAdapter';
import { Cubit } from '@blac/core';

const mockDevTools = {
  init: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  unsubscribe: vi.fn(),
  error: vi.fn(),
};

const mockDevToolsExtension = {
  connect: vi.fn(() => mockDevTools),
};

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).window = {
    __REDUX_DEVTOOLS_EXTENSION__: mockDevToolsExtension,
    dispatchEvent: vi.fn(),
  };
});

describe('ReduxDevToolsAdapter - Time Travel', () => {
  class CounterCubit extends Cubit<{ count: number }> {
    constructor() {
      super({ count: 0 });
      this._name = 'CounterCubit';
    }

    increment = () => this.emit({ count: this.state.count + 1 });
    decrement = () => this.emit({ count: this.state.count - 1 });
    setValue = (value: number) => this.emit({ count: value });
  }

  class UserCubit extends Cubit<{ name: string; age: number }> {
    constructor() {
      super({ name: 'Alice', age: 30 });
      this._name = 'UserCubit';
    }

    setName = (name: string) => this.emit({ ...this.state, name });
    setAge = (age: number) => this.emit({ ...this.state, age });
  }

  describe('State Restoration', () => {
    it('should restore single bloc state on time travel', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);
      cubit.increment(); // state = { count: 1 }
      adapter.onStateChanged(cubit, { count: 0 }, { count: 1 });
      cubit.increment(); // state = { count: 2 }
      adapter.onStateChanged(cubit, { count: 1 }, { count: 2 });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Jump back to state = { count: 1 }
      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'JUMP_TO_STATE',
        },
        state: JSON.stringify({
          CounterCubit: { count: 1 },
        }),
      });

      expect(cubit.state).toEqual({ count: 1 });
    });

    it('should restore multiple bloc states simultaneously', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const counter = new CounterCubit();
      const user = new UserCubit();

      adapter.onBlocCreated(counter);
      adapter.onBlocCreated(user);

      counter.setValue(5);
      adapter.onStateChanged(counter, { count: 0 }, { count: 5 });

      user.setName('Bob');
      adapter.onStateChanged(
        user,
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 30 },
      );

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({
          CounterCubit: { count: 10 },
          UserCubit: { name: 'Charlie', age: 25 },
        }),
      });

      expect(counter.state).toEqual({ count: 10 });
      expect(user.state.name).toBe('Charlie');
      expect(user.state.age).toBe(25);
    });

    it('should dispatch custom event after time travel', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({ CounterCubit: { count: 42 } }),
      });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-time-travel',
          detail: expect.objectContaining({
            restoredCount: 1,
            failedCount: 0,
          }),
        }),
      );
    });

    it('should not send updates to DevTools during time travel', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      mockDevTools.send.mockClear();

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({ CounterCubit: { count: 42 } }),
      });

      // Should not have sent state change updates during time travel
      const stateChangeActions = mockDevTools.send.mock.calls.filter((call) =>
        call[0].type?.includes('STATE_CHANGED'),
      );
      expect(stateChangeActions).toHaveLength(0);
    });

    it('should handle JUMP_TO_ACTION (same as JUMP_TO_STATE)', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_ACTION' },
        state: JSON.stringify({ CounterCubit: { count: 99 } }),
      });

      expect(cubit.state).toEqual({ count: 99 });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: 'invalid json{{{',
      });

      expect(consoleError).toHaveBeenCalled();
      expect(mockDevTools.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse'),
      );

      consoleError.mockRestore();
    });

    it('should dispatch error event on JSON parse failure', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: 'invalid json',
      });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-error',
          detail: expect.objectContaining({
            type: 'TIME_TRAVEL_FAILED',
          }),
        }),
      );

      consoleError.mockRestore();
    });

    it('should handle missing blocs during time travel', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Jump to state with unknown bloc
      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({
          CounterCubit: { count: 1 },
          UnknownBloc: { value: 42 }, // This bloc doesn't exist
        }),
      });

      // Should still restore the known bloc
      expect(cubit.state).toEqual({ count: 1 });

      // Should report one success
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            restoredCount: 1,
          }),
        }),
      );
    });
  });

  describe('Complex State Scenarios', () => {
    it('should restore nested object states', () => {
      class AppStateCubit extends Cubit<{
        user: { name: string; settings: { theme: string } };
        cart: { items: string[]; total: number };
      }> {
        constructor() {
          super({
            user: { name: 'Alice', settings: { theme: 'light' } },
            cart: { items: [], total: 0 },
          });
          this._name = 'AppStateCubit';
        }
      }

      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new AppStateCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({
          AppStateCubit: {
            user: { name: 'Bob', settings: { theme: 'dark' } },
            cart: { items: ['item1', 'item2'], total: 59.99 },
          },
        }),
      });

      expect(cubit.state.user.name).toBe('Bob');
      expect(cubit.state.user.settings.theme).toBe('dark');
      expect(cubit.state.cart.items).toEqual(['item1', 'item2']);
      expect(cubit.state.cart.total).toBe(59.99);
    });

    it('should restore array states', () => {
      class TodosCubit extends Cubit<string[]> {
        constructor() {
          super([]);
          this._name = 'TodosCubit';
        }
      }

      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new TodosCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: { type: 'JUMP_TO_STATE' },
        state: JSON.stringify({
          TodosCubit: ['Buy milk', 'Walk dog', 'Code review'],
        }),
      });

      expect(cubit.state).toEqual(['Buy milk', 'Walk dog', 'Code review']);
    });
  });
});
