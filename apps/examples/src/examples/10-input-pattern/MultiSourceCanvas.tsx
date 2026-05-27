import { useCallback, useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { CanvasCubit } from './CanvasCubit';

/**
 * Multi-source deps: two components write to ONE shared CanvasCubit instance.
 * CanvasProvider supplies `{ canvas }`, TickLogger supplies `{ onTick }`. The
 * core engine merges the partial slices. Removing TickLogger withdraws only its
 * `onTick`; the canvas animation continues unaffected.
 */

const MULTI_INSTANCE_ID = 'multi-source-canvas';

function CanvasProvider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, bump] = useState(0);

  // Contributes only the canvas handle; does not read state.
  useBloc(CanvasCubit, {
    instanceId: MULTI_INSTANCE_ID,
    deps: { canvas: canvasRef.current },
  });

  useEffect(() => {
    bump((n) => n + 1); // one extra commit so the ref populates into deps
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

  // Stable callback; throttles to keep re-renders cheap.
  const onTick = useCallback((frame: number) => {
    if (frame % 30 === 0) setLastTick(frame);
  }, []);

  useBloc(CanvasCubit, {
    instanceId: MULTI_INSTANCE_ID,
    deps: { onTick },
  });

  return (
    <span className="text-small text-muted">
      Tick logger (every 30 frames): frame <strong>{lastTick ?? '—'}</strong>
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
