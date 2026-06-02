import { useId, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Per-key counter cubit.
 *
 * Each distinct `key` arg produces its own instance — demonstrating that
 * `args` is what keys identity. Switching the active key in the UI selects
 * (or creates) a different instance; each one keeps its own independent count.
 *
 * `static key = (a) => a.key` makes the string the sole identity signal, so
 * two components passing the same `key` always share one instance.
 */
class KeyCounterCubit extends Cubit<{ count: number }, { key: string }> {
  static key = (a: { key: string }) => a.key;

  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

/* ------------------------------------------------------------------ */
/* Internal sub-component                                               */
/* ------------------------------------------------------------------ */

/**
 * Renders the live state for one `KeyCounterCubit` instance, identified by
 * `activeKey`. Switching `activeKey` in the parent disconnects from the old
 * instance and connects to the new one — each instance retains its own count.
 */
function CounterPanel({ activeKey }: { activeKey: string }) {
  const [state, counter] = useBloc(KeyCounterCubit, {
    args: { key: activeKey },
  });
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">
          KeyCounterCubit(<code>{JSON.stringify(activeKey)}</code>)
        </span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.count</code> — instance keyed by{' '}
          <code>args.key</code>
        </p>
        <div className="blac-demo-panel__controls">
          <button
            type="button"
            onClick={counter.decrement}
            aria-label="Decrement"
          >
            −
          </button>
          <strong className="blac-demo-count">{state.count}</strong>
          <button
            type="button"
            onClick={counter.increment}
            aria-label="Increment"
          >
            +
          </button>
          <button type="button" onClick={counter.reset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exported island                                                      */
/* ------------------------------------------------------------------ */

const KEYS = ['alpha', 'beta', 'gamma'];

/**
 * Inputs demo. A row of key buttons selects the active `args.key`. Switching
 * keys picks a different `KeyCounterCubit` instance — each holds its own count.
 * The demo makes the identity model tangible: same class, different args,
 * different instances; same args, same instance every time.
 */
export function InputsDemo() {
  // The _outer_ component is private per-mount so multiple page embeds
  // don't share "which key is active". Note: the _cubit_ instances are
  // keyed by string so they ARE shared if two embeds pick the same key.
  const _id = useId();
  void _id; // referenced to satisfy linters; used conceptually for clarity

  const [activeKey, setActiveKey] = useState(KEYS[0]);

  return (
    <DemoFrame label="args-keyed instances — live demo">
      <p className="blac-demo-desc">
        Pick a key — each key maps to a distinct <code>KeyCounterCubit</code>{' '}
        instance. Increment a key's counter, then switch away and back — its
        count persists because the instance is still alive.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActiveKey(k)}
            style={
              k === activeKey
                ? {}
                : {
                    opacity: 0.5,
                    background: 'transparent',
                    color: 'inherit',
                  }
            }
          >
            {k}
          </button>
        ))}
      </div>
      <div className="blac-demo-panels" style={{ gridTemplateColumns: '1fr' }}>
        <CounterPanel activeKey={activeKey} />
      </div>
    </DemoFrame>
  );
}

export default InputsDemo;
