/**
 * Cubit Tests
 * Testing simple state container pattern with patch support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cubit, CounterCubit, TodoCubit } from './Cubit';
import { StateContainer } from './StateContainer';

// Test implementations
interface UserState {
  id: string;
  name: string;
  email: string;
  age: number;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    });
  }

  updateName = (name: string): void => {
    this.patch({ name });
  };

  updateEmail = (email: string): void => {
    this.patch({ email });
  };

  updateMultiple = (name: string, age: number): void => {
    this.patch({ name, age });
  };

  // Test that emit is still accessible
  replaceUser = (user: UserState): void => {
    this.emit(user);
  };
}

// Cubit with primitive state (to test patch error)
class PrimitiveCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  // Expose patch for testing error case
  tryPatch(value: any): void {
    (this.patch as any)(value);
  }
}

describe('Cubit', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  // Basic Functionality

  describe('Basic Functionality', () => {
    it('should extend StateContainer properly', () => {
      const cubit = new UserCubit();

      expect(cubit).toBeInstanceOf(Cubit);
      expect(cubit).toBeInstanceOf(StateContainer);
      expect(cubit.state).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });
    });

    describe('patch()', () => {
      it('should merge partial state for object types', () => {
        const cubit = new UserCubit();
        const listener = vi.fn();
        cubit.subscribe(listener);

        cubit.updateName('Jane Doe');

        expect(cubit.state.name).toBe('Jane Doe');
        expect(cubit.state.email).toBe('john@example.com'); // Other fields preserved
        expect(cubit.state.age).toBe(30);
        expect(listener).toHaveBeenCalledWith({
          id: '1',
          name: 'Jane Doe',
          email: 'john@example.com',
          age: 30,
        });
      });

      it('should update multiple fields at once', () => {
        const cubit = new UserCubit();

        cubit.updateMultiple('Alice', 25);

        expect(cubit.state.name).toBe('Alice');
        expect(cubit.state.age).toBe(25);
        expect(cubit.state.id).toBe('1'); // Unchanged
        expect(cubit.state.email).toBe('john@example.com'); // Unchanged
      });

      it('should throw error for non-object state', () => {
        const cubit = new PrimitiveCubit();

        expect(() => cubit.tryPatch(5 as any)).toThrow(
          'patch() is only available for object state types',
        );
      });

      it('should maintain this binding (arrow function)', () => {
        const cubit = new UserCubit();

        // Extract method and call it without context
        const updateName = cubit.updateName;
        updateName('Bob');

        expect(cubit.state.name).toBe('Bob');
      });

      it('should notify listeners on patch', () => {
        const cubit = new UserCubit();
        const listener = vi.fn();
        cubit.subscribe(listener);

        cubit.updateEmail('newemail@example.com');

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'newemail@example.com',
          }),
        );
      });

      it('should work alongside emit method', () => {
        const cubit = new UserCubit();
        const listener = vi.fn();
        cubit.subscribe(listener);

        // Use patch
        cubit.updateName('First Update');
        expect(listener).toHaveBeenCalledTimes(1);

        // Use emit (full replacement)
        cubit.replaceUser({
          id: '2',
          name: 'Replaced',
          email: 'new@example.com',
          age: 40,
        });
        expect(listener).toHaveBeenCalledTimes(2);
        expect(cubit.state.id).toBe('2');
      });
    });
  });

  // CounterCubit Tests

  describe('CounterCubit Example', () => {
    it('should initialize with zero', () => {
      const counter = new CounterCubit();
      expect(counter.state).toBe(0);
    });

    it('should increment correctly', () => {
      const counter = new CounterCubit();
      const listener = vi.fn();
      counter.subscribe(listener);

      counter.increment();

      expect(counter.state).toBe(1);
      expect(listener).toHaveBeenCalledWith(1);
    });

    it('should decrement correctly', () => {
      const counter = new CounterCubit();

      counter.increment();
      counter.increment();
      counter.decrement();

      expect(counter.state).toBe(1);
    });

    it('should reset to zero', () => {
      const counter = new CounterCubit();

      counter.increment();
      counter.increment();
      counter.increment();
      counter.reset();

      expect(counter.state).toBe(0);
    });

    it('should add custom amount', () => {
      const counter = new CounterCubit();

      counter.addAmount(5);
      expect(counter.state).toBe(5);

      counter.addAmount(10);
      expect(counter.state).toBe(15);

      counter.addAmount(-3);
      expect(counter.state).toBe(12);
    });

    it('should handle rapid operations', () => {
      const counter = new CounterCubit();

      for (let i = 0; i < 100; i++) {
        counter.increment();
      }

      expect(counter.state).toBe(100);

      for (let i = 0; i < 50; i++) {
        counter.decrement();
      }

      expect(counter.state).toBe(50);
    });

    it('should maintain this binding for arrow functions', () => {
      const counter = new CounterCubit();

      // Extract methods and call without context
      const increment = counter.increment;
      const addAmount = counter.addAmount;

      increment();
      expect(counter.state).toBe(1);

      addAmount(9);
      expect(counter.state).toBe(10);
    });
  });

  // TodoCubit Tests

  describe('TodoCubit Example', () => {
    let todoCubit: TodoCubit;

    beforeEach(() => {
      StateContainer.clearAllInstances();
      todoCubit = new TodoCubit();
    });

    describe('Basic Todo Operations', () => {
      it('should initialize with empty todos', () => {
        expect(todoCubit.state.todos).toEqual([]);
        expect(todoCubit.state.filter).toBe('all');
        expect(todoCubit.state.isLoading).toBe(false);
      });

      it('should add todo with unique ID', () => {
        todoCubit.addTodo('First todo');
        todoCubit.addTodo('Second todo');

        expect(todoCubit.state.todos.length).toBe(2);
        expect(todoCubit.state.todos[0].text).toBe('First todo');
        expect(todoCubit.state.todos[1].text).toBe('Second todo');

        // IDs should be unique
        const ids = todoCubit.state.todos.map((t) => t.id);
        expect(new Set(ids).size).toBe(2);
      });

      it('should add todo with done: false', () => {
        todoCubit.addTodo('New todo');

        expect(todoCubit.state.todos[0].done).toBe(false);
      });

      it('should toggle todo status', () => {
        todoCubit.addTodo('Toggle me');
        const todoId = todoCubit.state.todos[0].id;

        expect(todoCubit.state.todos[0].done).toBe(false);

        todoCubit.toggleTodo(todoId);
        expect(todoCubit.state.todos[0].done).toBe(true);

        todoCubit.toggleTodo(todoId);
        expect(todoCubit.state.todos[0].done).toBe(false);
      });

      it('should only toggle the correct todo', () => {
        todoCubit.addTodo('First');
        todoCubit.addTodo('Second');
        todoCubit.addTodo('Third');

        const secondId = todoCubit.state.todos[1].id;

        todoCubit.toggleTodo(secondId);

        expect(todoCubit.state.todos[0].done).toBe(false);
        expect(todoCubit.state.todos[1].done).toBe(true);
        expect(todoCubit.state.todos[2].done).toBe(false);
      });

      it('should remove todo correctly', () => {
        todoCubit.addTodo('First');
        todoCubit.addTodo('Second');
        todoCubit.addTodo('Third');

        const secondId = todoCubit.state.todos[1].id;

        todoCubit.removeTodo(secondId);

        expect(todoCubit.state.todos.length).toBe(2);
        expect(todoCubit.state.todos[0].text).toBe('First');
        expect(todoCubit.state.todos[1].text).toBe('Third');
      });

      it('should handle removing non-existent todo', () => {
        todoCubit.addTodo('First');

        todoCubit.removeTodo('non-existent-id');

        expect(todoCubit.state.todos.length).toBe(1);
      });
    });

    describe('Filter Operations', () => {
      it('should set filter using patch', () => {
        const listener = vi.fn();
        todoCubit.subscribe(listener);

        todoCubit.setFilter('active');

        expect(todoCubit.state.filter).toBe('active');
        // Should preserve other state
        expect(todoCubit.state.todos).toEqual([]);
        expect(todoCubit.state.isLoading).toBe(false);
      });

      it('should update filter multiple times', () => {
        todoCubit.setFilter('active');
        expect(todoCubit.state.filter).toBe('active');

        todoCubit.setFilter('completed');
        expect(todoCubit.state.filter).toBe('completed');

        todoCubit.setFilter('all');
        expect(todoCubit.state.filter).toBe('all');
      });
    });

    describe('Loading State', () => {
      it('should set loading using patch', () => {
        todoCubit.setLoading(true);

        expect(todoCubit.state.isLoading).toBe(true);
        // Should preserve other state
        expect(todoCubit.state.todos).toEqual([]);
        expect(todoCubit.state.filter).toBe('all');
      });

      it('should toggle loading state', () => {
        todoCubit.setLoading(true);
        expect(todoCubit.state.isLoading).toBe(true);

        todoCubit.setLoading(false);
        expect(todoCubit.state.isLoading).toBe(false);
      });
    });

    describe('Computed Properties', () => {
      beforeEach(() => {
        todoCubit.addTodo('Todo 1');
        todoCubit.addTodo('Todo 2');
        todoCubit.addTodo('Todo 3');

        // Toggle second todo to done
        const secondId = todoCubit.state.todos[1].id;
        todoCubit.toggleTodo(secondId);
      });

      describe('visibleTodos', () => {
        it('should return all todos when filter is "all"', () => {
          todoCubit.setFilter('all');

          const visible = todoCubit.visibleTodos;
          expect(visible.length).toBe(3);
        });

        it('should return only active todos when filter is "active"', () => {
          todoCubit.setFilter('active');

          const visible = todoCubit.visibleTodos;
          expect(visible.length).toBe(2);
          expect(visible.every((t) => !t.done)).toBe(true);
        });

        it('should return only completed todos when filter is "completed"', () => {
          todoCubit.setFilter('completed');

          const visible = todoCubit.visibleTodos;
          expect(visible.length).toBe(1);
          expect(visible.every((t) => t.done)).toBe(true);
        });

        it('should update when todos change', () => {
          todoCubit.setFilter('active');
          expect(todoCubit.visibleTodos.length).toBe(2);

          // Mark all as done
          todoCubit.state.todos.forEach((todo) => {
            if (!todo.done) {
              todoCubit.toggleTodo(todo.id);
            }
          });

          expect(todoCubit.visibleTodos.length).toBe(0);
        });
      });

      describe('activeTodoCount', () => {
        it('should return count of active todos', () => {
          expect(todoCubit.activeTodoCount).toBe(2);
        });

        it('should update when todo status changes', () => {
          expect(todoCubit.activeTodoCount).toBe(2);

          const firstId = todoCubit.state.todos[0].id;
          todoCubit.toggleTodo(firstId);

          expect(todoCubit.activeTodoCount).toBe(1);

          todoCubit.toggleTodo(firstId);
          expect(todoCubit.activeTodoCount).toBe(2);
        });

        it('should be zero when all todos are completed', () => {
          todoCubit.state.todos.forEach((todo) => {
            if (!todo.done) {
              todoCubit.toggleTodo(todo.id);
            }
          });

          expect(todoCubit.activeTodoCount).toBe(0);
        });

        it('should be zero when no todos exist', () => {
          todoCubit.state.todos.forEach((todo) => {
            todoCubit.removeTodo(todo.id);
          });

          expect(todoCubit.activeTodoCount).toBe(0);
        });
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complete workflow', () => {
        const listener = vi.fn();
        todoCubit.subscribe(listener);
        let callCount = 0;

        // Add todos
        todoCubit.addTodo('Buy groceries');
        callCount++;
        todoCubit.addTodo('Write tests');
        callCount++;
        todoCubit.addTodo('Deploy app');
        callCount++;

        expect(listener).toHaveBeenCalledTimes(callCount);
        expect(todoCubit.state.todos.length).toBe(3);
        expect(todoCubit.activeTodoCount).toBe(3);

        // Complete first todo
        const firstId = todoCubit.state.todos[0].id;
        todoCubit.toggleTodo(firstId);
        callCount++;

        expect(listener).toHaveBeenCalledTimes(callCount);
        expect(todoCubit.activeTodoCount).toBe(2);

        // Filter to active only
        todoCubit.setFilter('active');
        callCount++;
        expect(todoCubit.visibleTodos.length).toBe(2);

        // Filter to completed
        todoCubit.setFilter('completed');
        callCount++;
        expect(todoCubit.visibleTodos.length).toBe(1);

        // Remove completed todo
        todoCubit.removeTodo(firstId);
        callCount++;

        expect(todoCubit.state.todos.length).toBe(2);
        expect(todoCubit.activeTodoCount).toBe(2);
        expect(listener).toHaveBeenCalledTimes(callCount);
      });

      it('should maintain state consistency across operations', () => {
        // Add and manipulate many todos
        for (let i = 0; i < 10; i++) {
          todoCubit.addTodo(`Todo ${i}`);
        }

        // Toggle some
        [0, 2, 4, 6, 8].forEach((index) => {
          const id = todoCubit.state.todos[index].id;
          todoCubit.toggleTodo(id);
        });

        expect(todoCubit.activeTodoCount).toBe(5);
        expect(todoCubit.state.todos.length).toBe(10);

        todoCubit.setFilter('completed');
        expect(todoCubit.visibleTodos.length).toBe(5);

        todoCubit.setFilter('active');
        expect(todoCubit.visibleTodos.length).toBe(5);

        // Remove all completed
        const completedIds = todoCubit.state.todos
          .filter((t) => t.done)
          .map((t) => t.id);

        completedIds.forEach((id) => todoCubit.removeTodo(id));

        expect(todoCubit.state.todos.length).toBe(5);
        expect(todoCubit.activeTodoCount).toBe(5);
      });
    });

    describe('keepAlive Configuration', () => {
      it('should have static keepAlive enabled', () => {
        expect(TodoCubit.keepAlive).toBe(true);
      });
    });
  });

  // Edge Cases

  describe('Edge Cases', () => {
    it('should handle patching with empty object', () => {
      const cubit = new UserCubit();
      const originalState = { ...cubit.state };

      cubit.patch({});

      expect(cubit.state).toEqual(originalState);
    });

    it('should handle state after disposal', () => {
      const cubit = new UserCubit();

      cubit.dispose();

      expect(() => cubit.updateName('Test')).toThrow();
    });

    it('should work with null values in object state', () => {
      interface NullableState {
        value: string | null;
        count: number;
      }

      class NullableCubit extends Cubit<NullableState> {
        constructor() {
          super({ value: 'initial', count: 0 });
        }

        setNull(): void {
          this.patch({ value: null });
        }
      }

      const cubit = new NullableCubit();
      cubit.setNull();

      expect(cubit.state.value).toBeNull();
      expect(cubit.state.count).toBe(0);
    });
  });
});
