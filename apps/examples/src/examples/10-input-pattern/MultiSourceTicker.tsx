import { useCallback, useEffect, useRef, useState } from 'react';
import { useBloc } from '@blac/react';
import { TickerCubit } from './TickerCubit';
import { dbg, dbgCount } from './debug';

/**
 * Multi-source `deps`, no canvas. Three components share ONE TickerCubit
 * instance and each contributes a different slice / role:
 *   - Controls       → reads state, drives start/stop/step
 *   - DisplayProvider → supplies `{ display }` (a DOM handle)
 *   - TickLogger      → supplies `{ onTick }` (a callback)
 *
 * The core engine merges the partial slices. Removing TickLogger withdraws only
 * its `onTick`; the display keeps updating.
 */

const ID = 'multi-source-ticker';

function Controls() {
  const [state, ticker] = useBloc(TickerCubit, { instanceId: ID });
  return (
    <div className="stack-sm">
      <span className="text-small">
        status: <strong>{state.running ? 'running' : 'stopped'}</strong> · tick{' '}
        <strong>{state.tick}</strong>
      </span>
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
      </div>
    </div>
  );
}

function DisplayProvider() {
  const displayRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);

  // Contributes only the DOM handle; does not read state.
  useBloc(TickerCubit, {
    instanceId: ID,
    deps: { display: displayRef.current },
  });

  useEffect(() => {
    bump((n) => n + 1); // one extra commit so the ref populates into deps
    dbg('DisplayProvider.mount');
    return () => dbg('DisplayProvider.unmount');
  }, []);

  return (
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
  );
}

function TickLogger() {
  const [lastTick, setLastTick] = useState<number | null>(null);
  const renderCount = useRef(0);
  renderCount.current++;

  // Stable callback; contributes only the onTick slice.
  const onTick = useCallback((tick: number) => setLastTick(tick), []);

  useBloc(TickerCubit, { instanceId: ID, deps: { onTick } });

  useEffect(() => {
    dbg('TickLogger.mount');
    return () => dbg('TickLogger.unmount');
  }, []);

  return (
    <span className="text-small text-muted">
      Tick logger: last <strong>{lastTick ?? '—'}</strong> · renders{' '}
      <strong>{renderCount.current}</strong>
    </span>
  );
}

export function MultiSourceTicker() {
  const [showLogger, setShowLogger] = useState(true);

  return (
    <div className="card stack-sm">
      <Controls />
      <DisplayProvider />
      {showLogger && <TickLogger />}
      <button className="ghost" onClick={() => setShowLogger((v) => !v)}>
        {showLogger
          ? 'Remove TickLogger (onTick dep disappears)'
          : 'Add TickLogger (onTick dep appears)'}
      </button>

      <pre
        className="text-small text-muted"
        style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
      >
        {[
          `Ticker.start:    ${dbgCount('Ticker.start')}`,
          `Ticker.advance:  ${dbgCount('Ticker.advance')}`,
          `deps:display:    ${dbgCount('Ticker.deps:display')}`,
          `deps:noop:       ${dbgCount('Ticker.deps:noop')}`,
        ].join('\n')}
      </pre>
    </div>
  );
}
