/**
 * Showcase demo: Counter
 *
 * The simplest possible BlaC example — a single Cubit that tracks a count.
 * Shows: Cubit, useBloc, patch, emit.
 *
 * All exports are plain strings (no runtime imports) so this module is
 * SSR-safe and can be imported anywhere in VitePress.
 */

export const counterCubitTs = `import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
  lastAction: string;
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, lastAction: 'initialized' });
  }

  increment = () =>
    this.patch({ count: this.state.count + 1, lastAction: 'increment' });

  decrement = () =>
    this.patch({ count: this.state.count - 1, lastAction: 'decrement' });

  reset = () => this.emit({ count: 0, lastAction: 'reset' });
}
`;

export const appTsx = `import { useBloc } from '@blac/react';
import { CounterCubit } from './CounterCubit';
import './styles.css';

export default function App() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div className="demo">
      <h2>Counter</h2>
      <p className="hint">
        A single <code>CounterCubit</code> manages all state. Clicking a button
        calls a cubit method — no action objects, no reducers.
      </p>

      <div className="count-display">
        <span className="count">{state.count}</span>
        <span className="last-action">last: {state.lastAction}</span>
      </div>

      <div className="controls">
        <button onClick={cubit.decrement} className="btn-secondary">
          − Decrement
        </button>
        <button onClick={cubit.reset} className="btn-ghost">
          Reset
        </button>
        <button onClick={cubit.increment} className="btn-primary">
          + Increment
        </button>
      </div>
    </div>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #1f2430;
}

.demo {
  padding: 24px;
  max-width: 360px;
  margin: 0 auto;
}

.demo h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.hint {
  margin: 0 0 24px;
  font-size: 13px;
  color: #5a6373;
  line-height: 1.5;
}

.hint code {
  background: #eef0f4;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.count-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  gap: 6px;
}

.count {
  font-size: 64px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #3451b2;
}

.last-action {
  font-size: 12px;
  color: #8890a0;
  font-variant-numeric: tabular-nums;
}

.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

button {
  appearance: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.1s, border-color 0.1s;
}

.btn-primary {
  background: #3451b2;
  color: #fff;
  border-color: #3451b2;
}

.btn-primary:hover { background: #2a3f8f; border-color: #2a3f8f; }

.btn-secondary {
  background: #fff;
  color: #3451b2;
  border-color: #c8cdd8;
}

.btn-secondary:hover { background: #f2f4f8; }

.btn-ghost {
  background: transparent;
  color: #5a6373;
  border-color: #e2e5ec;
}

.btn-ghost:hover { background: #f5f6f9; }
`;

/**
 * Pass directly to <BlacSandpack :files="counterShowcaseFiles" />.
 */
export const counterShowcaseFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/CounterCubit.ts': counterCubitTs,
  '/styles.css': stylesCss,
};
