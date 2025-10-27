/**
 * Tests for Cubit.patch() method
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';

describe('Cubit.patch()', () => {
  // Clean up all instances after each test
  afterEach(() => {
    Cubit.clearAllInstances();
  });

  describe('object state', () => {
    it('should update single field', () => {
      class TestCubit extends Cubit<{ a: number; b: string }> {
        constructor() {
          super({ a: 1, b: 'hello' });
        }
        updateA = (a: number) => this.patch({ a });
      }

      const cubit = new TestCubit();
      cubit.updateA(5);

      expect(cubit.state).toEqual({ a: 5, b: 'hello' });
    });

    it('should update multiple fields', () => {
      class TestCubit extends Cubit<{ a: number; b: string; c: boolean }> {
        constructor() {
          super({ a: 1, b: 'hello', c: false });
        }
        updateMultiple = (a: number, b: string) => this.patch({ a, b });
      }

      const cubit = new TestCubit();
      cubit.updateMultiple(10, 'world');

      expect(cubit.state).toEqual({ a: 10, b: 'world', c: false });
    });

    it('should perform shallow merge only', () => {
      interface State {
        user: { name: string; age: number };
        settings: { theme: string };
      }

      class TestCubit extends Cubit<State> {
        constructor() {
          super({
            user: { name: 'John', age: 30 },
            settings: { theme: 'dark' },
          });
        }
        updateUser = (user: State['user']) => this.patch({ user });
      }

      const cubit = new TestCubit();
      cubit.updateUser({ name: 'Jane', age: 25 });

      // Entire user object is replaced (shallow merge)
      expect(cubit.state.user).toEqual({ name: 'Jane', age: 25 });
      expect(cubit.state.settings).toEqual({ theme: 'dark' });
    });

    it('should notify subscribers', () => {
      class TestCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
        increment = () => this.patch({ count: this.state.count + 1 });
      }

      const cubit = new TestCubit();
      const states: any[] = [];
      cubit.subscribe((state) => states.push(state));

      cubit.increment();

      expect(states).toHaveLength(1);
      expect(states[0]).toEqual({ count: 1 });
    });

    it('should work with complex nested state', () => {
      interface ComplexState {
        id: number;
        name: string;
        metadata: {
          created: Date;
          tags: string[];
        };
        enabled: boolean;
      }

      class ComplexCubit extends Cubit<ComplexState> {
        constructor() {
          const now = new Date();
          super({
            id: 1,
            name: 'Test',
            metadata: {
              created: now,
              tags: ['a', 'b'],
            },
            enabled: true,
          });
        }

        updateName = (name: string) => this.patch({ name });
        toggleEnabled = () => this.patch({ enabled: !this.state.enabled });
      }

      const cubit = new ComplexCubit();
      const originalMetadata = cubit.state.metadata;

      cubit.updateName('Updated');
      cubit.toggleEnabled();

      expect(cubit.state.name).toBe('Updated');
      expect(cubit.state.enabled).toBe(false);
      // Metadata should be unchanged (deep equality)
      expect(cubit.state.metadata).toEqual(originalMetadata);
    });

    it('should increment version on patch', () => {
      class TestCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
        increment = () => this.patch({ count: this.state.count + 1 });
      }

      const cubit = new TestCubit();
      const initialVersion = cubit.version;

      cubit.increment();

      expect(cubit.version).toBeGreaterThan(initialVersion);
    });
  });

  describe('primitive state', () => {
    it('should throw error for number state', () => {
      class CounterCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        // This would be a TypeScript error in real code
        tryPatch = () => (this as any).patch({ value: 5 });
      }

      const cubit = new CounterCubit();

      expect(() => cubit.tryPatch()).toThrow(
        'patch() is only available for object state types',
      );
    });

    it('should throw error for string state', () => {
      class TextCubit extends Cubit<string> {
        constructor() {
          super('');
        }
        tryPatch = () => (this as any).patch({ value: 'test' });
      }

      const cubit = new TextCubit();

      expect(() => cubit.tryPatch()).toThrow(
        'patch() is only available for object state types',
      );
    });

    it('should throw error for boolean state', () => {
      class FlagCubit extends Cubit<boolean> {
        constructor() {
          super(false);
        }
        tryPatch = () => (this as any).patch({ value: true });
      }

      const cubit = new FlagCubit();

      expect(() => cubit.tryPatch()).toThrow(
        'patch() is only available for object state types',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty patch', () => {
      class TestCubit extends Cubit<{ a: number }> {
        constructor() {
          super({ a: 1 });
        }
        noop = () => this.patch({});
      }

      const cubit = new TestCubit();

      // Empty patch should not throw
      expect(() => cubit.noop()).not.toThrow();

      // State should be unchanged
      expect(cubit.state).toEqual({ a: 1 });
    });

    it('should work with array state', () => {
      class ArrayCubit extends Cubit<number[]> {
        constructor() {
          super([1, 2, 3]);
        }
        // Arrays are objects in JavaScript
        updateIndex = (index: number, value: number) =>
          this.patch({ [index]: value } as any);
      }

      const cubit = new ArrayCubit();
      cubit.updateIndex(0, 10);

      // Should work (arrays are objects)
      expect(cubit.state[0]).toBe(10);
      expect(cubit.state[1]).toBe(2);
      expect(cubit.state[2]).toBe(3);
    });

    it('should handle undefined values in patch', () => {
      class TestCubit extends Cubit<{
        a: number;
        b?: string;
        c: boolean;
      }> {
        constructor() {
          super({ a: 1, b: 'hello', c: true });
        }
        clearB = () => this.patch({ b: undefined });
      }

      const cubit = new TestCubit();
      cubit.clearB();

      expect(cubit.state).toEqual({ a: 1, b: undefined, c: true });
    });

    it('should work with optional properties', () => {
      interface OptionalState {
        required: string;
        optional?: number;
      }

      class OptionalCubit extends Cubit<OptionalState> {
        constructor() {
          super({ required: 'test' });
        }
        setOptional = (value: number) => this.patch({ optional: value });
        clearOptional = () => this.patch({ optional: undefined });
      }

      const cubit = new OptionalCubit();

      cubit.setOptional(42);
      expect(cubit.state).toEqual({ required: 'test', optional: 42 });

      cubit.clearOptional();
      expect(cubit.state).toEqual({ required: 'test', optional: undefined });
    });
  });

  describe('integration with lifecycle', () => {
    it('should work when mounted', () => {
      class TestCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
        increment = () => this.patch({ count: this.state.count + 1 });
      }

      const cubit = new TestCubit();
      cubit.mount();

      cubit.increment();

      expect(cubit.state).toEqual({ count: 1 });

      cubit.unmount();
    });

    it('should throw when disposed', () => {
      class TestCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
        increment = () => this.patch({ count: this.state.count + 1 });
      }

      const cubit = new TestCubit();
      cubit.dispose();

      expect(() => cubit.increment()).toThrow();
    });
  });

  describe('performance', () => {
    it('should handle many patch operations efficiently', () => {
      class TestCubit extends Cubit<{ count: number; name: string }> {
        constructor() {
          super({ count: 0, name: 'test' });
        }
        incrementCount = () =>
          this.patch({ count: this.state.count + 1 });
      }

      const cubit = new TestCubit();
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        cubit.incrementCount();
      }
      const duration = performance.now() - start;

      expect(cubit.state.count).toBe(iterations);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});
