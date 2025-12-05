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

describe('ReduxDevToolsAdapter - Action Dispatch (Cubit only)', () => {
  class CounterCubit extends Cubit<{ count: number }> {
    constructor() {
      super({ count: 0 });
      this._name = 'CounterCubit';
    }
  }

  class UserCubit extends Cubit<{ name: string; age: number }> {
    constructor() {
      super({ name: 'Alice', age: 30 });
      this._name = 'UserCubit';
    }
  }

  describe('Built-in Actions - emit', () => {
    it('should emit new state for Cubit', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[CounterCubit] emit',
          payload: { state: { count: 42 } },
        }),
      });

      expect(cubit.state).toEqual({ count: 42 });
    });

    it('should emit object state for Cubit', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[UserCubit] emit',
          payload: { state: { name: 'Bob', age: 25 } },
        }),
      });

      expect(cubit.state.name).toBe('Bob');
      expect(cubit.state.age).toBe(25);
    });

    it('should dispatch custom event on emit', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[CounterCubit] emit',
          payload: { state: { count: 42 } },
        }),
      });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-action-dispatched',
          detail: expect.objectContaining({
            action: 'emit',
            blocName: 'CounterCubit',
          }),
        }),
      );
    });

    it('should handle emit without payload.state', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[CounterCubit] emit',
          payload: {},
        }),
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('emit action requires payload.state'),
      );

      consoleError.mockRestore();
    });
  });

  describe('Built-in Actions - patch', () => {
    it('should patch state', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[UserCubit] patch',
          payload: { state: { age: 31 } },
        }),
      });

      expect(cubit.state.age).toBe(31);
      expect(cubit.state.name).toBe('Alice'); // Unchanged
    });

    it('should patch multiple properties', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[UserCubit] patch',
          payload: { state: { name: 'Charlie', age: 40 } },
        }),
      });

      expect(cubit.state.name).toBe('Charlie');
      expect(cubit.state.age).toBe(40);
    });

    it('should dispatch custom event on patch', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[UserCubit] patch',
          payload: { state: { age: 35 } },
        }),
      });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-action-dispatched',
          detail: expect.objectContaining({
            action: 'patch',
            blocName: 'UserCubit',
          }),
        }),
      );
    });

    it('should handle patch without payload.state', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[UserCubit] patch',
          payload: {},
        }),
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('patch action requires payload.state'),
      );

      consoleError.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid action format', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: 'InvalidFormat',
          payload: {},
        }),
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid action type format'),
      );

      consoleError.mockRestore();
    });

    it('should handle invalid JSON in action payload', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: 'invalid json{{{',
      });

      expect(consoleError).toHaveBeenCalled();
      expect(consoleError.mock.calls[0][0]).toContain(
        'Failed to parse action JSON',
      );

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-error',
          detail: expect.objectContaining({
            type: 'ACTION_DISPATCH_FAILED',
          }),
        }),
      );

      consoleError.mockRestore();
    });

    it('should handle bloc not found', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '[NonExistentBloc] emit',
          payload: { state: 42 },
        }),
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Bloc/Cubit "NonExistentBloc" not found'),
      );

      consoleError.mockRestore();
    });

    it('should handle action payload as object (not string)', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Payload as object instead of JSON string
      messageHandler({
        type: 'ACTION',
        payload: {
          type: '[CounterCubit] emit',
          payload: { state: { count: 42 } },
        },
      });

      expect(cubit.state).toEqual({ count: 42 });
    });

    it('should handle emoji prefixes in action types', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Action type with emoji prefix
      messageHandler({
        type: 'ACTION',
        payload: JSON.stringify({
          type: '⚡ [CounterCubit] emit',
          payload: { state: { count: 42 } },
        }),
      });

      expect(cubit.state).toEqual({ count: 42 });
    });
  });
});
