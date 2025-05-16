import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Blac, Cubit } from '../src';

// --- Test Cubit Definitions ---

interface TestState {
  value: string;
  count: number;
}

interface TestProps {
  initialValue?: string;
  initialCount?: number;
}

class NonIsolatedCubit extends Cubit<TestState, TestProps> {
  constructor(props?: TestProps) {
    super({
      value: props?.initialValue ?? 'default',
      count: props?.initialCount ?? 0,
    });
  }

  setValue(val: string) {
    this.patch({ value: val });
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

class IsolatedCubit extends Cubit<TestState, TestProps> {
  static isolated = true;
  constructor(props?: TestProps) {
    super({
      value: props?.initialValue ?? 'isolated_default',
      count: props?.initialCount ?? 0,
    });
  }

  setValue(val: string) {
    this.patch({ value: val });
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

// --- Test Suite ---

describe('Blac.getBloc', () => {
  beforeEach(() => {
    Blac.resetInstance();
    // Blac.enableLog = true; // Uncomment for debugging
    vi.clearAllMocks();
  });

  // --- Non-Isolated Cubit Tests ---

  test('should retrieve a non-isolated cubit by class name (default ID)', () => {
    const cubit1 = Blac.getBloc(NonIsolatedCubit);
    expect(cubit1).toBeInstanceOf(NonIsolatedCubit);
    expect(cubit1.state.value).toBe('default');
    const cubit2 = Blac.getBloc(NonIsolatedCubit);
    expect(cubit2).toBe(cubit1); // Should return the same instance
  });

  test('should retrieve a non-isolated cubit with a custom ID', () => {
    const customId = 'customId123';
    const cubit1 = Blac.getBloc(NonIsolatedCubit, { id: customId });
    expect(cubit1).toBeInstanceOf(NonIsolatedCubit);
    expect(cubit1._id).toBe(customId);
    const cubit2 = Blac.getBloc(NonIsolatedCubit, { id: customId });
    expect(cubit2).toBe(cubit1); // Should return the same instance
  });

  test('should create a new non-isolated cubit if one does not exist', () => {
    const cubit = Blac.getBloc(NonIsolatedCubit, { id: 'newCubit' });
    expect(cubit).toBeInstanceOf(NonIsolatedCubit);
    expect(cubit.state.value).toBe('default');
  });

  test('should pass props correctly to a new non-isolated cubit', () => {
    const initialProps: TestProps = {
      initialValue: 'initial',
      initialCount: 5,
    };
    const cubit = Blac.getBloc(NonIsolatedCubit, {
      id: 'cubitWithProps',
      props: initialProps,
    });
    expect(cubit.state.value).toBe('initial');
    expect(cubit.state.count).toBe(5);
    expect(cubit.props).toEqual(initialProps);
  });

  test('should return the same instance for non-isolated cubits with the same class and ID', () => {
    const id = 'sharedNonIsolated';
    const cubit1 = Blac.getBloc(NonIsolatedCubit, { id });
    const cubit2 = Blac.getBloc(NonIsolatedCubit, { id });
    expect(cubit1).toBe(cubit2);
  });

  test('should ignore props if non-isolated cubit already exists', () => {
    const id = 'existingNonIsolated';
    const initialProps: TestProps = { initialValue: 'first' };
    const cubit1 = Blac.getBloc(NonIsolatedCubit, { id, props: initialProps });
    expect(cubit1.state.value).toBe('first');

    const newProps: TestProps = { initialValue: 'second' };
    const cubit2 = Blac.getBloc(NonIsolatedCubit, { id, props: newProps });
    expect(cubit2).toBe(cubit1);
    expect(cubit2.state.value).toBe('first'); // Props should be ignored
    expect(cubit2.props).toEqual(initialProps); // Original props retained
  });

  test('should correctly pass instanceRef to a new non-isolated cubit', () => {
    const instanceRef = 'testRefNonIsolated';
    const cubit = Blac.getBloc(NonIsolatedCubit, {
      id: 'refNonIsolated',
      instanceRef,
    });
    expect(cubit._instanceRef).toBe(instanceRef);
  });


  // --- Isolated Cubit Tests ---

  test('should retrieve an isolated cubit by class name (default ID)', () => {
    const cubit1 = Blac.getBloc(IsolatedCubit);
    expect(cubit1).toBeInstanceOf(IsolatedCubit);
    expect(cubit1.state.value).toBe('isolated_default');
    // For isolated cubits, each getBloc might create a new one if ID is not managed carefully or reused
    // This test checks creation and retrieval for the default ID case.
    const cubit2 = Blac.getBloc(IsolatedCubit);
    expect(cubit2).toBe(cubit1); // With default ID (class name), should return same instance
  });

  test('should retrieve an isolated cubit with a custom ID', () => {
    const customId = 'isolatedCustomId';
    const cubit1 = Blac.getBloc(IsolatedCubit, { id: customId });
    expect(cubit1).toBeInstanceOf(IsolatedCubit);
    expect(cubit1._id).toBe(customId);

    const cubit2 = Blac.getBloc(IsolatedCubit, { id: customId });
    expect(cubit2).toBe(cubit1); // Should return the same instance for the same ID
  });
  
  test('should create a new isolated cubit if one does not exist for that ID', () => {
    const cubit = Blac.getBloc(IsolatedCubit, { id: 'newIsolated' });
    expect(cubit).toBeInstanceOf(IsolatedCubit);
    expect(cubit.state.value).toBe('isolated_default');
  });

  test('should create different instances for isolated cubits with different IDs', () => {
    const cubit1 = Blac.getBloc(IsolatedCubit, { id: 'iso1' });
    const cubit2 = Blac.getBloc(IsolatedCubit, { id: 'iso2' });
    expect(cubit1).not.toBe(cubit2);
  });

  test('should pass props correctly to a new isolated cubit', () => {
    const initialProps: TestProps = {
      initialValue: 'initial_iso',
      initialCount: 10,
    };
    const cubit = Blac.getBloc(IsolatedCubit, {
      id: 'isolatedWithProps',
      props: initialProps,
    });
    expect(cubit.state.value).toBe('initial_iso');
    expect(cubit.state.count).toBe(10);
    expect(cubit.props).toEqual(initialProps);
  });
  
  test('should ignore props if isolated cubit with specific ID already exists', () => {
    const id = 'existingIsolated';
    const initialProps: TestProps = { initialValue: 'first_iso' };
    const cubit1 = Blac.getBloc(IsolatedCubit, { id, props: initialProps });
    expect(cubit1.state.value).toBe('first_iso');

    const newProps: TestProps = { initialValue: 'second_iso' };
    const cubit2 = Blac.getBloc(IsolatedCubit, { id, props: newProps });
    expect(cubit2).toBe(cubit1);
    expect(cubit2.state.value).toBe('first_iso'); // Props should be ignored
    expect(cubit2.props).toEqual(initialProps); // Original props retained
  });

  test('should correctly pass instanceRef to a new isolated cubit', () => {
    const instanceRef = 'testRefIsolated';
    const cubit = Blac.getBloc(IsolatedCubit, {
      id: 'refIsolated',
      instanceRef,
    });
    expect(cubit._instanceRef).toBe(instanceRef);
  });

  test('should handle undefined ID by defaulting to class name', () => {
    const cubit1 = Blac.getBloc(NonIsolatedCubit, { id: undefined });
    expect(cubit1._id).toBe(NonIsolatedCubit.name);
    const cubit2 = Blac.getBloc(NonIsolatedCubit); // No ID, defaults to class name
    expect(cubit2).toBe(cubit1);
  });

  test('should create distinct non-isolated cubits if IDs are different', () => {
    const cubit1 = Blac.getBloc(NonIsolatedCubit, { id: 'non_iso_A' });
    const cubit2 = Blac.getBloc(NonIsolatedCubit, { id: 'non_iso_B' });
    expect(cubit1).not.toBe(cubit2);
    expect(cubit1._id).toBe('non_iso_A');
    expect(cubit2._id).toBe('non_iso_B');
  });
  
  test('should log when Blac.enableLog is true (manual check)', () => {
    // This test is more of a manual verification.
    // We can spy on console.warn if needed, but Blac's log uses console.warn.
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    Blac.enableLog = true;
    Blac.getBloc(NonIsolatedCubit, { id: 'loggingTest' });
    expect(consoleWarnSpy).toHaveBeenCalled();
    // Check for a specific log message structure if precise verification is needed
    // e.g., expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[Blac'), expect.anything());
    Blac.enableLog = false; // Reset for other tests
    consoleWarnSpy.mockRestore();
  });
}); 