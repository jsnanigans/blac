import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { Cubit } from './Cubit';
import { StateContainer } from './StateContainer';
import { clearAll } from '../registry';

// ============ Test Implementations ============

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = (): void => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = (): void => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = (): void => {
    this.emit({ count: 0 });
  };

  addAmount = (amount: number): void => {
    this.emit({ count: this.state.count + amount });
  };
}

interface TodoState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
  isLoading: boolean;
}

class TodoCubit extends Cubit<TodoState> {
  static keepAlive = true;
  private nextId = 0;

  constructor() {
    super({
      todos: [],
      filter: 'all',
      isLoading: false,
    });
  }

  addTodo = (text: string): void => {
    this.update((state) => ({
      ...state,
      todos: [
        ...state.todos,
        { id: `todo-${Date.now()}-${this.nextId++}`, text, done: false },
      ],
    }));
  };

  toggleTodo = (id: string): void => {
    this.update((state) => ({
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      ),
    }));
  };

  removeTodo = (id: string): void => {
    this.update((state) => ({
      ...state,
      todos: state.todos.filter((todo) => todo.id !== id),
    }));
  };

  setFilter = (filter: TodoState['filter']): void => {
    this.patch({ filter });
  };

  setLoading = (isLoading: boolean): void => {
    this.patch({ isLoading });
  };

  get visibleTodos() {
    const { todos, filter } = this.state;

    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.done);
      case 'completed':
        return todos.filter((t) => t.done);
      case 'all':
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter((t) => !t.done).length;
  }
}

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

  replaceUser = (user: UserState): void => {
    this.emit(user);
  };
}

// ============ Test Helpers ============

const resetState = () => {
  clearAll();
};

// ============ Fixtures ============

const fixture = {
  counter: () => new CounterCubit(),
  user: () => new UserCubit(),
  todo: () => new TodoCubit(),
};

// ============ Tests ============

