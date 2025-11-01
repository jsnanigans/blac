import { useState } from 'react';
import type { ListItem } from '../types';
import { RenderCounter, Button } from '../../../shared/components';

/**
 * Unoptimized list item component.
 * No memoization - will re-render every time parent re-renders.
 */
function ListItemUnoptimized({ item }: { item: ListItem }) {
  return (
    <div
      className="benchmark-item"
      style={{
        backgroundColor: item.color,
        padding: 'var(--space-xs)',
        borderRadius: 'var(--border-radius)',
        position: 'relative',
      }}
    >
      <RenderCounter name={item.id} />
      <span style={{ color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
        {item.value.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * Unoptimized React useState implementation.
 *
 * No optimizations:
 * - No React.memo
 * - No useMemo
 * - No useCallback
 * - Simple, straightforward code
 *
 * Result: ALL 500 items re-render on ANY state change
 *
 * Lines of code: ~60 (same as BlaC, but terrible performance)
 */
export function Scenario1_Unoptimized() {
  const [items, setItems] = useState<ListItem[]>(() =>
    Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`,
      value: Math.random() * 100,
      color: '#2563eb',
    })),
  );

  const updateRandomItem = () => {
    const randomIndex = Math.floor(Math.random() * items.length);
    const newItems = [...items];
    newItems[randomIndex] = {
      ...newItems[randomIndex],
      value: Math.random() * 100,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    };
    setItems(newItems);
  };

  const updateAllItems = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        value: Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      })),
    );
  };

  const reset = () => {
    setItems((prev) =>
      prev.map((item, i) => ({
        id: `item-${i}`,
        value: 50,
        color: '#2563eb',
      })),
    );
  };

  // No useMemo - recalculates on EVERY render
  const averageValue =
    items.reduce((sum, item) => sum + item.value, 0) / items.length;

  return (
    <div className="stack-md">
      {/* Controls */}
      <div className="stack-sm">
        <div className="row-sm flex-wrap">
          <Button onClick={updateRandomItem} size="small">
            Update Random
          </Button>
          <Button onClick={updateAllItems} size="small" variant="ghost">
            Update All
          </Button>
          <Button onClick={reset} size="small" variant="ghost">
            Reset
          </Button>
        </div>

        {/* Computed value display */}
        <div className="text-small">
          <strong>Average:</strong> {averageValue.toFixed(1)}
        </div>

        <div className="text-xs text-muted">
          ⚠️ Unoptimized React: Click "Update Random" - ALL 500 counters
          increment! (Watch it lag!)
        </div>
      </div>

      {/* List grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: 'var(--space-xs)',
          maxHeight: '300px',
          overflow: 'auto',
        }}
      >
        {items.map((item) => (
          <ListItemUnoptimized key={item.id} item={item} />
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-muted">
        <strong>Implementation:</strong> Plain useState with no optimization
        <br />
        <strong>Code:</strong> ~60 lines | Simplest code, worst performance
      </div>
    </div>
  );
}
