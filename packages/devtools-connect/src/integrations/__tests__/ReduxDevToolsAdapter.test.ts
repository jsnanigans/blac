import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReduxDevToolsAdapter } from '../ReduxDevToolsAdapter';
import { Cubit } from '@blac/core';

// Mock Redux DevTools Extension
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

// Setup global window mock
beforeEach(() => {
  vi.clearAllMocks();
  (global as any).window = {
    __REDUX_DEVTOOLS_EXTENSION__: mockDevToolsExtension,
    dispatchEvent: vi.fn(),
  };
});

describe('ReduxDevToolsAdapter - State Editing', () => {
  class CounterCubit extends Cubit<number> {
    constructor() {
      super(0);
      this._name = 'CounterCubit';
    }

    increment = () => {
      this.emit(this.state + 1);
    };
  }

  class UserCubit extends Cubit<{
    name: string;
    age: number;
    profile: { bio: string };
  }> {
    constructor() {
      super({
        name: 'Alice',
        age: 30,
        profile: { bio: 'Developer' },
      });
      this._name = 'UserCubit';
    }
  }

  describe('handleStateEdit - simple state', () => {
    it('should edit a simple numeric state', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      // Get the DevTools message handler
      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Simulate UPDATE_STATE message with flat format
      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'CounterCubit',
          value: 42,
        },
      });

      // Verify state was updated
      expect(cubit.state).toBe(42);
    });

    it('should edit a nested object property', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Edit the name property with flat format
      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'UserCubit.name',
          value: 'Bob',
        },
      });

      expect(cubit.state.name).toBe('Bob');
      expect(cubit.state.age).toBe(30); // Other properties unchanged
    });

    it('should edit a deeply nested property', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Edit the nested bio property with flat format
      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'UserCubit.profile.bio',
          value: 'Senior Developer',
        },
      });

      expect(cubit.state.profile.bio).toBe('Senior Developer');
      expect(cubit.state.name).toBe('Alice'); // Other properties unchanged
    });
  });

  describe('handleStateEdit - error handling', () => {
    it('should handle missing path', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          value: 42,
        },
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('State edit requires a path'),
      );

      consoleError.mockRestore();
    });

    it('should handle empty path', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: '',
          value: 42,
        },
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('State edit requires a path'),
      );

      consoleError.mockRestore();
    });

    it('should handle non-existent bloc', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const _adapter = new ReduxDevToolsAdapter({ enabled: true });

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'NonExistentBloc.property',
          value: 42,
        },
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Bloc "NonExistentBloc" not found'),
      );

      consoleError.mockRestore();
    });

    it('should handle non-existent property in path', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'UserCubit.nonExistent.property',
          value: 'test',
        },
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Property "nonExistent" not found'),
      );

      consoleError.mockRestore();
    });
  });

  describe('handleStateEdit - custom events', () => {
    it('should dispatch custom event on state edit', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new CounterCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'CounterCubit',
          value: 42,
        },
      });

      // Verify custom event was dispatched
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blac-devtools-state-edited',
          detail: expect.objectContaining({
            blocType: 'CounterCubit',
            displayName: 'CounterCubit',
            newValue: 42,
          }),
        }),
      );
    });
  });

  describe('getValueAtPath helper', () => {
    it('should get value at simple path', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      // Test that getValueAtPath works correctly by checking the event detail
      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'UserCubit.name',
          value: 'Bob',
        },
      });

      // The oldValue in the custom event should be 'Alice'
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            oldValue: 'Alice',
            newValue: 'Bob',
          }),
        }),
      );
    });

    it('should get value at nested path', () => {
      const adapter = new ReduxDevToolsAdapter({ enabled: true });
      const cubit = new UserCubit();

      adapter.onBlocCreated(cubit);

      const messageHandler = mockDevTools.subscribe.mock.calls[0][0];

      messageHandler({
        type: 'DISPATCH',
        payload: {
          type: 'UPDATE_STATE',
          path: 'UserCubit.profile.bio',
          value: 'Senior Developer',
        },
      });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            oldValue: 'Developer',
            newValue: 'Senior Developer',
          }),
        }),
      );
    });
  });
});
