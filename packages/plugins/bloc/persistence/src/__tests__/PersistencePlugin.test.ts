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

      // Simulate attachment and state change
      await plugin.onAttach(cubit as any);
      cubit.setValue(42);
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

      // Trigger attach
      await plugin.onAttach(cubit as any);

      // Update state
      cubit.updateName('Jane');
      plugin.onStateChange(initialState, cubit.state);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const saved = storage.getItem('user');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.name).toBe('Jane');
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

      // Trigger attach first
      await plugin.onAttach(cubit as any);

      // Rapid state changes
      for (let i = 1; i <= 5; i++) {
        cubit.setValue(i);
        plugin.onStateChange(i - 1, i);
      }

      // Should not have saved yet due to debouncing
      expect(storage.getItem('counter')).toBeNull();

      // Advance time past debounce
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

      // Trigger attach
      await plugin.onAttach(cubit as any);

      cubit.updateName('Updated');
      plugin.onStateChange(initialState, cubit.state);

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

      // Wait for state update from emit
      await new Promise((resolve) => setTimeout(resolve, 10));

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
      const plugin2 = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        encrypt: { encrypt, decrypt },
      });
      cubit2.addPlugin(plugin2);

      await plugin2.onAttach(cubit2 as any);

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 10));

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

  describe('Selective Persistence', () => {
    interface ComplexState {
      settings: {
        theme: string;
        language: string;
      };
      session: {
        token: string;
        isLoading: boolean;
      };
      data: {
        items: string[];
        lastUpdated: Date;
      };
    }

    it('should persist only selected parts of state', async () => {
      const plugin = new PersistencePlugin<ComplexState>({
        key: 'complex',
        storage,
        debounceMs: 0,
        select: (state) => ({
          settings: state.settings,
          data: {
            items: state.data.items,
            // Exclude lastUpdated
          },
        }),
      });

      const state: ComplexState = {
        settings: { theme: 'dark', language: 'en' },
        session: { token: 'secret', isLoading: true },
        data: { items: ['a', 'b', 'c'], lastUpdated: new Date() },
      };

      const cubit = new Cubit(state);
      cubit.addPlugin(plugin);

      await plugin.onAttach(cubit as any);

      // Trigger state change
      plugin.onStateChange(state, state);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const saved = JSON.parse(storage.getItem('complex')!);

      // Should include settings and data.items
      expect(saved.settings).toEqual({ theme: 'dark', language: 'en' });
      expect(saved.data.items).toEqual(['a', 'b', 'c']);

      // Should exclude session and data.lastUpdated
      expect(saved.session).toBeUndefined();
      expect(saved.data.lastUpdated).toBeUndefined();
    });

    it('should merge persisted partial state with current state', async () => {
      // Store partial state
      storage.setItem(
        'complex',
        JSON.stringify({
          settings: { theme: 'dark', language: 'fr' },
          data: { items: ['x', 'y'] },
        }),
      );

      const plugin = new PersistencePlugin<ComplexState>({
        key: 'complex',
        storage,
        select: (state) => ({
          settings: state.settings,
          data: { items: state.data.items },
        }),
        merge: (persisted, current) => ({
          ...current,
          settings: persisted.settings || current.settings,
          data: {
            ...current.data,
            items: (persisted.data as any)?.items || current.data.items,
          },
        }),
      });

      const initialState: ComplexState = {
        settings: { theme: 'light', language: 'en' },
        session: { token: 'new-token', isLoading: false },
        data: { items: [], lastUpdated: new Date() },
      };

      const cubit = new Cubit(initialState);
      cubit.addPlugin(plugin);

      await plugin.onAttach(cubit as any);

      // Settings should be restored from storage
      expect(cubit.state.settings).toEqual({ theme: 'dark', language: 'fr' });
      expect(cubit.state.data.items).toEqual(['x', 'y']);

      // Session should remain from initial state
      expect(cubit.state.session).toEqual({
        token: 'new-token',
        isLoading: false,
      });
      // lastUpdated should remain from initial state
      expect(cubit.state.data.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent save attempts', async () => {
      vi.useFakeTimers();

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 50,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);

      // Attach plugin first
      await plugin.onAttach(cubit as any);

      // Simulate rapid state changes
      for (let i = 1; i <= 10; i++) {
        cubit.setValue(i);
        plugin.onStateChange(i - 1, i);
      }

      // Should only save the final value
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(storage.getItem('counter')).toBe('10');

      vi.useRealTimers();
    });

    it('should not save while hydrating', async () => {
      storage.setItem('counter', '100');

      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        debounceMs: 0,
      });

      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);

      // Track observer notifications
      const notificationCount = { value: 0 };
      const unsubscribe = cubit.subscribe(() => {
        notificationCount.value++;
      });

      // Attach and hydrate
      await plugin.onAttach(cubit as any);

      // Should have restored state
      expect(cubit.state).toBe(100);

      // The hydration should not trigger a save back
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Storage should still contain the original value (not re-saved)
      expect(storage.getItem('counter')).toBe('100');

      // Cleanup
      unsubscribe();
    });
  });
});
