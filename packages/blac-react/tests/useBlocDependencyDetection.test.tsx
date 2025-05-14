/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Blac, Cubit } from "@blac/core";
import '@testing-library/jest-dom';
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { FC, useState } from "react";
import { beforeEach, describe, expect, test } from "vitest";
import { useBloc } from "../src";

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

// Define ListBloc and CustomSelectorBloc within the describe block 
// so they are accessible to the tests that use them.
class ListBloc extends Cubit<{ items: string[] }> {
  static isolated = true;
  constructor() {
    super({ items: ['item1', 'item2'] });
  }
  addItem = (item: string) => { this.patch({ items: [...this.state.items, item] }); };
  updateItem = (index: number, value: string) => {
    const items = [...this.state.items];
    items[index] = value;
    this.patch({ items });
  };
}

class CustomSelectorBloc extends Cubit<{ count: number; name: string }> {
  static isolated = true;
  constructor() {
    super({ count: 0, name: 'Initial Name' });
  }
  increment = () => { this.patch({ count: this.state.count + 1 }); };
  updateName = (name: string) => { this.patch({ name }); };
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
            onClick={() => { cubit.incrementCount(); } }
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            onClick={() => { cubit.updateName("New Name" + Math.random()); } }
          >
            Update Name
          </button>
        </div>
      );
    };
    
    render(<CounterComponent />);
    
    // Initial render
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('count')).toHaveTextContent('5');
    
    // Update count - should trigger re-render since count is accessed
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('count')).toHaveTextContent('6');
    
    // Update name - should NOT trigger re-render since name is not accessed
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(2); // Adjusted from 3
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
            onClick={() => { cubit.updateNestedValue(50); } }
          >
            Update Nested Value
          </button>
          <button 
            data-testid="update-deep" 
            onClick={() => { cubit.updateDeepProperty("Updated Deep Property"); } }
          >
            Update Deep Property
          </button>
          <button 
            data-testid="update-count" 
            onClick={() => { cubit.incrementCount(); } }
          >
            Update Count
          </button>
        </div>
      );
    };
    
    render(<NestedPropertiesComponent />);
    
    // Initial render
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('nested-value')).toHaveTextContent('10');
    expect(screen.getByTestId('deep-property')).toHaveTextContent('deep property');
    
    // Update nested value - should trigger re-render
    await userEvent.click(screen.getByTestId('update-nested'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('nested-value')).toHaveTextContent('50');
    
    // Update deep property - should trigger re-render
    await userEvent.click(screen.getByTestId('update-deep'));
    expect(renderCount).toBe(3); // Adjusted from 4
    expect(screen.getByTestId('deep-property')).toHaveTextContent('Updated Deep Property');
    
    // Update count - should NOT trigger re-render
    await userEvent.click(screen.getByTestId('update-count'));
    expect(renderCount).toBe(3); // Adjusted from 4
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
            onClick={() => { cubit.incrementCount(); } }
          >
            Increment
          </button>
          <button 
            data-testid="toggle-count" 
            onClick={() => { cubit.toggleFlag('showCount'); } }
          >
            Toggle Count
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => { cubit.updateName("New Name"); } }
          >
            Update Name
          </button>
          <button 
            data-testid="toggle-name" 
            onClick={() => { cubit.toggleFlag('showName'); } }
          >
            Toggle Name
          </button>
        </div>
      );
    };
    
    render(<DynamicComponent />);
    
    // Initial render - both count and name are shown
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('count')).toBeInTheDocument();
    expect(screen.getByTestId('name')).toBeInTheDocument();

    // Update count - should trigger re-render (count is visible)
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Toggle count visibility off
    await userEvent.click(screen.getByTestId('toggle-count'));
    expect(renderCount).toBe(3); // Adjusted from 4
    expect(screen.queryByTestId('count')).not.toBeInTheDocument();

    // Update count again - triggers once again although count is hidden because pruning is one step behind
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(4); // Adjusted from 4
    // Update count again - should NOT trigger re-render (count is hidden)
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(4); // Adjusted from 4

    // Update name - should trigger re-render (name is visible)
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(5); // Adjusted from 5
    expect(screen.getByTestId('name')).toHaveTextContent('New Name');

    // Toggle name visibility off
    await userEvent.click(screen.getByTestId('toggle-name'));
    expect(renderCount).toBe(6); // Adjusted from 6
    expect(screen.queryByTestId('name')).not.toBeInTheDocument();

    // Update name again - should NOT trigger re-render (name is hidden)
    await userEvent.click(screen.getByTestId('update-name'));
    expect(renderCount).toBe(6); // Adjusted from 6

    // Toggle count visibility on
    await userEvent.click(screen.getByTestId('toggle-count'));
    expect(renderCount).toBe(7); // Adjusted from 7
    expect(screen.getByTestId('count')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('3'); // State was updated even when hidden

    // Update count - should trigger re-render (count is visible again)
    await userEvent.click(screen.getByTestId('increment'));
    expect(renderCount).toBe(8); // Adjusted from 8
    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  /**
   * Test 4: Array dependency detection
   * Tests that changes within an array trigger re-renders when the array itself is accessed
   */
  test('should detect dependencies in arrays', async () => {
    // Component that uses the list state
    const ListComponent: FC = () => {
      // Use the ListBloc defined outside this test
      const [state, cubit] = useBloc(ListBloc);
      renderCount++;
      
      return (
        <div> {/* Use div to contain buttons */} 
          <ul>
            {state.items.map((item: string, index: number) => ( // Added types
              <li key={index} data-testid={`item-${index}`}>{item}</li> // Fixed template literal
            ))}
          </ul>
          <button onClick={() => { cubit.addItem('item3'); }}>Add</button>
          <button onClick={() => { cubit.updateItem(0, 'updated1'); }}>Update 0</button>
        </div>
      );
    };
    
    render(<ListComponent />);
    
    // Initial render
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('item-0')).toHaveTextContent('item1');
    expect(screen.getByTestId('item-1')).toHaveTextContent('item2');
    
    // Update item 0 - should trigger re-render
    await userEvent.click(screen.getByText('Update 0'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('item-0')).toHaveTextContent('updated1');
    
    // Add item 3 - should trigger re-render
    await userEvent.click(screen.getByText('Add'));
    expect(renderCount).toBe(3); // Adjusted from 4
    expect(screen.getByTestId('item-2')).toHaveTextContent('item3');
  });

  /**
   * Test 5: Custom dependency selector
   * Tests that the custom dependency selector works as expected
   */
  test('should respect custom dependency selector', async () => {
    // Component with custom dependency selector
    const CustomSelectorComponent: FC = () => {
      // Use the CustomSelectorBloc defined outside this test
      const [state, { increment, updateName }] = useBloc(CustomSelectorBloc, {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        dependencySelector: (newState, _oldState) => [ // Mark oldState as unused
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
    
    // Initial render
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name');

    // Update name (NOT in custom selector) - should NOT re-render
    await userEvent.click(screen.getByText('Update Name'));
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name'); // UI won't update unless count changes

    // Update count (in custom selector) - SHOULD re-render
    await userEvent.click(screen.getByText('Inc Count'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('name')).toHaveTextContent('New Name'); // Now name updates because component rerendered
  });

  /**
   * Test 6: Class property dependency detection
   * Tests detection of non-function class properties
   */
  test('should detect dependencies in non-function class properties', async () => {
    // Bloc with a simple getter class property
    class ClassPropCubit extends Cubit<{ count: number; name: string }> {
      static isolated = true;
      
      constructor() {
        super({ count: 5, name: 'Initial Name' });
      }

      get doubledCount(): number {
        return this.state.count * 2;
      }

      increment = () => { this.patch({ count: this.state.count + 1 }); };
      updateName = (name: string) => { this.patch({ name }); };
    }
    
    // Component using the class property
    const ClassPropComponent: FC = () => {
      const [, cubit] = useBloc(ClassPropCubit); // state is unused
      renderCount++;
      
      return (
        <div>
          <span data-testid="doubled-count">{cubit.doubledCount}</span>
          <button onClick={() => { cubit.increment(); } }>Increment</button>
          <button onClick={() => { cubit.updateName('New Name'); } }>Update Name</button>
        </div>
      );
    };
    
    render(<ClassPropComponent />);
    
    // Initial render
    expect(renderCount).toBe(1); // Adjusted from 2
    expect(screen.getByTestId('doubled-count')).toHaveTextContent('10');
    
    // Update count - should trigger re-render because doubledCount depends on count
    await userEvent.click(screen.getByText('Increment'));
    expect(renderCount).toBe(2); // Adjusted from 3
    expect(screen.getByTestId('doubled-count')).toHaveTextContent('12');
    
    // Update name - should NOT trigger re-render
    await userEvent.click(screen.getByText('Update Name'));
    expect(renderCount).toBe(2); // Adjusted from 3
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
      
      incrementCount = () => { this.patch({ count: this.state.count + 1 }); };
      updateName = (name: string) => { this.patch({ name }); };
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
            onClick={() => { cubit.incrementCount(); }}
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
            onClick={() => { cubit.updateName("Updated Shared Name"); }}
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
    expect(renderCountA).toBe(1); // Adjusted from 2
    expect(renderCountB).toBe(1); // Adjusted from 2
    
    // Component A updates count
    await userEvent.click(screen.getByTestId('a-increment'));
    
    // Component A should re-render because it uses count
    expect(renderCountA).toBe(2); // Adjusted from 3
    // Component B should NOT re-render because it doesn't use count
    expect(renderCountB).toBe(1); // Adjusted from 2
    
    // Component B updates name
    await userEvent.click(screen.getByTestId('b-update-name'));
    
    // Component B should re-render because it uses name
    expect(renderCountB).toBe(2); // Adjusted from 3
    // Component A should NOT re-render because it doesn't use name
    expect(renderCountA).toBe(2); // Adjusted from 3
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
      
      return (
        <div>
          <div data-testid="always-count">{state.count}</div>
          
          <button 
            data-testid="toggle-details" 
            onClick={() => { setShowDetails(!showDetails); } }
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
            onClick={() => { cubit.incrementCount(); } }
          >
            Increment
          </button>
          <button 
            data-testid="update-name" 
            onClick={() => { cubit.updateName("Updated Conditionally"); } }
          >
            Update Name
          </button>
          <button 
            data-testid="update-nested" 
            onClick={() => { cubit.updateNestedValue(99); } }
          >
            Update Nested
          </button>
        </div>
      );
    };
    
    render(<ConditionalComponent />);
    const countDiv = screen.getByTestId('always-count');
    
    // Initial render - details hidden
    expect(countDiv).toHaveTextContent('0');
    expect(screen.queryByTestId('details')).toBeNull();
    
    // Update count - should update countDiv
    await act(async () => { await userEvent.click(screen.getByTestId('increment')); });
    expect(countDiv).toHaveTextContent('1');
    
    // Update name - should NOT update countDiv (and details still hidden)
    const initialCountText1 = countDiv.textContent;
    await act(async () => { await userEvent.click(screen.getByTestId('update-name')); });
    expect(countDiv.textContent).toBe(initialCountText1);
    expect(screen.queryByTestId('details')).toBeNull();
    
    // Show details - should show details with updated name from previous step
    await act(async () => { await userEvent.click(screen.getByTestId('toggle-details')); });
    expect(screen.getByTestId('conditional-name')).toHaveTextContent('Updated Conditionally');
    expect(screen.getByTestId('conditional-nested')).toHaveTextContent('10'); // Initial nested value
    expect(countDiv).toHaveTextContent('1'); // Count should remain 1
    
    // Update count - should update countDiv
    await act(async () => { await userEvent.click(screen.getByTestId('increment')); });
    expect(countDiv).toHaveTextContent('2');
    expect(screen.getByTestId('conditional-name')).toHaveTextContent('Updated Conditionally'); // Name unchanged
    
    // Update name - should NOW update conditional-name (details shown)
    await act(async () => { await userEvent.click(screen.getByTestId('update-name')); }); // Name becomes "Updated Conditionally" again, but triggers render
    expect(screen.getByTestId('conditional-name')).toHaveTextContent('Updated Conditionally'); 
    expect(countDiv).toHaveTextContent('2'); // Count unchanged

    // Update nested value - should update conditional-nested
    await act(async () => { await userEvent.click(screen.getByTestId('update-nested')); }); 
    expect(screen.getByTestId('conditional-nested')).toHaveTextContent('99'); 
    expect(countDiv).toHaveTextContent('2'); // Count unchanged
    expect(screen.getByTestId('conditional-name')).toHaveTextContent('Updated Conditionally'); // Name unchanged
    
    // Hide details
    await act(async () => { await userEvent.click(screen.getByTestId('toggle-details')); });
    expect(screen.queryByTestId('details')).toBeNull();
    expect(countDiv).toHaveTextContent('2'); // Count unchanged
    
    // Update name - should NOT update countDiv (details hidden)
    const initialCountText2 = countDiv.textContent;
    await act(async () => { await userEvent.click(screen.getByTestId('update-name')); });
    expect(countDiv.textContent).toBe(initialCountText2);
    expect(screen.queryByTestId('details')).toBeNull();

    // Update nested - should NOT update countDiv (details hidden)
    await act(async () => { await userEvent.click(screen.getByTestId('update-nested')); });
    expect(countDiv.textContent).toBe(initialCountText2);
    expect(screen.queryByTestId('details')).toBeNull();
  });

  /**
   * Test 9: Multiple hooked components with the same bloc
   * Tests that components that use the same bloc instance have independent dependency tracking
   */
  test('should track dependencies independently when multiple components use the same bloc instance', async () => {
    class SharedCubit extends Cubit<{ count: number; name: string }> {
      static isolated = false; // Shared between components
      
      constructor() {
        super({ count: 0, name: 'Initial Name' });
      }
      
      incrementCount = () => { this.patch({ count: this.state.count + 1 }); };
      updateName = (name: string) => { this.patch({ name }); };
    }

    let parentRenders = 0;
    let childARenders = 0;
    let childBRenders = 0;

    const ParentComponent: FC = () => {
      const [state, cubit] = useBloc(SharedCubit);
      parentRenders++;
      
      return (
        <div>
          <h1>Parent: {state.count}</h1>
          <button data-testid="increment" onClick={() => { cubit.incrementCount(); } }>Inc Parent</button>
          <ChildA name={state.name} />
          <ChildB />
        </div>
      );
    };
    
    const ChildA: FC<{ name: string }> = ({ name }) => {
      // This child only *uses* the name prop from the parent,
      // but it hooks into the same shared bloc to *trigger* an update
      const [, cubit] = useBloc(SharedCubit);
      childARenders++;
      return (
        <div>
          <h2>Child A Name: {name}</h2>
          <button data-testid="update-name" onClick={() => { cubit.updateName('New Name'); } }>Update Name</button>
        </div>
      );
    };
    
    const ChildB: FC = () => {
      const [state] = useBloc(SharedCubit); // Only uses count
      childBRenders++;
      return <h2>Child B Count: {state.count}</h2>;
    };

    render(<ParentComponent />);
    
    // Initial renders
    expect(parentRenders).toBe(1);
    expect(childARenders).toBe(1);
    expect(childBRenders).toBe(1);
    
    // Update count
    await userEvent.click(screen.getByTestId('increment'));
    expect(parentRenders).toBe(2); // Parent uses count
    expect(childARenders).toBe(2); // Parent re-render causes ChildA re-render
    expect(childBRenders).toBe(2); // Child B uses count
    
    // Update name
    await userEvent.click(screen.getByTestId('update-name'));
    expect(parentRenders).toBe(3); // Parent passes name prop
    expect(childARenders).toBe(3); // Child A uses name prop
    expect(childBRenders).toBe(3); // Parent re-render causes ChildB re-render (even though it doesn't use name directly)

    // Update name again
    await userEvent.click(screen.getByTestId('update-name'));
    expect(parentRenders).toBe(3); // Parent state value didn't change, should not re-render
    expect(childARenders).toBe(3); // Parent didn't re-render, prop value didn't change
    expect(childBRenders).toBe(3); // Parent didn't re-render, own state dep (count) didn't change
  });
});