import '@testing-library/jest-dom';
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Blac, Cubit } from "blac-next";
import React, { FC, useEffect, useState } from "react";
import { beforeEach, describe, expect, test } from "vitest";
import { useBloc } from "../src";
import { CustomSelectorBloc } from "../src/blocs/CustomSelectorBloc";
import { ListBloc } from "../src/blocs/ListBloc";

/**
 * Test Bloc with a complex state object for testing dependency detection
 */
type ComplexState = {
  count: number;
  name: string;
  nested: {
    value: number;
    deep: {
      property: string;
    };
  };
  list: string[];
  flags: {
    showCount: boolean;
    showName: boolean;
    showNested: boolean;
    showList: boolean;
  };
};

type ComplexProps = {
  initialState?: Partial<ComplexState>;
};

class ComplexCubit extends Cubit<ComplexState, ComplexProps> {
  static isolated = true;
  
  // Add property declaration for doubledCount
  declare doubledCount: number;

  constructor(props: ComplexProps = {}) {
    super({
      count: props.initialState?.count ?? 0,
      name: props.initialState?.name ?? "Initial Name",
      nested: props.initialState?.nested ?? {
        value: 10,
        deep: {
          property: "deep property",
        },
      },
      list: props.initialState?.list ?? ["item1", "item2"],
      flags: props.initialState?.flags ?? {
        showCount: true,
        showName: true,
        showNested: true,
        showList: true,
      },
    });
  }

  // Methods to update different parts of the state
  incrementCount = () => {
    this.patch({ count: this.state.count + 1 });
  }
  
  updateName = (newName: string) => {
    this.patch({ name: newName });
  }
  
  updateNestedValue = (value: number) => {
      this.patch({ nested: { ...this.state.nested, value } });
    }
  
  updateDeepProperty = (property: string) => {
    this.patch({ 
      nested: { 
        ...this.state.nested, 
        deep: { 
          property 
        } 
      } 
    });
  }

  addToList = (item: string) => {
    this.patch({ list: [...this.state.list, item] });
  }
  
  // Toggle visibility flags
  toggleFlag = (flag: keyof ComplexState['flags']) => {
    this.patch({ 
      flags: { 
        ...this.state.flags, 
        [flag]: !this.state.flags[flag] 
      } 
    });
}
}

// For tracking render counts
let renderCount = 0;

/**
 * Resets the global render count before each test.
 */
function resetRenderCount() {
  renderCount = 0;
}

