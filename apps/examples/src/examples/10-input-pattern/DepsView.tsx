import { useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { TickerCubit } from './TickerCubit';
import { dbg, dbgCount } from './debug';

/**
 * Single-source `deps` demo, no canvas. Passes one DOM element handle to the
 * cubit, which writes the tick count into it imperatively.
 *
 * Defaults to a STOPPED loop so opening this section runs nothing. Use the
 * on-screen counters (and the console with `localStorage.ip-debug=1`) to see
 * exactly which lifecycle call fires and how often.
 */
export function DepsView() {
  const displayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(true);

  // Count renders in the render body (project gotcha: not in an effect).
  const renderCount = useRef(0);
  renderCount.current++;

  const [state, ticker] = useBloc(TickerCubit, {
    autoInstance: true,
    deps: { display: mounted ? displayRef.current : null },
  });

  // One extra commit after mount so displayRef.current flows into deps.
  const [, bump] = useState(0);
  useEffect(() => {
    if (mounted) bump((n) => n + 1);
  }, [mounted]);

  useEffect(() => {
    dbg('DepsView.mount');
    return () => dbg('DepsView.unmount');
  }, []);

  return (
    <div className="card stack-sm">
      <span className="text-small">
        status: <strong>{state.running ? 'running' : 'stopped'}</strong> · tick{' '}
        <strong>{state.tick}</strong>
      </span>

      {mounted && (
        <div
          ref={displayRef}
          style={{
            fontFamily: 'monospace',
            padding: '0.75rem',
            borderRadius: '6px',
            background: '#0f0f1a',
            color: '#a78bfa',
          }}
        >
          tick 0
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="ghost" onClick={ticker.step}>
          Step (+1)
        </button>
        <button
          className={state.running ? 'primary' : 'ghost'}
          onClick={state.running ? ticker.stop : ticker.start}
        >
          {state.running ? 'Stop loop' : 'Start loop (500ms)'}
        </button>
        <button className="ghost" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'Unmount display (deps → null)' : 'Mount display'}
        </button>
      </div>

      <DebugReadout renders={renderCount.current} />
    </div>
  );
}

export function DebugReadout(props: { renders: number }) {
  return (
    <pre
      className="text-small text-muted"
      style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
    >
      {[
        `renders:            ${props.renders}`,
        `Ticker.start:       ${dbgCount('Ticker.start')}`,
        `Ticker.stop:        ${dbgCount('Ticker.stop')}`,
        `Ticker.advance:     ${dbgCount('Ticker.advance')}`,
        `deps:display:       ${dbgCount('Ticker.deps:display')}`,
        `deps:noop:          ${dbgCount('Ticker.deps:noop')}`,
      ].join('\n')}
    </pre>
  );
}
