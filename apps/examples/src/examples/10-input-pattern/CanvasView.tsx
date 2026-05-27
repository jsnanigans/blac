import { useCallback, useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { CanvasCubit } from './CanvasCubit';

/**
 * deps + onDepsChanged: passes a canvas handle to the cubit, which runs an
 * animation loop while it's attached. The frame value arrives via the `onTick`
 * dep and is throttled into local state (every 15 frames) for the label.
 */
export function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(true);
  const [frame, setFrame] = useState(0);

  const onTick = useCallback((f: number) => {
    if (f % 15 === 0) setFrame(f);
  }, []);

  const [state] = useBloc(CanvasCubit, {
    autoInstance: true,
    deps: { canvas: mounted ? canvasRef.current : null, onTick },
  });

  // One extra commit after mount so canvasRef.current flows into deps.
  const [, bump] = useState(0);
  useEffect(() => {
    if (mounted) bump((n) => n + 1);
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
          <strong>{frame}</strong>
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
