/**
 * Type tests for Cubit.patch() method
 * These tests verify TypeScript type safety at compile time
 */

import { Cubit } from '../Cubit';

// ============================================
// Should NOT compile - primitive state types
// ============================================

// @ts-expect-error - patch should not exist on number state
class NumberCubit extends Cubit<number> {
  test = () => {
    this.patch({ value: 5 });
  };
}

// @ts-expect-error - patch should not exist on string state
class StringCubit extends Cubit<string> {
  test = () => {
    this.patch({ value: 'test' });
  };
}

// @ts-expect-error - patch should not exist on boolean state
class BooleanCubit extends Cubit<boolean> {
  test = () => {
    this.patch({ value: true });
  };
}

// ============================================
// Should compile - object state types
// ============================================

interface UserState {
  name: string;
  age: number;
  email: string;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ name: 'John', age: 30, email: 'john@example.com' });
  }

  // ✅ Should work - single field
  updateName = (name: string) => {
    this.patch({ name });
  };

  // ✅ Should work - multiple fields
  updateProfile = (name: string, age: number) => {
    this.patch({ name, age });
  };

  // ✅ Should work - all fields
  replaceAll = (state: UserState) => {
    this.patch(state);
  };

  // @ts-expect-error - invalid field name
  updateInvalid = () => {
    this.patch({ invalid: true });
  };

  // @ts-expect-error - wrong type for field
  updateNameWrongType = () => {
    this.patch({ name: 123 });
  };

  // ✅ Should work - partial with correct types
  updateSome = () => {
    this.patch({ name: 'Jane' });
  };
}

// ============================================
// Complex nested types
// ============================================

interface ComplexState {
  id: number;
  user: {
    name: string;
    profile: {
      bio: string;
      avatar: string;
    };
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class ComplexCubit extends Cubit<ComplexState> {
  constructor() {
    super({
      id: 1,
      user: {
        name: 'John',
        profile: {
          bio: 'Hello',
          avatar: 'avatar.jpg',
        },
      },
      settings: {
        theme: 'dark',
        notifications: true,
      },
    });
  }

  // ✅ Should work - top-level field
  updateId = (id: number) => {
    this.patch({ id });
  };

  // ✅ Should work - nested object replacement
  updateUser = (user: ComplexState['user']) => {
    this.patch({ user });
  };

  // ✅ Should work - multiple top-level fields
  updateMultiple = (id: number, settings: ComplexState['settings']) => {
    this.patch({ id, settings });
  };

  // @ts-expect-error - wrong nested type
  updateUserWrong = () => {
    this.patch({ user: 'invalid' });
  };
}

// ============================================
// Optional properties
// ============================================

interface OptionalState {
  required: string;
  optional?: number;
  nullable: string | null;
}

class OptionalCubit extends Cubit<OptionalState> {
  constructor() {
    super({ required: 'test', nullable: null });
  }

  // ✅ Should work - set optional property
  setOptional = (value: number) => {
    this.patch({ optional: value });
  };

  // ✅ Should work - clear optional property
  clearOptional = () => {
    this.patch({ optional: undefined });
  };

  // ✅ Should work - set nullable to null
  clearNullable = () => {
    this.patch({ nullable: null });
  };

  // ✅ Should work - set nullable to string
  setNullable = (value: string) => {
    this.patch({ nullable: value });
  };

  // @ts-expect-error - wrong type for optional
  setOptionalWrong = () => {
    this.patch({ optional: 'wrong' });
  };
}

// ============================================
// Array state (edge case)
// ============================================

class ArrayCubit extends Cubit<number[]> {
  constructor() {
    super([1, 2, 3]);
  }

  // Arrays are objects, so patch technically works
  // But TypeScript should require index signature
  updateIndex = (index: number, value: number) => {
    // Need to cast because arrays don't have Partial<number[]> in the usual sense
    this.patch({ [index]: value } as any);
  };
}

// ============================================
// Readonly properties
// ============================================

interface ReadonlyState {
  readonly id: number;
  name: string;
}

class ReadonlyCubit extends Cubit<ReadonlyState> {
  constructor() {
    super({ id: 1, name: 'test' });
  }

  // ✅ Should work - Partial<> removes readonly
  updateName = (name: string) => {
    this.patch({ name });
  };

  // ✅ Should work - can update readonly fields via patch
  updateId = (id: number) => {
    this.patch({ id });
  };
}

// ============================================
// Generic types
// ============================================

interface GenericState<T> {
  value: T;
  count: number;
}

class GenericCubit<T> extends Cubit<GenericState<T>> {
  constructor(initialValue: T) {
    super({ value: initialValue, count: 0 });
  }

  // ✅ Should work - update generic field
  updateValue = (value: T) => {
    this.patch({ value });
  };

  // ✅ Should work - update non-generic field
  incrementCount = () => {
    this.patch({ count: this.state.count + 1 });
  };

  // @ts-expect-error - wrong type for generic field
  updateValueWrong = () => {
    this.patch({ value: 'wrong' as any });
  };
}

// ============================================
// Union types
// ============================================

interface LoadingState {
  status: 'loading';
}

interface SuccessState {
  status: 'success';
  data: string;
}

interface ErrorState {
  status: 'error';
  error: Error;
}

type AsyncState = LoadingState | SuccessState | ErrorState;

class AsyncCubit extends Cubit<AsyncState> {
  constructor() {
    super({ status: 'loading' });
  }

  // ✅ Should work - partial of union
  setLoading = () => {
    this.patch({ status: 'loading' } as Partial<AsyncState>);
  };

  // Note: For union types, patch may not be type-safe
  // This is a known limitation of Partial<Union>
  // Recommendation: use emit() for union state types
}

export {}; // Make this a module
