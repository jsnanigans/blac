import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit, Blac } from '@blac/core';
import { PersistencePlugin, InMemoryStorageAdapter } from '../index';

// Test Cubit
class CounterCubit extends Cubit<number> {
  constructor(initialState = 0) {
    super(initialState);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

interface UserState {
  name: string;
  age: number;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor(initialState: UserState) {
    super(initialState);
  }

  updateName = (name: string) => this.emit({ ...this.state, name });
  updateAge = (age: number) => this.emit({ ...this.state, age });
  updateTheme = (theme: 'light' | 'dark') =>
    this.emit({
      ...this.state,
      preferences: { ...this.state.preferences, theme },
    });
}

describe('PersistencePlugin', () => {
  let storage: InMemoryStorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    Blac.resetInstance();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Persistence', () => {
    it('should save state to storage', async () => {
      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 0, // Immediate save
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.setValue(42);

      // Manually trigger state change for testing
      plugin.onStateChange(0, 42);

      // Wait for save
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(storage.getItem('counter')).toBe('42');
    });

    it('should restore state from storage', async () => {
      storage.setItem('counter', '100');

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);

      // Attach plugin (simulating bloc activation)
      await plugin.onAttach(cubit as any);

      expect(cubit.state).toBe(100);
    });

    it('should handle complex state objects', async () => {
      const initialState: UserState = {
        name: 'John',
        age: 30,
        preferences: {
          theme: 'light',
          notifications: true,
        },
      };

      const plugin = new PersistencePlugin<UserState>({
        key: 'user',
        storage,
        debounceMs: 0,
      });

      const cubit = new UserCubit(initialState);
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.updateName('Jane');
      plugin.onStateChange(initialState, { ...cubit.state, name: 'Jane' });

      cubit.updateTheme('dark');
      plugin.onStateChange(
        { ...cubit.state, name: 'Jane' },
        {
          ...cubit.state,
          name: 'Jane',
          preferences: { ...cubit.state.preferences, theme: 'dark' },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const saved = storage.getItem('user');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.name).toBe('Jane');
      expect(parsed.preferences.theme).toBe('dark');
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid state changes', async () => {
      vi.useFakeTimers();

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 100,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Rapid state changes
      cubit.setValue(1);
      cubit.setValue(2);
      cubit.setValue(3);
      cubit.setValue(4);
      cubit.setValue(5);

      // Should not have saved yet
      expect(storage.getItem('counter')).toBeNull();

      // Advance time
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      // Should save only the final value
      expect(storage.getItem('counter')).toBe('5');

      vi.useRealTimers();
    });
  });

  describe('Custom Serialization', () => {
    it('should use custom serialize/deserialize functions', async () => {
      const plugin = new PersistencePlugin<UserState>({
        key: 'user',
        storage,
        debounceMs: 0,
        serialize: (state) => `CUSTOM:${JSON.stringify(state)}`,
        deserialize: (data) => JSON.parse(data.replace('CUSTOM:', '')),
      });

      const initialState: UserState = {
        name: 'Test',
        age: 25,
        preferences: { theme: 'dark', notifications: false },
      };

      const cubit = new UserCubit(initialState);
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.updateName('Updated');
      plugin.onStateChange(initialState, { ...cubit.state, name: 'Updated' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const saved = storage.getItem('user');
      expect(saved).toMatch(/^CUSTOM:/);
    });
  });

  describe('Migrations', () => {
    it('should migrate data from old keys', async () => {
      // Set old data
      storage.setItem(
        'old-user-key',
        JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          age: 30,
        }),
      );

      const plugin = new PersistencePlugin<UserState>({
        key: 'user',
        storage,
        migrations: [
          {
            from: 'old-user-key',
            transform: (oldData) => ({
              name: `${oldData.firstName} ${oldData.lastName}`,
              age: oldData.age,
              preferences: {
                theme: 'light',
                notifications: true,
              },
            }),
          },
        ],
      });

      const cubit = new UserCubit({
        name: '',
        age: 0,
        preferences: { theme: 'light', notifications: false },
      });

      cubit.addPlugin(plugin);
      await plugin.onAttach(cubit as any);

      // Should have migrated data
      expect(cubit.state.name).toBe('John Doe');
      expect(cubit.state.age).toBe(30);

      // Old key should be removed
      expect(storage.getItem('old-user-key')).toBeNull();

      // New key should exist
      expect(storage.getItem('user')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const errorStorage = new InMemoryStorageAdapter();
      const onError = vi.fn();

      // Mock setItem to throw
      errorStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage: errorStorage,
        debounceMs: 0,
        onError,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.setValue(42);
      plugin.onStateChange(0, 42);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'save');
    });

    it('should handle deserialization errors', async () => {
      storage.setItem('counter', 'invalid-json');
      const onError = vi.fn();

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        onError,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);

      await plugin.onAttach(cubit as any);

      expect(onError).toHaveBeenCalledWith(expect.any(Error), 'load');

      // Should keep initial state on error
      expect(cubit.state).toBe(0);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt stored data', async () => {
      const encrypt = vi.fn((data: string) => btoa(data));
      const decrypt = vi.fn((data: string) => atob(data));

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 0,
        encrypt: { encrypt, decrypt },
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.setValue(42);
      plugin.onStateChange(0, 42);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(encrypt).toHaveBeenCalledWith('42');
      const saved = storage.getItem('counter');
      expect(saved).toBe(btoa('42'));

      // Test restoration
      const cubit2 = new CounterCubit();
      cubit2.addPlugin(
        new PersistencePlugin<number>({
          key: 'counter',
          storage,
          encrypt: { encrypt, decrypt },
        }),
      );

      await (cubit2.getPlugin('persistence') as any).onAttach(cubit2);

      expect(decrypt).toHaveBeenCalledWith(saved);
      expect(cubit2.state).toBe(42);
    });
  });

  describe('Versioning', () => {
    it('should save and check version metadata', async () => {
      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 0,
        version: 2,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.setValue(42);
      plugin.onStateChange(0, 42);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const metadata = storage.getItem('counter__metadata');
      expect(metadata).toBeTruthy();

      const parsed = JSON.parse(metadata!);
      expect(parsed.version).toBe(2);
      expect(parsed.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Clear', () => {
    it('should clear stored state and metadata', async () => {
      storage.setItem('counter', '42');
      storage.setItem(
        'counter__metadata',
        JSON.stringify({
          version: 1,
          timestamp: Date.now(),
        }),
      );

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
      });

      await plugin.clear();

      expect(storage.getItem('counter')).toBeNull();
      expect(storage.getItem('counter__metadata')).toBeNull();
    });
  });
});
