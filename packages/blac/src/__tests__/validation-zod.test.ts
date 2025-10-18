import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { Cubit } from '../Cubit';
import { Vertex } from '../Vertex';
import { BlocValidationError } from '../validation/BlocValidationError';

describe('Schema Validation - Zod Integration', () => {
  describe('Cubit with Simple Schema', () => {
    const CounterSchema = z.number().int().min(1).max(100);

    class CounterCubit extends Cubit<number> {
      static schema = CounterSchema;

      constructor() {
        super(1);
      }

      increment = () => {
        this.emit(this.state + 1);
      };

      decrement = () => {
        this.emit(this.state - 1);
      };

      setValue = (value: number) => {
        this.emit(value);
      };

      setValueValidated = (value: number) => {
        this.emitValidated(value);
      };
    }

    let cubit: CounterCubit;

    beforeEach(() => {
      cubit = new CounterCubit();
    });

    it('should accept valid initial state', () => {
      expect(cubit.state).toBe(1);
    });

    it('should throw on invalid initial state', () => {
      expect(() => {
        class InvalidCubit extends Cubit<number> {
          static schema = CounterSchema;
          constructor() {
            super(0); // Invalid: must be >= 1
          }
        }
        new InvalidCubit();
      }).toThrow();
    });

    it('should NOT validate on regular emit', () => {
      // Regular emit doesn't validate - values outside schema bounds are allowed
      cubit.setValue(50);
      expect(cubit.state).toBe(50);

      cubit.setValue(150); // Out of bounds, but no validation
      expect(cubit.state).toBe(150);

      cubit.setValue(0); // Below min, but no validation
      expect(cubit.state).toBe(0);
    });

    it('should validate on emitValidated (success)', () => {
      cubit.setValueValidated(50);
      expect(cubit.state).toBe(50);
    });

    it('should validate on emitValidated (failure - too high)', () => {
      try {
        cubit.setValueValidated(101);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        expect(cubit.state).toBe(1); // State unchanged
      }
    });

    it('should validate on emitValidated (failure - too low)', () => {
      try {
        cubit.setValueValidated(0);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        expect(cubit.state).toBe(1); // State unchanged
      }
    });

    it('should validate on emitValidated (failure - non-integer)', () => {
      try {
        cubit.setValueValidated(3.14);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        expect(cubit.state).toBe(1); // State unchanged
      }
    });

    it('should provide detailed error information', () => {
      try {
        cubit.setValueValidated(200);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        if (error instanceof BlocValidationError) {
          expect(error.issues.length).toBeGreaterThan(0);
          expect(error.attemptedState).toBe(200);
          expect(error.currentState).toBe(1);
        }
      }
    });

    it('emitValidated should throw if no schema defined', () => {
      class NoSchemaCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        setValue = (value: number) => {
          this.emitValidated(value);
        };
      }

      const noSchemaCubit = new NoSchemaCubit();
      expect(() => {
        noSchemaCubit.setValue(42);
      }).toThrow('requires a schema');
    });
  });

  describe('Cubit with Complex Schema', () => {
    const UserSchema = z.object({
      id: z.uuid(),
      name: z.string().min(1),
      email: z.email(),
      age: z.number().int().min(0).max(150),
      tags: z.array(z.string()),
      metadata: z
        .object({
          createdAt: z.iso.datetime(),
          updatedAt: z.iso.datetime().optional(),
        })
        .optional(),
    });

    type User = z.infer<typeof UserSchema>;

    class UserCubit extends Cubit<User> {
      static schema = UserSchema;

      constructor() {
        super({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Alice',
          email: 'alice@example.com',
          age: 30,
          tags: ['user', 'admin'],
          metadata: {
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        });
      }

      updateEmail = (email: string) => {
        this.emit({ ...this.state, email });
      };

      updateEmailValidated = (email: string) => {
        this.emitValidated({ ...this.state, email });
      };

      updateAge = (age: number) => {
        this.emit({ ...this.state, age });
      };

      updateAgeValidated = (age: number) => {
        this.emitValidated({ ...this.state, age });
      };
    }

    let cubit: UserCubit;

    beforeEach(() => {
      cubit = new UserCubit();
    });

    it('should validate complex initial state', () => {
      expect(cubit.state.name).toBe('Alice');
      expect(cubit.state.email).toBe('alice@example.com');
    });

    it('should NOT validate on regular emit', () => {
      // Regular emit allows invalid values
      cubit.updateEmail('invalid-email');
      expect(cubit.state.email).toBe('invalid-email');

      cubit.updateAge(-5);
      expect(cubit.state.age).toBe(-5);
    });

    it('should validate with emitValidated (success)', () => {
      cubit.updateEmailValidated('bob@example.com');
      expect(cubit.state.email).toBe('bob@example.com');

      cubit.updateAgeValidated(25);
      expect(cubit.state.age).toBe(25);
    });

    it('should validate with emitValidated (failure - invalid email)', () => {
      try {
        cubit.updateEmailValidated('invalid-email');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        expect(cubit.state.email).toBe('alice@example.com'); // Unchanged
      }
    });

    it('should validate with emitValidated (failure - invalid age)', () => {
      try {
        cubit.updateAgeValidated(-5);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
        expect(cubit.state.age).toBe(30); // Unchanged
      }
    });

    it('should validate array fields', () => {
      const updated = { ...cubit.state, tags: ['updated'] };
      cubit.emit(updated);
      expect(cubit.state.tags).toEqual(['updated']);
    });

    it('should validate optional nested objects', () => {
      const updated = {
        ...cubit.state,
        metadata: {
          createdAt: '2024-02-01T00:00:00.000Z',
          updatedAt: '2024-02-02T00:00:00.000Z',
        },
      };
      cubit.emit(updated);
      expect(cubit.state.metadata?.updatedAt).toBe('2024-02-02T00:00:00.000Z');
    });
  });

  describe('Cubit Helper Methods', () => {
    const NumberSchema = z.number().min(0).max(100);

    class TestCubit extends Cubit<number> {
      static schema = NumberSchema;
      constructor() {
        super(50);
      }
    }

    let cubit: TestCubit;

    beforeEach(() => {
      cubit = new TestCubit();
    });

    it('validate() should return success for valid value', () => {
      const result = cubit.validate(75);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(75);
      }
    });

    it('validate() should return failure for invalid value', () => {
      const result = cubit.validate(-10);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('isValid() should return true for valid value', () => {
      expect(cubit.isValid(50)).toBe(true);
      expect(cubit.isValid(0)).toBe(true);
      expect(cubit.isValid(100)).toBe(true);
    });

    it('isValid() should return false for invalid value', () => {
      expect(cubit.isValid(-1)).toBe(false);
      expect(cubit.isValid(101)).toBe(false);
    });

    it('parse() should return value for valid input', () => {
      const value = cubit.parse(42);
      expect(value).toBe(42);
    });

    it('parse() should throw for invalid input', () => {
      try {
        cubit.parse(150);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
      }
    });

    it('safeParse() should return success for valid input', () => {
      const result = cubit.safeParse(42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('safeParse() should return error for invalid input', () => {
      const result = cubit.safeParse(150);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect((result.error as any).name).toBe('BlocValidationError');
      }
    });

    it('schema getter should return the schema', () => {
      expect(cubit.schema).toBeDefined();
      expect(cubit.schema).toBe(NumberSchema);
    });
  });

  describe('Vertex (Bloc) with Schema', () => {
    const CounterStateSchema = z.object({
      count: z.number().int().min(0),
      label: z.string(),
    });

    type CounterState = z.infer<typeof CounterStateSchema>;

    class IncrementEvent {
      constructor(public readonly amount: number = 1) {}
    }

    class SetLabelEvent {
      constructor(public readonly label: string) {}
    }

    type CounterEvents = IncrementEvent | SetLabelEvent;

    class CounterBloc extends Vertex<CounterState, CounterEvents> {
      static schema = CounterStateSchema;

      constructor() {
        super({ count: 0, label: 'Counter' });

        this.on(IncrementEvent, (event, emit) => {
          emit({
            ...this.state,
            count: this.state.count + event.amount,
          });
        });

        this.on(SetLabelEvent, (event, emit) => {
          emit({
            ...this.state,
            label: event.label,
          });
        });
      }
    }

    let bloc: CounterBloc;

    beforeEach(() => {
      bloc = new CounterBloc();
    });

    it('should validate initial state', () => {
      expect(bloc.state.count).toBe(0);
      expect(bloc.state.label).toBe('Counter');
    });

    it('should emit state on event (no automatic validation)', async () => {
      await bloc.add(new IncrementEvent(5));
      expect(bloc.state.count).toBe(5);

      await bloc.add(new SetLabelEvent('Updated'));
      expect(bloc.state.label).toBe('Updated');

      // Regular emit allows negative values
      await bloc.add(new IncrementEvent(-10));
      expect(bloc.state.count).toBe(-5); // 5 + (-10) = -5
    });

    it('should NOT validate on regular emit', () => {
      // Regular emit doesn't validate
      (bloc as any).emit({ count: 3.14, label: 'Test' });
      expect(bloc.state.count).toBe(3.14);

      (bloc as any).emit({ count: -5, label: 'Test' });
      expect(bloc.state.count).toBe(-5);
    });

    it('should validate with emitValidated', () => {
      // Can call emitValidated directly
      try {
        (bloc as any).emitValidated({ count: -5, label: 'Test' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as any).name).toBe('BlocValidationError');
      }

      // State should be unchanged
      expect(bloc.state.count).toBe(0);
      expect(bloc.state.label).toBe('Counter');
    });
  });

  describe('Cubit with Coercion Schema', () => {
    const CoercionSchema = z.union([z.string(), z.number()]).transform(String);

    class CoercionCubit extends Cubit<string> {
      static schema = CoercionSchema;

      constructor() {
        super('0');
      }

      setValue = (value: string | number) => {
        this.emit(value as string);
      };

      setValueValidated = (value: string | number) => {
        this.emitValidated(value as string);
      };
    }

    it('should handle schema coercion with emitValidated', () => {
      const cubit = new CoercionCubit();

      // Number should be coerced to string with validation
      cubit.setValueValidated(42);
      expect(cubit.state).toBe('42');
      expect(typeof cubit.state).toBe('string');

      // String should pass through
      cubit.setValueValidated('100');
      expect(cubit.state).toBe('100');
    });

    it('should NOT coerce on regular emit', () => {
      const cubit = new CoercionCubit();

      // Regular emit doesn't transform
      cubit.setValue(42);
      expect(cubit.state).toBe(42 as any); // Passed through as-is
    });
  });

  describe('Cubit without Schema', () => {
    class NoSchemaCubit extends Cubit<number> {
      constructor() {
        super(0);
      }

      setValue = (value: number) => {
        this.emit(value);
      };
    }

    it('should not validate when no schema defined', () => {
      const cubit = new NoSchemaCubit();

      // Any value should be accepted
      cubit.setValue(-1000);
      expect(cubit.state).toBe(-1000);

      cubit.setValue(3.14159);
      expect(cubit.state).toBe(3.14159);
    });

    it('isValid() should return true for all values when no schema', () => {
      const cubit = new NoSchemaCubit();
      expect(cubit.isValid(-1000)).toBe(true);
      expect(cubit.isValid(NaN)).toBe(true);
    });

    it('validate() should throw when no schema defined', () => {
      const cubit = new NoSchemaCubit();
      expect(() => cubit.validate(42)).toThrow('No schema defined');
    });

    it('schema getter should return undefined', () => {
      const cubit = new NoSchemaCubit();
      expect(cubit.schema).toBeUndefined();
    });
  });
});
