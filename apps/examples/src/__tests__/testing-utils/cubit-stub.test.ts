import { describe, it, expect, vi } from 'vitest';
import { Cubit } from '@blac/core';
import { blacTestSetup, createCubitStub } from '@blac/core/testing';
import {
  CounterCubit,
  AuthCubit,
  TodoCubit,
  SettingsCubit,
  LoadingCubit,
} from './fixtures';

blacTestSetup();

describe('createCubitStub', () => {
  describe('basic instance creation', () => {
    it('creates a real instance of the class', () => {
      const stub = createCubitStub(CounterCubit);
      expect(stub).toBeInstanceOf(CounterCubit);
      expect(stub).toBeInstanceOf(Cubit);
    });

    it('returns default state when no options given', () => {
      const stub = createCubitStub(CounterCubit);
      expect(stub.state.count).toBe(0);
    });
  });

  describe('state seeding with object state', () => {
    it('patches partial state onto the default', () => {
      const stub = createCubitStub(SettingsCubit, {
        state: { theme: 'dark' },
      });
      expect(stub.state.theme).toBe('dark');
      // Other fields retain defaults
      expect(stub.state.locale).toBe('en');
      expect(stub.state.notifications).toBe(true);
    });

    it('patches multiple fields at once', () => {
      const stub = createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'test-user' },
      });
      expect(stub.state.loggedIn).toBe(true);
      expect(stub.state.userId).toBe('test-user');
      // role retains default
      expect(stub.state.role).toBe('guest');
    });

    it('patches complex nested state', () => {
      const stub = createCubitStub(TodoCubit, {
        state: {
          todos: [
            { id: '1', text: 'Buy milk', done: false },
            { id: '2', text: 'Write tests', done: true },
          ],
          filter: 'active',
        },
      });
      expect(stub.state.todos).toHaveLength(2);
      expect(stub.state.filter).toBe('active');
      expect(stub.state.todos[1].done).toBe(true);
    });
  });

  describe('state seeding with primitive state', () => {
    it('emits the full primitive state', () => {
      const stub = createCubitStub(LoadingCubit, {
        state: true,
      });
      expect(stub.state).toBe(true);
    });
  });

  describe('method overrides', () => {
    it('replaces specified methods with provided implementations', () => {
      const mockIncrement = vi.fn();
      const stub = createCubitStub(CounterCubit, {
        methods: { increment: mockIncrement },
      });

      stub.increment();
      expect(mockIncrement).toHaveBeenCalledOnce();
      // State unchanged because increment is mocked
      expect(stub.state.count).toBe(0);
    });

    it('leaves non-overridden methods functional', () => {
      const stub = createCubitStub(CounterCubit, {
        methods: { increment: vi.fn() },
      });

      // decrement is not overridden — still works
      stub.decrement();
      expect(stub.state.count).toBe(-1);
    });

    it('can override multiple methods', () => {
      const mockInc = vi.fn();
      const mockDec = vi.fn();
      const stub = createCubitStub(CounterCubit, {
        methods: { increment: mockInc, decrement: mockDec },
      });

      stub.increment();
      stub.decrement();
      expect(mockInc).toHaveBeenCalledOnce();
      expect(mockDec).toHaveBeenCalledOnce();
    });

    it('can return values from overridden methods', () => {
      const stub = createCubitStub(TodoCubit, {
        methods: { addTodo: vi.fn().mockReturnValue('added') },
      });

      const result = stub.addTodo('test');
      expect(result).toBe('added');
    });
  });

  describe('combined state + methods', () => {
    it('seeds state AND overrides methods', () => {
      const mockLoad = vi.fn();
      const stub = createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'admin' },
        methods: { login: mockLoad },
      });

      expect(stub.state.loggedIn).toBe(true);
      expect(stub.state.userId).toBe('admin');

      stub.login('ignored', 'user');
      expect(mockLoad).toHaveBeenCalledWith('ignored', 'user');
      // State unchanged because login is mocked
      expect(stub.state.userId).toBe('admin');
    });
  });

  describe('stub instances are fully functional', () => {
    it('supports subscribe/emit like real instances', () => {
      const stub = createCubitStub(CounterCubit);
      const listener = vi.fn();

      stub.subscribe(listener);
      stub.increment();

      expect(listener).toHaveBeenCalledOnce();
      expect(stub.state.count).toBe(1);
    });

    it('supports dispose', () => {
      const stub = createCubitStub(CounterCubit);
      expect(stub.isDisposed).toBe(false);
      stub.dispose();
      expect(stub.isDisposed).toBe(true);
    });
  });
});
