import * as React from 'react';
import { cn } from '@/lib/utils';

type Orientation = 'horizontal' | 'vertical';

interface SplitPaneProps {
  orientation?: Orientation;
  initialPrimary?: number;
  minPrimary?: number;
  maxPrimary?: number;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  onChange?: (value: number) => void;
  className?: string;
  handleClassName?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function SplitPane({
  orientation = 'horizontal',
  initialPrimary = 55,
  minPrimary = 20,
  maxPrimary = 80,
  primary,
  secondary,
  onChange,
  className,
  handleClassName,
}: SplitPaneProps) {
  const isHorizontal = orientation === 'horizontal';
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [primarySize, setPrimarySize] = React.useState(initialPrimary);

  React.useEffect(() => {
    setPrimarySize(clamp(initialPrimary, minPrimary, maxPrimary));
  }, [initialPrimary, minPrimary, maxPrimary]);

  const updateSize = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, minPrimary, maxPrimary);
      setPrimarySize(clamped);
      onChange?.(clamped);
    },
    [minPrimary, maxPrimary, onChange],
  );

  const startDrag = React.useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const total = isHorizontal ? rect.width : rect.height;
      if (!total) return;

      const offset = isHorizontal ? clientX - rect.left : clientY - rect.top;
      const next = (offset / total) * 100;
      updateSize(next);
    },
    [isHorizontal, updateSize],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const releasePointerCapture = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      startDrag(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = () => {
      releasePointerCapture();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    startDrag(event.clientX, event.clientY);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 2;
    if (isHorizontal) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        updateSize(primarySize - step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        updateSize(primarySize + step);
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateSize(primarySize - step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        updateSize(primarySize + step);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface',
        isHorizontal ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'relative min-h-0 min-w-0',
          isHorizontal ? 'h-full' : 'w-full',
        )}
        style={
          isHorizontal
            ? { width: `${primarySize}%` }
            : { height: `${primarySize}%` }
        }
      >
        <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
          {primary}
        </div>
      </div>

      <div
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuemin={minPrimary}
        aria-valuemax={maxPrimary}
        aria-valuenow={Number(primarySize.toFixed(0))}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex items-center justify-center bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface hover:bg-surface-muted/80',
          isHorizontal
            ? 'w-[1px] cursor-col-resize'
            : 'h-[1px] cursor-row-resize',
          handleClassName,
        )}
      >
        <div
          className={cn(
            'absolute rounded-full border border-border bg-surface',
            isHorizontal ? 'h-8 w-1.5' : 'h-1.5 w-8',
          )}
        >
          <span
            className={cn(
              'absolute inset-0 m-auto block rounded-full bg-border-strong/60',
              isHorizontal ? 'h-3 w-[2px]' : 'h-[2px] w-3',
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          'relative min-h-0 min-w-0 flex-1',
          isHorizontal ? 'h-full' : 'w-full',
        )}
      >
        <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
          {secondary}
        </div>
      </div>
    </div>
  );
}
