import { describe, it, expect, vi } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';
import { BlacContext } from '../types/BlacContext';
import { BlocLifecycleState } from '../lifecycle/BlocLifecycle';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('Circular Dependency Fix', () => {
  it('should work without Blac context (optional dependency)', () => {
    const cubit = new TestCubit();

    // Should work without context
    expect(cubit.blacContext).toBeUndefined();

    cubit.increment();

    expect(cubit.state).toBe(1);
  });

  it('should use provided mock context for logging', () => {
    const mockContext: BlacContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      plugins: {
        notifyStateChanged: vi.fn(),
        notifyBlocDisposed: vi.fn(),
      },
    };

    const cubit = new TestCubit();
    cubit.blacContext = mockContext;

    cubit.increment();

    // Verify plugin notification was called
    expect(mockContext.plugins.notifyStateChanged).toHaveBeenCalledWith(
      cubit,
      0, // old state
      1, // new state
    );
  });

  it('should use Blac as context (Blac implements BlacContext)', () => {
    const blac = new Blac({ __unsafe_ignore_singleton: true });
    const cubit = blac.getBloc(TestCubit);

    // Verify context is set
    expect(cubit.blacContext).toBe(blac);

    // Verify Blac implements BlacContext interface
    const context: BlacContext = blac; // Type-check: Blac is assignable to BlacContext
    expect(context).toBeDefined();
  });

  it('should allow testing BlocBase in isolation', () => {
    // Create minimal mock context for testing
    const testContext: BlacContext = {
      log: () => {},
      error: () => {},
      warn: () => {},
      plugins: {
        notifyStateChanged: () => {},
        notifyBlocDisposed: () => {},
      },
    };

    const cubit = new TestCubit();
    cubit.blacContext = testContext;

    // Test business logic in isolation
    expect(cubit.state).toBe(0);
    cubit.increment();
    expect(cubit.state).toBe(1);
    cubit.increment();
    expect(cubit.state).toBe(2);
  });
});

describe('Disposal State Accessor', () => {
  it('should expose disposal state publicly', () => {
    const cubit = new TestCubit();

    // Public accessor should work
    expect(cubit.disposalState).toBeDefined();
    expect(typeof cubit.disposalState).toBe('string');
    expect(cubit.disposalState).toBe(BlocLifecycleState.ACTIVE);
  });

  it('should not use unsafe type assertions', () => {
    const blac = new Blac({ __unsafe_ignore_singleton: true });
    const cubit = blac.getBloc(TestCubit);

    // This should compile without `as any`
    const state = cubit.disposalState;

    expect(state).toBeDefined();
    expect(state).toBe(BlocLifecycleState.ACTIVE);
  });
});
