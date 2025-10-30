/**
 * Verification that original useBlocMinimal already handles dynamic dependencies correctly
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBlocMinimal } from '../useBlocMinimal';

class DynamicBloc extends Cubit<{
  count: number;
  text: string;
  items: string[];
  nested: { value: number };
}> {
  static isolated = true;

  constructor() {
    super({
      count: 0,
      text: 'initial',
      items: ['a', 'b', 'c'],
      nested: { value: 0 },
    });
  }

  incrementCount = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateText = (text: string) => {
    this.emit({ ...this.state, text });
  };

  addItem = (item: string) => {
    this.emit({ ...this.state, items: [...this.state.items, item] });
  };

  updateNested = (value: number) => {
    this.emit({ ...this.state, nested: { value } });
  };
}

describe('useBlocMinimal Dynamic Dependency Tracking', () => {
  afterEach(() => {
    DynamicBloc.release();
  });

  it('correctly handles changing access patterns', () => {
    let renderCount = 0;
    let accessPattern = 'count';

    const { result } = renderHook(() => {
      const [state, bloc] = useBlocMinimal(DynamicBloc);
      renderCount++;

      switch (accessPattern) {
        case 'count':
          return { count: state.count, bloc };
        case 'text':
          return { text: state.text, bloc };
        case 'both':
          return { count: state.count, text: state.text, bloc };
        case 'nested':
          return { nested: state.nested.value, bloc };
        default:
          return { bloc };
      }
    });

    const bloc = result.current.bloc;

    // Phase 1: Accessing count only
    expect(renderCount).toBe(1);

    act(() => bloc.incrementCount());
    expect(renderCount).toBe(2); // Re-renders for count

    act(() => bloc.updateText('changed'));
    expect(renderCount).toBe(2); // No re-render for text

    act(() => bloc.updateNested(5));
    expect(renderCount).toBe(2); // No re-render for nested

    // Phase 2: Switch to accessing text
    accessPattern = 'text';
    act(() => bloc.incrementCount()); // Force re-render
    expect(renderCount).toBe(3);

    act(() => bloc.updateText('updated'));
    expect(renderCount).toBe(4); // Now re-renders for text!

    act(() => bloc.incrementCount());
    expect(renderCount).toBe(4); // No longer re-renders for count!

    // Phase 3: Access both count and text
    accessPattern = 'both';
    act(() => bloc.updateText('both')); // Force re-render
    expect(renderCount).toBe(5);

    act(() => bloc.incrementCount());
    expect(renderCount).toBe(6); // Re-renders for count again

    act(() => bloc.updateText('final'));
    expect(renderCount).toBe(7); // Still re-renders for text

    // Phase 4: Switch to nested
    accessPattern = 'nested';
    act(() => bloc.incrementCount()); // Force re-render
    expect(renderCount).toBe(8);

    act(() => bloc.updateNested(10));
    expect(renderCount).toBe(9); // Now tracks nested

    act(() => bloc.incrementCount());
    expect(renderCount).toBe(9); // No longer tracks count

    act(() => bloc.updateText('ignored'));
    expect(renderCount).toBe(9); // No longer tracks text
  });

  it('handles complex conditional rendering scenarios', () => {
    let renderCount = 0;
    let condition = '';

    const { result } = renderHook(() => {
      const [state, bloc] = useBlocMinimal(DynamicBloc);
      renderCount++;

      // Complex conditional access
      // Note: Checking state.text in the condition tracks it!
      if (state.count > 5) {
        condition = 'high';
        return {
          count: state.count,
          nested: state.nested.value,
          bloc
        };
      } else if (state.text === 'special') { // This accesses state.text!
        condition = 'special';
        return {
          text: state.text,
          items: state.items.length,
          bloc
        };
      } else {
        condition = 'default';
        return {
          count: state.count,
          text: state.text, // We're tracking text because of the condition above
          bloc
        };
      }
    });

    const bloc = result.current.bloc;

    // Initially in 'default' condition (count <= 5)
    expect(condition).toBe('default');
    expect(renderCount).toBe(1);

    // Update count (still <= 5)
    act(() => bloc.incrementCount());
    expect(renderCount).toBe(2);
    expect(condition).toBe('default');

    // Update text (IS tracked because we check it in the condition!)
    act(() => bloc.updateText('something'));
    expect(renderCount).toBe(3); // DOES re-render

    // Set count > 5, triggers 'high' condition
    // act() batches updates, so 6 increments = 1 re-render
    act(() => {
      for (let i = 0; i < 6; i++) {
        bloc.incrementCount();
      }
    });
    expect(renderCount).toBe(4); // Only one re-render for batched updates
    expect(condition).toBe('high');

    // Now in 'high' condition, tracking count and nested
    act(() => bloc.updateNested(100));
    expect(renderCount).toBe(5); // Re-renders for nested now!

    act(() => bloc.updateText('special')); // Won't trigger re-render (text not checked in high condition)
    expect(renderCount).toBe(5); // No re-render because we return early in count > 5 branch
  });

  it('correctly tracks array and object mutations', () => {
    let renderCount = 0;
    let trackItems = true;

    const { result } = renderHook(() => {
      const [state, bloc] = useBlocMinimal(DynamicBloc);
      renderCount++;

      if (trackItems) {
        return {
          itemCount: state.items.length,
          firstItem: state.items[0],
          bloc
        };
      } else {
        return {
          text: state.text,
          bloc
        };
      }
    });

    const bloc = result.current.bloc;

    // Initially tracking items
    expect(renderCount).toBe(1);

    act(() => bloc.addItem('d'));
    expect(renderCount).toBe(2); // Re-renders for items change

    act(() => bloc.updateText('ignored'));
    expect(renderCount).toBe(2); // No re-render for text

    // Switch to tracking text
    trackItems = false;
    act(() => bloc.addItem('e')); // Force re-render
    expect(renderCount).toBe(3);

    act(() => bloc.updateText('tracked'));
    expect(renderCount).toBe(4); // Now tracks text

    act(() => bloc.addItem('f'));
    expect(renderCount).toBe(4); // No longer tracks items
  });
});