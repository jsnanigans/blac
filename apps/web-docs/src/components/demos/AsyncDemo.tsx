import { useId } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';

/* ------------------------------------------------------------------ */
/* State types — discriminated union keeps illegal states unrepresentable */
/* ------------------------------------------------------------------ */

type AsyncDemoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

/* ------------------------------------------------------------------ */
/* Bloc                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Demo cubit for the async page.
 *
 * Simulates a fetch that resolves after ~1.2 s (success) or rejects after
 * ~1.5 s (error), using `setTimeout`. The request-id guard prevents a slower
 * earlier request from overwriting a newer one.
 *
 * `{ _id: string }` args + `static key` give each page embed its own private
 * instance so multiple embeds never share loading state.
 */
class AsyncDemoCubit extends Cubit<AsyncDemoState, { _id: string }> {
  static key = (a: { _id: string }) => a._id;

  // Monotonic counter — each call claims the next slot.
  private requestId = 0;

  constructor() {
    super({ status: 'idle' });
  }

  /**
   * Simulate a successful fetch (resolves after ~1.2 s).
   */
  fetchSuccess = async () => {
    const reqId = ++this.requestId;
    this.emit({ status: 'loading' });

    await delay(1200);
    if (reqId !== this.requestId) return;
    this.emit({ status: 'success', message: 'User loaded: Aria Chen' });
  };

  /**
   * Simulate a failing fetch (rejects after ~1.5 s).
   */
  fetchError = async () => {
    const reqId = ++this.requestId;
    this.emit({ status: 'loading' });

    await delay(1500);
    if (reqId !== this.requestId) return;
    this.emit({ status: 'error', message: 'Network timeout (simulated)' });
  };

  reset = () => {
    ++this.requestId; // cancel any in-flight simulated request
    this.emit({ status: 'idle' });
  };
}

/** Simple timer helper — no external deps. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Status badge                                                         */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<
  AsyncDemoState['status'],
  { background: string; color: string }
> = {
  idle: {
    background: 'var(--sl-color-gray-6)',
    color: 'var(--sl-color-gray-2)',
  },
  loading: {
    background: 'color-mix(in srgb, var(--sl-color-accent) 20%, transparent)',
    color: 'var(--sl-color-accent-high)',
  },
  success: {
    background: 'color-mix(in srgb, #22c55e 20%, transparent)',
    color: '#86efac',
  },
  error: {
    background: 'color-mix(in srgb, #ef4444 20%, transparent)',
    color: '#fca5a5',
  },
};

function StatusBadge({ status }: { status: AsyncDemoState['status'] }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.6rem',
        borderRadius: '999px',
        fontSize: 'var(--sl-text-xs)',
        fontWeight: 700,
        fontFamily: 'var(--sl-font-mono, monospace)',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        ...s,
      }}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inner component (reads state)                                        */
/* ------------------------------------------------------------------ */

function AsyncStateView({ id }: { id: string }) {
  const [state, demo] = useBloc(AsyncDemoCubit, { args: { _id: id } });

  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">AsyncDemoCubit</span>
        <StatusBadge status={state.status} />
      </div>
      <div className="blac-demo-panel__body">
        {/* Status union content */}
        {state.status === 'idle' && (
          <p className="blac-demo-panel__reads">
            <code>state.status === &apos;idle&apos;</code> — ready to fetch
          </p>
        )}
        {state.status === 'loading' && (
          <p className="blac-demo-panel__reads">
            <code>state.status === &apos;loading&apos;</code> — request in
            flight…
          </p>
        )}
        {state.status === 'success' && (
          <p className="blac-demo-panel__reads">
            <code>state.status === &apos;success&apos;</code> —{' '}
            <strong style={{ color: '#86efac' }}>{state.message}</strong>
          </p>
        )}
        {state.status === 'error' && (
          <p className="blac-demo-panel__reads">
            <code>state.status === &apos;error&apos;</code> —{' '}
            <span style={{ color: '#fca5a5' }}>{state.message}</span>
          </p>
        )}

        {/* Controls */}
        <div className="blac-demo-panel__controls" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={demo.fetchSuccess}
            disabled={state.status === 'loading'}
            style={state.status === 'loading' ? { opacity: 0.45 } : {}}
          >
            Fetch (success)
          </button>
          <button
            type="button"
            onClick={demo.fetchError}
            disabled={state.status === 'loading'}
            style={
              state.status === 'loading'
                ? { opacity: 0.45 }
                : {
                    background: 'transparent',
                    borderColor: '#ef4444',
                    color: '#fca5a5',
                  }
            }
          >
            Fetch (error)
          </button>
          {state.status !== 'idle' && (
            <button
              type="button"
              onClick={demo.reset}
              style={{
                background: 'transparent',
                borderColor: 'var(--sl-color-gray-5)',
                color: 'var(--sl-color-gray-2)',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exported island                                                      */
/* ------------------------------------------------------------------ */

/**
 * Async state machine demo. Shows `idle → loading → success/error` transitions
 * driven by a simulated fetch (real `setTimeout`). Click "Fetch (success)" or
 * "Fetch (error)" and watch the discriminated-union status badge change live.
 *
 * The request-id guard is also demonstrated: clicking a second Fetch while one
 * is in flight cancels the earlier result — only the newest response lands.
 */
export function AsyncDemo() {
  const id = useId();
  return (
    <DemoFrame label="Async state machine — live demo">
      <p className="blac-demo-desc">
        Model <code>idle → loading → success | error</code> as a discriminated
        union. Click either Fetch button — the status badge tracks each
        transition in real time. Fire two requests in quick succession to see
        the request-id guard discard the slower one.
      </p>
      <div className="blac-demo-panels" style={{ gridTemplateColumns: '1fr' }}>
        <AsyncStateView id={id} />
      </div>
    </DemoFrame>
  );
}

export default AsyncDemo;
