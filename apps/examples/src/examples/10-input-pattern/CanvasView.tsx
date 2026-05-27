import { useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { CanvasCubit } from './CanvasCubit';

/**
 * Demonstrates deps + onDepsChanged:
 * - Passes a canvas ref via deps once the element is mounted.
 * - The CanvasCubit starts its animation loop in onDepsChanged when the
 *   canvas appears, and stops it when this component unmounts (deps owner
 *   is removed, so onDepsChanged fires with canvas: null).
 */
export function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(true);

  const [state] = useBloc(CanvasCubit, {
    autoInstance: true,
    deps: { canvas: mounted ? canvasRef.current : null },
  });

  // After the canvas mounts, we need one extra commit so canvasRef.current is
  // populated. Force it by re-rendering after mount via a layout effect flush.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mounted) setTick((n) => n + 1);
  }, [mounted]);

  return (
    <div className="card stack-sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: state.running ? '#22c55e' : '#6b7280',
            display: 'inline-block',
          }}
        />
        <span className="text-small">
          {state.running ? 'Loop running' : 'Loop stopped'} — frame{' '}
          <strong>{state.frame}</strong>
        </span>
      </div>

      {mounted && (
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          style={{
            borderRadius: '6px',
            display: 'block',
            width: '100%',
            height: 120,
          }}
        />
      )}

      <button className="ghost" onClick={() => setMounted((m) => !m)}>
        {mounted ? 'Unmount canvas (stop loop)' : 'Mount canvas (start loop)'}
      </button>
    </div>
  );
}
