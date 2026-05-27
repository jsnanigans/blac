import { useCallback, useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { CanvasCubit } from './CanvasCubit';

/**
 * Multi-source deps: two components contribute to the same cubit's deps.
 * CanvasProvider supplies { canvas }, TickLogger supplies { onTick }.
 * Both are merged by the core engine into one coherent deps view.
 */

const MULTI_INSTANCE_ID = 'multi-source-canvas';

function CanvasProvider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);

  useBloc(CanvasCubit, {
    instanceId: MULTI_INSTANCE_ID,
    deps: { canvas: canvasRef.current },
  });

  useEffect(() => {
    // Force one extra render so canvasRef.current is populated after mount.
    setTick((n) => n + 1);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={100}
      style={{
        borderRadius: '6px',
        display: 'block',
        width: '100%',
        height: 100,
      }}
    />
  );
}

function TickLogger() {
  const [lastTick, setLastTick] = useState<number | null>(null);

  const onTick = useCallback((frame: number) => {
    // Throttle updates to avoid too many re-renders from the callback.
    if (frame % 30 === 0) setLastTick(frame);
  }, []);

  useBloc(CanvasCubit, {
    instanceId: MULTI_INSTANCE_ID,
    deps: { onTick },
  });

  return (
    <span className="text-small text-muted">
      Tick logger (every 30 frames): frame{' '}
      <strong>{lastTick ?? '—'}</strong>
    </span>
  );
}

export function MultiSourceCanvas() {
  const [showLogger, setShowLogger] = useState(true);

  return (
    <div className="card stack-sm">
      <CanvasProvider />
      {showLogger && <TickLogger />}
      <button className="ghost" onClick={() => setShowLogger((v) => !v)}>
        {showLogger
          ? 'Remove TickLogger (onTick dep disappears)'
          : 'Add TickLogger (onTick dep appears)'}
      </button>
    </div>
  );
}
