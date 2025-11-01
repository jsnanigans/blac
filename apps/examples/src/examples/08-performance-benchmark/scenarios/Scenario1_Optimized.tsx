import { useState, useCallback, useMemo, memo } from 'react';
import type { ListItem } from '../types';
import { RenderCounter, Button } from '../../../shared/components';

/**
 * Memoized list item component.
 * Uses React.memo with custom comparison to prevent unnecessary re-renders.
 */
const ListItemOptimized = memo(
  ({ item }: { item: ListItem }) => {
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
  },
  (prev, next) => {
    // Custom comparison function to prevent re-renders when item hasn't changed
    return (
      prev.item.value === next.item.value &&
      prev.item.color === next.item.color &&
      prev.item.id === next.item.id
    );
  },
);

ListItemOptimized.displayName = 'ListItemOptimized';

/**
 * Optimized React useState implementation.
 *
 * Required optimizations:
 * - React.memo on list item component with custom comparison
 * - useMemo for computed values (average)
 * - useCallback for update functions
 * - Careful state updates to avoid reference changes
 *
 * Lines of code: ~120
 */
export function Scenario1_Optimized() {
  const [items, setItems] = useState<ListItem[]>(() =>
    Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`,
      value: Math.random() * 100,
      color: '#2563eb',
    })),
  );

  // useCallback to prevent function recreation on every render
  const updateRandomItem = useCallback(() => {
    setItems((prev) => {
      const randomIndex = Math.floor(Math.random() * prev.length);
      const newItems = [...prev];
      newItems[randomIndex] = {
        ...newItems[randomIndex],
        value: Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      };
      return newItems;
    });
  }, []);

  const updateAllItems = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        value: Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      })),
    );
  }, []);

  const reset = useCallback(() => {
    setItems((prev) =>
      prev.map((item, i) => ({
        id: `item-${i}`,
        value: 50,
        color: '#2563eb',
      })),
    );
  }, []);

  // useMemo to prevent recalculation on every render
  const averageValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0) / items.length;
  }, [items]);

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
          ⚡ Optimized React: Same performance as BlaC, but requires manual
          optimization
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
          <ListItemOptimized key={item.id} item={item} />
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-muted">
        <strong>Implementation:</strong> useState with React.memo, useMemo,
        useCallback
        <br />
        <strong>Code:</strong> ~120 lines | Requires manual optimization
      </div>
    </div>
  );
}