describe('useBloc dependency detection', () => {
  beforeEach(() => {
    resetRenderCount();
    Blac.resetInstance(); // Reset Blac registry
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear mocks
    vi.clearAllTimers(); // Clear timers
  });

  /**
   * Test 1: Basic dependency detection
   * Tests that the component only re-renders when accessed properties change
   */
  test('should only re-render when accessed properties change', async () => {
    // Component that only uses the count from state
    const CounterComponent: FC = () => {
      const [state, cubit] = useBloc(ComplexCubit, {
        props: { initialState: { count: 5 } }
      });
      renderCount++;
      
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button 
            data-testid="increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => cubit.updateName("New Name")}
          >
            Update Name
          </button>
        </div>
      );
    };
    
    const { container } = render(<CounterComponent />);
    
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('count')).toHaveTextContent('5');
    
    // Update count - should trigger re-render since count is accessed
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(3);
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    
    // Update name - should NOT trigger re-render since name is not accessed
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(3);
  });

  /**
   * Test 2: Nested property dependency detection
   * Tests that the component correctly detects dependencies in nested objects
   */
  test('should detect dependencies in nested objects', async () => {
    // Component that accesses nested properties
    const NestedPropertiesComponent: FC = () => {
      const [state, cubit] = useBloc(ComplexCubit);
      renderCount++;
      
      return (
        <div>
          <div data-testid="nested-value">{state.nested.value}</div>
          <div data-testid="deep-property">{state.nested.deep.property}</div>
          <button 
            data-testid="update-nested" 
            onClick={() => cubit.updateNestedValue(50)}
          >
            Update Nested Value
          </button>
          <button 
            data-testid="update-deep" 
            onClick={() => cubit.updateDeepProperty("Updated Deep Property")}
          >
            Update Deep Property
          </button>
          <button 
            data-testid="update-count" 
            onClick={() => cubit.incrementCount()}
          >
            Update Count
          </button>
        </div>
      );
    };
    
    render(<NestedPropertiesComponent />);
    
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('nested-value')).toHaveTextContent('10');
    expect(screen.getByTestId('deep-property')).toHaveTextContent('deep property');
    
    // Update nested value - should trigger re-render
    await userEvent.click(screen.getByTestId('update-nested'));
    expect(renderCount).toBe(3);
    expect(screen.getByTestId('nested-value')).toHaveTextContent('50');
    
    // Update deep property - should trigger re-render
    await userEvent.click(screen.getByTestId('update-deep'));
    expect(renderCount).toBe(4);
    expect(screen.getByTestId('deep-property')).toHaveTextContent('Updated Deep Property');
    
    // Update count - should NOT trigger re-render
    await userEvent.click(screen.getByTestId('update-count'));
    expect(renderCount).toBe(4);
  });

  /**
   * Test 3: Dynamic dependency changes
   * Tests that the dependency tracking adjusts when rendered properties change
   */
  test('should update dependency tracking when rendered properties change', async () => {
    // Component with dynamic property access based on flags
    const DynamicComponent: FC = () => {
      const [state, cubit] = useBloc(ComplexCubit);
      renderCount++;
      
      return (
        <div>
          {state.flags.showCount && (
            <div data-testid="count">{state.count}</div>
          )}
          
          {state.flags.showName && (
            <div data-testid="name">{state.name}</div>
          )}
          
          <button 
            data-testid="increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => cubit.updateName("Updated Name")}
          >
            Update Name
          </button>
          <button 
            data-testid="toggle-count" 
            onClick={() => cubit.toggleFlag('showCount')}
          >
            Toggle Count
          </button>
          <button 
            data-testid="toggle-name" 
            onClick={() => cubit.toggleFlag('showName')}
          >
            Toggle Name
          </button>
        </div>
      );
    };
    
    render(<DynamicComponent />);
    
    // Initial render - both count and name are shown
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name');
    
    // Update count - should trigger re-render
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(3);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    
    // Update name - should trigger re-render
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(4);
    expect(screen.getByTestId('name')).toHaveTextContent('Updated Name');
    
    // Hide count display
    await userEvent.click(screen.getByTestId('toggle-count'));
    expect(renderCount).toBe(5);
    expect(screen.queryByTestId('count')).toBeNull();
    
    // Update count - should NOT trigger re-render now
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(5); // Still 5, not 6
    
    // Hide name display
    await userEvent.click(screen.getByTestId('toggle-name'));
    expect(renderCount).toBe(6);
    expect(screen.queryByTestId('name')).toBeNull();
    
    // Update name - should NOT trigger re-render now
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(6); // Still 6, not 7
    
    // Show count display again
    await userEvent.click(screen.getByTestId('toggle-count'));
    expect(renderCount).toBe(7);
    
    // Now count is visible and should show updated value (2)
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    
    // Update count - should trigger re-render again
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(8);
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  /**
   * Test 4: Array dependency detection
   * Tests that component detects changes in array elements
   */
  test('should detect dependencies in arrays', async () => {
    // Component that renders a list
    const ListComponent: FC = () => {
      const [state, { addItem, updateItem }] = useBloc(ListBloc);
      renderCount++;
      
      return (
        <div>
          {state.list.map((item, index) => (
            <span key={index} data-testid={`item-${index}`}>{item}</span>
          ))}
          <button onClick={() => { addItem('item3'); }}>Add</button>
          <button onClick={() => { updateItem(0, 'updated1'); }}>Update 0</button>
        </div>
      );
    };
    
    render(<ListComponent />);
    
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('item-0')).toHaveTextContent('item1');
    expect(screen.getByTestId('item-1')).toHaveTextContent('item2');
    
    // Update item 0 (rendered) - SHOULD re-render
    await userEvent.click(screen.getByText('Update 0'));
    expect(screen.getByTestId('item-0')).toHaveTextContent('updated1');
    expect(renderCount).toBe(3);

    // Add item (rendered) - SHOULD re-render
    await userEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('item-2')).toHaveTextContent('item3');
    expect(renderCount).toBe(4);
  });

  /**
   * Test 5: Custom dependency selector
   * Tests that the custom dependency selector works as expected
   */
  test('should respect custom dependency selector', async () => {
    // Component with custom dependency selector
    const CustomSelectorComponent: FC = () => {
      const [state, { increment, updateName }] = useBloc(CustomSelectorBloc, {
        dependencySelector: (newState, oldState) => [
          [newState.count], // Only depend on count
        ],
      });
      renderCount++;
      
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <span data-testid="name">{state.name}</span>
          <button onClick={increment}>Inc Count</button>
          <button onClick={() => { updateName('New Name'); }}>Update Name</button>
        </div>
      );
    };
    
    render(<CustomSelectorComponent />);
    
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name');

    // Update name (NOT in custom selector) - should NOT re-render
    await userEvent.click(screen.getByText('Update Name'));
    expect(renderCount).toBe(2); // No change
    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name'); // UI won't update unless count changes

    // Update count (in custom selector) - SHOULD re-render
    await userEvent.click(screen.getByText('Inc Count'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('name')).toHaveTextContent('New Name'); // Now name updates because component rerendered
    expect(renderCount).toBe(3);
  });

  /**
   * Test 6: Class property dependency detection
   * Tests detection of non-function class properties
   */
  test('should detect dependencies in non-function class properties', async () => {
    // Add a getter to the ComplexCubit
    Object.defineProperty(ComplexCubit.prototype, 'doubledCount', {
      get() {
        return this.state.count * 2;
      }
    });
    
    // Component that accesses a class property
    const ClassPropComponent: FC = () => {
      const [state, cubit] = useBloc(ComplexCubit);
      renderCount++;
      
      return (
        <div>
          <div data-testid="doubled-count">{cubit.doubledCount}</div>
          <button 
            data-testid="increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => cubit.updateName("New Name")}
          >
            Update Name
          </button>
        </div>
      );
    };
    
    render(<ClassPropComponent />);
    
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('doubled-count')).toHaveTextContent('0');
    
    // Update count - should trigger re-render because doubledCount depends on count
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(3);
    expect(screen.getByTestId('doubled-count')).toHaveTextContent('2');
    
    // Update name - should NOT trigger re-render
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(3); // Still 3, not 4
  });

  /**
   * Test 7: Multi-component dependency isolation
   * Tests that dependency tracking is isolated between multiple components using the same bloc
   */
  test('should track dependencies separately for multiple components using the same bloc', async () => {
    // Create a shared non-isolated cubit
    class SharedCubit extends Cubit<{ count: number; name: string }> {
      static isolated = false; // Shared between components
      
      constructor() {
        super({ count: 0, name: "Shared Name" });
      }
      
      incrementCount = () => this.patch({ count: this.state.count + 1 });
      updateName = (name: string) => this.patch({ name });
    }
    
    let renderCountA = 0;
    let renderCountB = 0;
    
    // Component A only uses count
    const ComponentA: FC = () => {
      const [state, cubit] = useBloc(SharedCubit);
      renderCountA++;
      
      return (
        <div>
          <div data-testid="a-count">{state.count}</div>
          <button 
            data-testid="a-increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
        </div>
      );
    };
    
    // Component B only uses name
    const ComponentB: FC = () => {
      const [state, cubit] = useBloc(SharedCubit);
      renderCountB++;
      
      return (
        <div>
          <div data-testid="b-name">{state.name}</div>
          <button 
            data-testid="b-update-name" 
            onClick={() => cubit.updateName("Updated Shared Name")}
          >
            Update Name
          </button>
        </div>
      );
    };
    
    // Render both components
    render(
      <>
        <ComponentA />
        <ComponentB />
      </>
    );
    
    // Initial renders
    expect(renderCountA).toBe(1);
    expect(renderCountB).toBe(1);
    
    // Component A updates count
    await userEvent.click(screen.getByTestId('a-increment'));
    
    // Component A should re-render because it uses count
    expect(renderCountA).toBe(3);
    // Component B should NOT re-render because it doesn't use count
    expect(renderCountB).toBe(1);
    
    // Component B updates name
    await userEvent.click(screen.getByTestId('b-update-name'));
    
    // Component B should re-render because it uses name
    expect(renderCountB).toBe(3);
    // Component A should NOT re-render because it doesn't use name
    expect(renderCountA).toBe(3);
  });

  /**
   * Test 8: Conditional dependency tracking
   * Tests that dependencies are correctly tracked in conditional renders
   */
  test('should correctly track dependencies in conditional renders', async () => {
    // Component with conditional rendering
    const ConditionalComponent: FC = () => {
      const [showDetails, setShowDetails] = useState(false);
      const [state, cubit] = useBloc(ComplexCubit);
      renderCount++;
      
      return (
        <div>
          <div data-testid="always-count">{state.count}</div>
          
          <button 
            data-testid="toggle-details" 
            onClick={() => setShowDetails(!showDetails)}
          >
            Toggle Details
          </button>
          
          {showDetails && (
            <div data-testid="details">
              <div data-testid="conditional-name">{state.name}</div>
              <div data-testid="conditional-nested">{state.nested.value}</div>
            </div>
          )}
          
          <button 
            data-testid="increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => cubit.updateName("Updated Conditionally")}
          >
            Update Name
          </button>
          <button 
            data-testid="update-nested" 
            onClick={() => cubit.updateNestedValue(99)}
          >
            Update Nested
          </button>
        </div>
      );
    };
    
    render(<ConditionalComponent />);
    
    // Initial render - details hidden
    // Initial render + Strict Mode remount = 2 renders
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('always-count')).toHaveTextContent('0');
    expect(screen.queryByTestId('details')).toBeNull();
    
    // Update count - should trigger re-render
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(3);
    
    // Update name - should NOT trigger re-render (details hidden)
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(3); // Still 3, not 4
    
    // Show details
    await userEvent.click(screen.getByTestId('toggle-details'));
    expect(renderCount).toBe(4);
    expect(screen.getByTestId('conditional-name')).toHaveTextContent('Updated Conditionally');
    
    // Update count - should trigger re-render
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(5);
    
    // Update name - should NOW trigger re-render (details shown)
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(5);
    
    // Hide details
    await userEvent.click(screen.getByTestId('toggle-details'));
    expect(renderCount).toBe(6);
    
    // Update name - should NOT trigger re-render again (details hidden)
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(6); // Still 6, not 7
  });

  /**
   * Test 9: Multiple hooked components with the same bloc
   * Tests that components that use the same bloc instance have independent dependency tracking
   */
  test('should track dependencies independently when multiple components use the same bloc instance', async () => {
    // Create a shared cubit
    class SharedCubit extends Cubit<{ count: number; name: string }> {
      static isolated = false; // Shared between components
      
      constructor() {
        super({ count: 0, name: "Shared Name" });
      }
      
      incrementCount = () => this.patch({ count: this.state.count + 1 });
      updateName = (name: string) => this.patch({ name });
    }
    
    // Parent component that contains children using the same bloc
    const ParentComponent: FC = () => {
      const [showB, setShowB] = useState(true);
      
      return (
        <div>
          <ChildA />
          {showB && <ChildB />}
          <button 
            data-testid="toggle-b" 
            onClick={() => setShowB(!showB)}
          >
            Toggle B
          </button>
        </div>
      );
    };
    
    let childARenders = 0;
    let childBRenders = 0;
    
    // Child A only accesses count
    const ChildA: FC = () => {
      const [state, cubit] = useBloc(SharedCubit);
      childARenders++;
      
      return (
        <div>
          <div data-testid="a-count">{state.count}</div>
          <button 
            data-testid="increment" 
            onClick={() => cubit.incrementCount()}
          >
            Increment
          </button>
        </div>
      );
    };
    
    // Child B only accesses name
    const ChildB: FC = () => {
      const [state, cubit] = useBloc(SharedCubit);
      childBRenders++;

      useEffect(() => {
        return () => {
          childBRenders = 0;
        };
      }, []);
      
      return (
        <div>
          <div data-testid="b-name">{state.name}</div>
          <button 
            data-testid="update-name" 
            onClick={() => cubit.updateName("New Shared Name")}
          >
            Update Name
          </button>
        </div>
      );
    };
    
    render(<ParentComponent />);
    
    // Initial renders
    expect(childARenders).toBe(1);
    expect(childBRenders).toBe(1);
    
    // Update count
    await userEvent.click(screen.getByTestId('increment'));
    expect(childARenders).toBe(3); // Child A rerenders (uses count)
    expect(childBRenders).toBe(1); // Child B doesn't rerender (doesn't use count)
    
    // Update name
    await userEvent.click(screen.getByTestId('update-name'));
    expect(childARenders).toBe(3); // Child A doesn't rerender (doesn't use name)
    expect(childBRenders).toBe(3); // Child B rerenders (uses name)
    
    // Unmount Child B
    await userEvent.click(screen.getByTestId('toggle-b'));
    expect(childARenders).toBe(4); // Child A rerenders
    expect(childBRenders).toBe(0); // Child B unmounted
    
    // Update name again
    // Find the shared bloc instance to update it since Child B is unmounted
    const sharedCubit = Blac.getBloc(SharedCubit); // This gets the shared instance
    sharedCubit.updateName("Updated After Unmount");
    
    // Child A still shouldn't rerender since it doesn't use name
    expect(childARenders).toBe(4);
    expect(childBRenders).toBe(0); // Child B doesn't rerender
    
    // Remount Child B
    await userEvent.click(screen.getByTestId('toggle-b'));
    expect(childARenders).toBe(5); // Child A rerenders
    expect(childBRenders).toBe(1); // Child B renders
    
    // Child B should mount with the latest name value
    expect(screen.getByTestId('b-name')).toHaveTextContent('Updated After Unmount');
    
    // Update count
    await userEvent.click(screen.getByTestId('increment'));
    expect(childARenders).toBe(6); // Child A rerenders (uses count)
    expect(childBRenders).toBe(1); // Child B doesn't rerender (doesn't use count)
    
    // Update name
    await userEvent.click(screen.getByTestId('update-name'));
    expect(childARenders).toBe(6); // Child A doesn't rerender (doesn't use name)
    expect(childBRenders).toBe(3); // Child B rerenders (uses name)
  });
});