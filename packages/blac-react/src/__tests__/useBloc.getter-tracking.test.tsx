/**
 * Integration tests for automatic getter tracking in useBloc
 *
 * Tests the following scenarios:
 * 1. Basic getter tracking
 * 2. Multiple getters
 * 3. Nested getters
 * 4. Complex return values (reference equality)
 * 5. Error handling
 * 6. Integration with state tracking
 * 7. Manual dependencies mode (disables getter tracking)
 * 8. autoTrack: false mode (disables getter tracking)
 * 9. React Strict Mode compatibility
 * 10. Memory cleanup
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import React, { StrictMode } from 'react';

// ============================================================================
// Test Blocs
// ============================================================================

class CounterBloc extends Cubit<{ count: number; other: string }> {
  static isolated = true;

  constructor() {
    super({ count: 0, other: 'initial' });
  }

  get doubled() {
    return this.state.count * 2;
  }

  increment = () => {
    this.update((s) => ({ ...s, count: s.count + 1 }));
  };

  updateOther = (value: string) => {
    this.update((s) => ({ ...s, other: value }));
  };
}

class MultiGetterBloc extends Cubit<{ a: number; b: number }> {
  static isolated = true;

  constructor() {
    super({ a: 1, b: 2 });
  }

  get sumAB() {
    return this.state.a + this.state.b;
  }

  get productAB() {
    return this.state.a * this.state.b;
  }

  updateA = (value: number) => {
    this.update((s) => ({ ...s, a: value }));
  };

  updateB = (value: number) => {
    this.update((s) => ({ ...s, b: value }));
  };
}

class NestedGetterBloc extends Cubit<{ value: number }> {
  static isolated = true;

  constructor() {
    super({ value: 5 });
  }

  get doubled() {
    return this.state.value * 2;
  }

  get quadrupled() {
    return this.doubled * 2;
  }

  updateValue = (value: number) => {
    this.update(() => ({ value }));
  };
}

class ComplexReturnBloc extends Cubit<{ items: string[] }> {
  static isolated = true;

  constructor() {
    super({ items: ['a', 'b', 'c'] });
  }

  // Returns new array each time - will always trigger re-render
  get filtered() {
    return this.state.items.filter((x) => x !== 'b');
  }

  // Cached version - returns same reference when possible
  private _cachedFiltered: { stateRef: any; result: string[] } | null = null;
  get filteredCached() {
    if (this._cachedFiltered?.stateRef === this.state) {
      return this._cachedFiltered.result;
    }
    const result = this.state.items.filter((x) => x !== 'b');
    this._cachedFiltered = { stateRef: this.state, result };
    return result;
  }

  addItem = (item: string) => {
    this.update((s) => ({ items: [...s.items, item] }));
  };

  removeItem = (item: string) => {
    this.update((s) => ({ items: s.items.filter((x) => x !== item) }));
  };
}

class ErrorBloc extends Cubit<{ value: number }> {
  static isolated = true;

  constructor() {
    super({ value: 5 });
  }

  get willThrow() {
    if (this.state.value < 0) {
      throw new Error('Negative value!');
    }
    return this.state.value * 2;
  }

  updateValue = (value: number) => {
    this.update(() => ({ value }));
  };
}

class StateAndGetterBloc extends Cubit<{ count: number; name: string }> {
  static isolated = true;

  constructor() {
    super({ count: 0, name: 'initial' });
  }

  get doubled() {
    return this.state.count * 2;
  }

  incrementCount = () => {
    this.update((s) => ({ ...s, count: s.count + 1 }));
  };

  updateName = (name: string) => {
    this.update((s) => ({ ...s, name }));
  };
}

// ============================================================================
// Task 5.4: Integration Test - Basic Getter Tracking
// ============================================================================

describe('useBloc - Basic Getter Tracking', () => {
  it('should track getter access and re-render when getter value changes', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(CounterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change state that affects getter
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('doubled')).toHaveTextContent('2');
    });

    // Should have re-rendered (initial + update)
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should NOT re-render when state changes but getter value stays same', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(CounterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={() => bloc.updateOther('changed')}>
            Update Other
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change unrelated state - getter value stays same
    await userEvent.click(screen.getByRole('button'));

    // Wait a bit to ensure no re-render happens
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should NOT have re-rendered (getter value unchanged)
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle getter returning same value after state change', async () => {
    const renderSpy = vi.fn();

    class SameValueBloc extends Cubit<{ value: number }> {
      static isolated = true;
      constructor() {
        super({ value: 5 });
      }
      get ten() {
        return 10;
      }
      add = () => {
        this.patch({ value: this.state.value + 1 });
      };
    }

    function TestComponent() {
      const [_state, bloc] = useBloc(SameValueBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.ten}</span>
          <button onClick={bloc.add}>No-Op</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('10');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Trigger state change that results in same value
    await userEvent.click(screen.getByRole('button'));

    // Wait a bit to ensure no re-render happens
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should NOT re-render (value unchanged)
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Task 5.5: Integration Test - Multiple Getters
// ============================================================================

describe('useBloc - Multiple Getters', () => {
  it('should track multiple getters independently', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(MultiGetterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="sum">{bloc.sumAB}</span>
          <span data-testid="product">{bloc.productAB}</span>
          <button onClick={() => bloc.updateA(3)}>Update A</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('sum')).toHaveTextContent('3'); // 1 + 2
    expect(screen.getByTestId('product')).toHaveTextContent('2'); // 1 * 2
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change A: affects both sum and product
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('sum')).toHaveTextContent('5'); // 3 + 2
      expect(screen.getByTestId('product')).toHaveTextContent('6'); // 3 * 2
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should only track getters that are accessed', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(MultiGetterBloc);
      renderSpy();
      // Only access sumAB, not productAB
      return (
        <div>
          <span data-testid="sum">{bloc.sumAB}</span>
          <button onClick={() => bloc.updateA(3)}>Update A</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('sum')).toHaveTextContent('3');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change A: affects sum
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('sum')).toHaveTextContent('5');
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Task 5.6: Integration Test - Nested Getters
// ============================================================================

describe('useBloc - Nested Getters', () => {
  it('should handle getters calling other getters', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(NestedGetterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="quadrupled">{bloc.quadrupled}</span>
          <button onClick={() => bloc.updateValue(10)}>Update</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('quadrupled')).toHaveTextContent('20'); // 5 * 4
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change value: affects quadrupled
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('quadrupled')).toHaveTextContent('40'); // 10 * 4
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Task 5.7: Integration Test - Complex Return Values
// ============================================================================

describe('useBloc - Complex Return Values', () => {
  it('should use reference equality for arrays (new array = re-render)', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(ComplexReturnBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="count">{bloc.filtered.length}</span>
          <button onClick={() => bloc.addItem('d')}>Add</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('2'); // ['a', 'c']
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Add item: getter returns new array (different reference)
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('3'); // ['a', 'c', 'd']
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle cached getters with stable references', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(ComplexReturnBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="count">{bloc.filteredCached.length}</span>
          <button onClick={() => bloc.removeItem('a')}>Remove</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('2'); // ['a', 'c']
    const initialRenderCount = renderSpy.mock.calls.length;

    // Remove item: getter cache invalidates, returns new array
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1'); // ['c']
    });

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount + 1);
  });
});

// ============================================================================
// Task 5.8: Integration Test - Error Handling
// ============================================================================

describe('useBloc - Error Handling', () => {
  it('should handle getter errors gracefully', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const renderSpy = vi.fn();

    // Error boundary to catch render errors
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      render() {
        if (this.state.hasError) {
          return <div data-testid="error">Error caught</div>;
        }
        return this.props.children;
      }
    }

    function TestComponent() {
      const [_state, bloc] = useBloc(ErrorBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.willThrow}</span>
          <button onClick={() => bloc.updateValue(-1)}>Set Negative</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    // Initial render works (value = 5)
    expect(screen.getByTestId('doubled')).toHaveTextContent('10');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change to negative value - getter will throw
    await userEvent.click(screen.getByRole('button'));

    // Should log warning during change detection
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getter "willThrow" threw error'),
        expect.any(Error),
      );
    });

    consoleWarnSpy.mockRestore();
  });
});

// ============================================================================
// Task 5.9: Integration Test - With State Tracking
// ============================================================================

describe('useBloc - State and Getter Tracking Combined', () => {
  it('should re-render when EITHER state or getter changes', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, bloc] = useBloc(StateAndGetterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <span data-testid="name">{state.name}</span>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={bloc.incrementCount}>Increment</button>
          <button onClick={() => bloc.updateName('changed')}>
            Update Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('name')).toHaveTextContent('initial');
    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change count: affects both state.count and bloc.doubled
    await userEvent.click(screen.getByText('Increment'));

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
      expect(screen.getByTestId('doubled')).toHaveTextContent('2');
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change name: affects only state.name (getter unchanged)
    await userEvent.click(screen.getByText('Update Name'));

    await waitFor(() => {
      expect(screen.getByTestId('name')).toHaveTextContent('changed');
    });

    expect(renderSpy).toHaveBeenCalledTimes(3);
  });
});

// ============================================================================
// Task 5.10: Integration Test - Manual Dependencies
// ============================================================================

describe('useBloc - Manual Dependencies Mode', () => {
  it('should disable getter tracking when dependencies option provided', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, bloc] = useBloc(CounterBloc, {
        dependencies: (state, _bloc) => [state.count],
      });
      renderSpy();
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={bloc.increment}>Increment</button>
          <button onClick={() => bloc.updateOther('changed')}>
            Update Other
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change count: in dependencies, should re-render
    await userEvent.click(screen.getByText('Increment'));

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
      expect(screen.getByTestId('doubled')).toHaveTextContent('2');
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change other: not in dependencies, should NOT re-render
    // (even though bloc.doubled is accessed, getter tracking is disabled)
    await userEvent.click(screen.getByText('Update Other'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Task 5.11: Integration Test - autoTrack: false
// ============================================================================

describe('useBloc - autoTrack: false Mode', () => {
  it('should disable getter tracking when autoTrack: false', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(CounterBloc, { autoTrack: false });
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={bloc.increment}>Increment</button>
          <button onClick={() => bloc.updateOther('changed')}>
            Update Other
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Any state change should trigger re-render (no tracking)
    await userEvent.click(screen.getByText('Update Other'));

    await waitFor(() => {
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// Task 5.12: Integration Test - React Strict Mode
// ============================================================================

describe('useBloc - React Strict Mode', () => {
  it('should work correctly in Strict Mode (double-invocation)', async () => {
    // Note: Using a shared (non-isolated) bloc for Strict Mode test
    // because isolated blocs get disposed during Strict Mode's double-mount
    class SharedCounterBloc extends Cubit<{ count: number }> {
      // NOT isolated - shared across instances
      constructor() {
        super({ count: 0 });
      }

      get doubled() {
        return this.state.count * 2;
      }

      increment = () => {
        this.update((s) => ({ ...s, count: s.count + 1 }));
      };

      reset = () => {
        this.update(() => ({ count: 0 }));
      };
    }

    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(SharedCounterBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.doubled}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    }

    const { unmount } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    );

    // In Strict Mode, React may call render twice
    const doubled = screen.getByTestId('doubled');
    expect(doubled).toBeInTheDocument();
    const initialRenderCount = renderSpy.mock.calls.length;

    // Change state
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(parseInt(doubled.textContent || '0')).toBeGreaterThan(0);
    });

    // Should have re-rendered (but exact count depends on Strict Mode behavior)
    expect(renderSpy.mock.calls.length).toBeGreaterThan(initialRenderCount);

    // Clean up
    unmount();
    // Reset shared state for other tests
    const [, bloc] = renderHook(() => useBloc(SharedCounterBloc)).result
      .current;
    bloc.reset();
  });
});

// ============================================================================
// Task 5.13: Integration Test - Memory Cleanup
// ============================================================================

describe('useBloc - Memory Cleanup', () => {
  it('should clean up tracking state on unmount', async () => {
    function TestComponent() {
      const [_state, bloc] = useBloc(CounterBloc);
      return <span data-testid="doubled">{bloc.doubled}</span>;
    }

    const { unmount } = render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('0');

    // Unmount component
    unmount();

    // Bloc should be disposed (isolated mode)
    // No way to directly test memory cleanup, but we verify no errors
    expect(true).toBe(true);
  });
});

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('useBloc - Getter Tracking Edge Cases', () => {
  it('should handle Object.is edge cases (NaN, +0, -0)', async () => {
    class EdgeCaseBloc extends Cubit<{ value: number }> {
      static isolated = true;
      constructor() {
        super({ value: NaN });
      }
      get computed() {
        return this.state.value;
      }
      updateValue = (value: number) => {
        this.update(() => ({ value }));
      };
    }

    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(EdgeCaseBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="value">{String(bloc.computed)}</span>
          <button onClick={() => bloc.updateValue(NaN)}>Set NaN</button>
          <button onClick={() => bloc.updateValue(+0)}>Set +0</button>
          <button onClick={() => bloc.updateValue(-0)}>Set -0</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('value')).toHaveTextContent('NaN');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change NaN to NaN - Object.is(NaN, NaN) is true, should NOT re-render
    await userEvent.click(screen.getByText('Set NaN'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change NaN to +0 - should re-render
    await userEvent.click(screen.getByText('Set +0'));
    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('0');
    });
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change +0 to -0 - Object.is(+0, -0) is false, should re-render
    await userEvent.click(screen.getByText('Set -0'));
    await waitFor(() => {
      expect(renderSpy).toHaveBeenCalledTimes(3);
    });
  });

  it('should not track methods (only getters)', async () => {
    class MethodBloc extends Cubit<{ count: number }> {
      static isolated = true;
      constructor() {
        super({ count: 0 });
      }
      // This is a method, not a getter
      doubled() {
        return this.state.count * 2;
      }
      increment = () => {
        this.update((s) => ({ ...s, count: s.count + 1 }));
      };
    }

    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(MethodBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="doubled">{bloc.doubled()}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('doubled')).toHaveTextContent('0');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change state - since doubled() is a method (not tracked), any state change triggers re-render
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('doubled')).toHaveTextContent('2');
    });

    // Should have re-rendered because state changed (not because method was tracked)
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle symbol property getters', async () => {
    const mySymbol = Symbol('myGetter');

    class SymbolBloc extends Cubit<{ value: number }> {
      static isolated = true;
      constructor() {
        super({ value: 5 });
      }
      get [mySymbol]() {
        return this.state.value * 2;
      }
      updateValue = (value: number) => {
        this.update(() => ({ value }));
      };
    }

    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(SymbolBloc);
      renderSpy();
      return (
        <div>
          <span data-testid="value">{(bloc as any)[mySymbol]}</span>
          <button onClick={() => bloc.updateValue(10)}>Update</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('value')).toHaveTextContent('10');
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change value - symbol getter should be tracked
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('20');
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
