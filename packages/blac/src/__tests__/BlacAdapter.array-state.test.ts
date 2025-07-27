import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';
import { BlacAdapter } from '../adapter/BlacAdapter';
import { BlocTest } from '../testing';

interface DataItem {
  id: number;
  label: string;
  selected: boolean;
  removed: boolean;
}

class ArrayStateCubit extends Cubit<DataItem[]> {
  constructor() {
    super([]);
  }

  addItems = (items: DataItem[]) => {
    this.emit([...this.state, ...items]);
  };

  updateItem = (index: number, updates: Partial<DataItem>) => {
    const newState = [...this.state];
    newState[index] = { ...newState[index], ...updates };
    this.emit(newState);
  };

  swapItems = (index1: number, index2: number) => {
    const newState = [...this.state];
    const temp = newState[index1];
    newState[index1] = newState[index2];
    newState[index2] = temp;
    this.emit(newState);
  };
}

describe('BlacAdapter with array state', () => {
  beforeEach(() => {
    BlocTest.setUp();
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  test('proxy tracks array element access correctly', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {},
    );

    adapter.mount();

    // Add items to array
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: false },
      { id: 3, label: 'Item 3', selected: false, removed: false },
    ]);

    // Get proxy state and access specific array elements
    const proxyState = adapter.getProxyState(adapter.blocInstance.state);

    // Reset tracking before accessing
    adapter.resetConsumerTracking();

    // Access first item's label
    const firstItemLabel = proxyState[0].label;

    // Check that access was tracked
    const dependencies = adapter.getConsumerDependencies(componentRef.current);
    expect(dependencies).toBeDefined();
    expect(dependencies?.statePaths).toContain('0.label');
    expect(dependencies?.statePaths).toContain('0'); // Also tracks parent object
  });

  test('component re-renders only when accessed array items change', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {},
    );

    adapter.mount();
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Add initial items
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: false },
      { id: 3, label: 'Item 3', selected: false, removed: false },
    ]);

    // Simulate first render - access only the second item
    adapter.resetConsumerTracking();
    const proxyState = adapter.getProxyState(adapter.blocInstance.state);
    const secondItem = proxyState[1];
    const label = secondItem.label;
    const selected = secondItem.selected;

    // Mark as rendered
    adapter.updateLastNotified(componentRef.current);

    // Clear onChange calls from initial setup
    onChange.mockClear();

    // Update first item - should NOT trigger onChange
    adapter.blocInstance.updateItem(0, { label: 'Updated Item 1' });
    expect(onChange).not.toHaveBeenCalled();

    // Update second item - SHOULD trigger onChange
    adapter.blocInstance.updateItem(1, { label: 'Updated Item 2' });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Update third item - should NOT trigger onChange
    onChange.mockClear();
    adapter.blocInstance.updateItem(2, { label: 'Updated Item 3' });
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('detects array changes with dependencies option', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {
        // Use dependencies to track array length changes
        dependencies: (bloc) => [bloc.state.length],
      },
    );

    adapter.mount();

    // Setup subscription
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Add initial items
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: false },
    ]);

    onChange.mockClear();

    // Adding items should trigger onChange since length changed
    adapter.blocInstance.addItems([
      { id: 3, label: 'Item 3', selected: false, removed: false },
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);

    onChange.mockClear();

    // Updating an item should NOT trigger onChange (length unchanged)
    adapter.blocInstance.updateItem(0, { label: 'Updated' });
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('tracks array method calls like filter', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {},
    );

    adapter.mount();

    // Add items with some removed
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: true },
      { id: 3, label: 'Item 3', selected: false, removed: false },
    ]);

    // Access filtered array through proxy
    adapter.resetConsumerTracking();
    const proxyState = adapter.getProxyState(adapter.blocInstance.state);
    const visibleItems = proxyState.filter((item) => !item.removed);

    // Access properties of filtered items
    visibleItems.forEach((item) => {
      const label = item.label;
    });

    // Check that accesses were tracked for non-removed items
    const dependencies = adapter.getConsumerDependencies(componentRef.current);
    expect(dependencies).toBeDefined();

    // Should have tracked access to removed property for all items during filter
    expect(dependencies?.statePaths).toContain('0.removed');
    expect(dependencies?.statePaths).toContain('1.removed');
    expect(dependencies?.statePaths).toContain('2.removed');

    // Should have tracked label access for visible items
    expect(dependencies?.statePaths).toContain('0.label');
    expect(dependencies?.statePaths).toContain('2.label');
  });

  test('handles array item swapping correctly', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {},
    );

    adapter.mount();

    // Add initial items
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: false },
      { id: 3, label: 'Item 3', selected: false, removed: false },
    ]);

    // Access first two items through proxy
    adapter.resetConsumerTracking();
    const proxyState = adapter.getProxyState(adapter.blocInstance.state);
    const firstId = proxyState[0].id;
    const secondId = proxyState[1].id;

    expect(firstId).toBe(1);
    expect(secondId).toBe(2);

    // Mark as rendered
    adapter.updateLastNotified(componentRef.current);

    // Setup subscription
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });
    onChange.mockClear();

    // Swap first two items - should trigger onChange
    adapter.blocInstance.swapItems(0, 1);
    expect(onChange).toHaveBeenCalledTimes(1);

    // Verify swap worked
    const newProxyState = adapter.getProxyState(adapter.blocInstance.state);
    expect(newProxyState[0].id).toBe(2);
    expect(newProxyState[1].id).toBe(1);

    unsubscribe();
  });

  test('dependencies option works with array state', () => {
    const componentRef = { current: {} };
    const adapter = new BlacAdapter(
      { componentRef, blocConstructor: ArrayStateCubit },
      {
        dependencies: (bloc) => {
          // Only track visible items count
          const visibleCount = bloc.state.filter(
            (item) => !item.removed,
          ).length;
          return [visibleCount];
        },
      },
    );

    adapter.mount();
    const onChange = vi.fn();
    const unsubscribe = adapter.createSubscription({ onChange });

    // Add initial items
    adapter.blocInstance.addItems([
      { id: 1, label: 'Item 1', selected: false, removed: false },
      { id: 2, label: 'Item 2', selected: false, removed: false },
    ]);

    onChange.mockClear();

    // Update item label - should NOT trigger onChange (not tracking labels)
    adapter.blocInstance.updateItem(0, { label: 'Updated' });
    expect(onChange).not.toHaveBeenCalled();

    // Mark item as removed - SHOULD trigger onChange (affects visible count)
    adapter.blocInstance.updateItem(0, { removed: true });
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