describe('Cubit', () => {
  beforeEach(resetState);
  afterEach(resetState);

  describe('Basic Functionality', () => {
    it('should extend StateContainer properly', () => {
      const cubit = fixture.user();

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
        const cubit = fixture.user();
        const listener = vi.fn();
        cubit.subscribe(listener);

        cubit.updateName('Jane Doe');

        expect(cubit.state.name).toBe('Jane Doe');
        expect(cubit.state.email).toBe('john@example.com');
        expect(cubit.state.age).toBe(30);
        expect(listener).toHaveBeenCalledWith({
          id: '1',
          name: 'Jane Doe',
          email: 'john@example.com',
          age: 30,
        });
      });

      it('should update multiple fields at once', () => {
        const cubit = fixture.user();

        cubit.updateMultiple('Alice', 25);

        expect(cubit.state.name).toBe('Alice');
        expect(cubit.state.age).toBe(25);
        expect(cubit.state.id).toBe('1');
        expect(cubit.state.email).toBe('john@example.com');
      });

      it('should maintain this binding (arrow function)', () => {
        const cubit = fixture.user();

        const updateName = cubit.updateName;
        updateName('Bob');

        expect(cubit.state.name).toBe('Bob');
      });

      it('should notify listeners on patch', () => {
        const cubit = fixture.user();
        const listener = vi.fn();
        cubit.subscribe(listener);

        cubit.updateEmail('newemail@example.com');

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'newemail@example.com' }),
        );
      });

      it('should work alongside emit method', () => {
        const cubit = fixture.user();
        const listener = vi.fn();
        cubit.subscribe(listener);

        cubit.updateName('First Update');
        expect(listener).toHaveBeenCalledTimes(1);

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

  describe('CounterCubit Example', () => {
    it('should initialize with zero', () => {
      expect(fixture.counter().state).toEqual({ count: 0 });
    });

    it('should increment correctly', () => {
      const counter = fixture.counter();
      const listener = vi.fn();
      counter.subscribe(listener);

      counter.increment();

      expect(counter.state).toEqual({ count: 1 });
      expect(listener).toHaveBeenCalledWith({ count: 1 });
    });

    it('should decrement correctly', () => {
      const counter = fixture.counter();

      counter.increment();
      counter.increment();
      counter.decrement();

      expect(counter.state).toEqual({ count: 1 });
    });

    it('should reset to zero', () => {
      const counter = fixture.counter();

      counter.increment();
      counter.increment();
      counter.increment();
      counter.reset();

      expect(counter.state).toEqual({ count: 0 });
    });

    it('should add custom amount', () => {
      const counter = fixture.counter();

      counter.addAmount(5);
      expect(counter.state).toEqual({ count: 5 });

      counter.addAmount(10);
      expect(counter.state).toEqual({ count: 15 });

      counter.addAmount(-3);
      expect(counter.state).toEqual({ count: 12 });
    });

    it('should handle rapid operations', () => {
      const counter = fixture.counter();

      for (let i = 0; i < 100; i++) {
        counter.increment();
      }
      expect(counter.state).toEqual({ count: 100 });

      for (let i = 0; i < 50; i++) {
        counter.decrement();
      }
      expect(counter.state).toEqual({ count: 50 });
    });

    it('should maintain this binding for arrow functions', () => {
      const counter = fixture.counter();

      const increment = counter.increment;
      const addAmount = counter.addAmount;

      increment();
      expect(counter.state).toEqual({ count: 1 });

      addAmount(9);
      expect(counter.state).toEqual({ count: 10 });
    });
  });

  describe('TodoCubit Example', () => {
    let todoCubit: TodoCubit;

    beforeEach(() => {
      todoCubit = fixture.todo();
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

        const secondId = todoCubit.state.todos[1].id;
        todoCubit.toggleTodo(secondId);
      });

      describe('visibleTodos', () => {
        it('should return all todos when filter is "all"', () => {
          todoCubit.setFilter('all');

          expect(todoCubit.visibleTodos.length).toBe(3);
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

          todoCubit.state.todos.forEach((todo) => {
            if (!todo.done) todoCubit.toggleTodo(todo.id);
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
            if (!todo.done) todoCubit.toggleTodo(todo.id);
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

        todoCubit.addTodo('Buy groceries');
        callCount++;
        todoCubit.addTodo('Write tests');
        callCount++;
        todoCubit.addTodo('Deploy app');
        callCount++;

        expect(listener).toHaveBeenCalledTimes(callCount);
        expect(todoCubit.state.todos.length).toBe(3);
        expect(todoCubit.activeTodoCount).toBe(3);

        const firstId = todoCubit.state.todos[0].id;
        todoCubit.toggleTodo(firstId);
        callCount++;

        expect(listener).toHaveBeenCalledTimes(callCount);
        expect(todoCubit.activeTodoCount).toBe(2);

        todoCubit.setFilter('active');
        callCount++;
        expect(todoCubit.visibleTodos.length).toBe(2);

        todoCubit.setFilter('completed');
        callCount++;
        expect(todoCubit.visibleTodos.length).toBe(1);

        todoCubit.removeTodo(firstId);
        callCount++;

        expect(todoCubit.state.todos.length).toBe(2);
        expect(todoCubit.activeTodoCount).toBe(2);
        expect(listener).toHaveBeenCalledTimes(callCount);
      });

      it('should maintain state consistency across operations', () => {
        for (let i = 0; i < 10; i++) {
          todoCubit.addTodo(`Todo ${i}`);
        }

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

  describe('patch() change detection', () => {
    it('should not emit when patching with identical primitive values', () => {
      const cubit = fixture.user();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({ name: 'John Doe', age: 30 });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit when patching with empty object', () => {
      const cubit = fixture.user();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({});

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit when at least one value changes', () => {
      const cubit = fixture.user();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({ name: 'Jane Doe', age: 30 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(cubit.state.name).toBe('Jane Doe');
      expect(cubit.state.age).toBe(30);
    });

    it('should preserve state reference when no values change', () => {
      const cubit = fixture.user();
      const stateBefore = cubit.state;

      cubit.patch({ name: 'John Doe' });

      expect(cubit.state).toBe(stateBefore);
    });

    it('should handle NaN correctly (Object.is semantics)', () => {
      class NanCubit extends Cubit<{ value: number }> {
        constructor() {
          super({ value: NaN });
        }
      }
      const cubit = new NanCubit();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({ value: NaN });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should detect change from null to a value', () => {
      class NullCubit extends Cubit<{ value: string | null }> {
        constructor() {
          super({ value: null });
        }
      }
      const cubit = new NullCubit();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({ value: 'hello' });
      expect(listener).toHaveBeenCalledTimes(1);

      cubit.patch({ value: 'hello' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should detect change when object reference changes', () => {
      class ObjCubit extends Cubit<{ items: number[] }> {
        constructor() {
          super({ items: [1, 2, 3] });
        }
      }
      const cubit = new ObjCubit();
      const listener = vi.fn();
      cubit.subscribe(listener);

      cubit.patch({ items: [1, 2, 3] });
      expect(listener).toHaveBeenCalledTimes(1);

      const sameRef = cubit.state.items;
      cubit.patch({ items: sameRef });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle patching with empty object', () => {
      const cubit = fixture.user();
      const originalState = { ...cubit.state };

      cubit.patch({});

      expect(cubit.state).toEqual(originalState);
    });

    it('should handle state after disposal', () => {
      const cubit = fixture.user();

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
