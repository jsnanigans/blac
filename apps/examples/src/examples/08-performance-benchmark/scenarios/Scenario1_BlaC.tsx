import { memo } from 'react';
import { useBloc } from '@blac/react';
import { ListBloc } from './Scenario1_ListBloc';
import { RenderCounter, Button } from '../../../shared/components';
import type { ListItem } from '../types';

/**
 * Individual list item component using BlaC.
 * Uses React.memo to prevent unnecessary re-renders.
 */
const ListItemBlaC = memo(
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
  (prev, next) =>
    prev.item.value === next.item.value &&
    prev.item.color === next.item.color &&
    prev.item.id === next.item.id,
);

ListItemBlaC.displayName = 'ListItemBlaC';

/**
 * BlaC implementation of List Updates scenario.
 *
 * Key features:
 * - Automatic dependency tracking
 * - Only changed items re-render
 * - Getter for computed values (averageValue)
 * - Zero manual optimization
 *
 * Lines of code: ~60
 */
export function Scenario1_BlaC() {
  const [state, bloc] = useBloc(ListBloc);

  return (
    <div className="stack-md">
      {/* Controls */}
      <div className="stack-sm">
        <div className="row-sm flex-wrap">
          <Button onClick={bloc.updateRandomItem} size="small">
            Update Random
          </Button>
          <Button onClick={bloc.updateAllItems} size="small" variant="ghost">
            Update All
          </Button>
          <Button onClick={bloc.reset} size="small" variant="ghost">
            Reset
          </Button>
        </div>

        {/* Computed value display */}
        <div className="text-small">
          <strong>Average:</strong> {bloc.averageValue.toFixed(1)}
        </div>

        <div className="text-xs text-muted">
          🎯 BlaC: Click "Update Random" - only 1 item's counter increments (not
          all 500!)
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
        {state.items.map((item) => (
          <ListItemBlaC key={item.id} item={item} />
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-muted">
        <strong>Implementation:</strong> BlaC with automatic tracking
        <br />
        <strong>Code:</strong> ~60 lines | No React.memo, useMemo, or
        useCallback needed
      </div>
    </div>
  );
}
