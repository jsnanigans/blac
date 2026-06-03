/**
 * Starter files for the interactive BlaC playground.
 *
 * Plain string exports (no runtime imports) — SSR-safe. These strings are
 * handed to <BlacSandpack files={...} /> and rendered inside the sandbox.
 *
 * What the starter shows:
 *   - A Cubit (CounterCubit) with typed state and an action method
 *   - useBloc consuming the Cubit — auto-tracks accessed state paths
 *   - A RenderCounter wired in the render body (not useEffect) so every
 *     real render is counted accurately, even under StrictMode
 *
 * The sandbox uses published packages pinned to 2.0.15:
 *   @blac/core, @blac/react, react ^18, react-dom ^18
 */

export const cubitTs = `import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
  step: number;
}

/**
 * CounterCubit — your editable starting point.
 * Try adding new fields to CounterState or new action methods below.
 */
export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, step: 1 });
  }

  increment = () =>
    this.update((s) => ({ ...s, count: s.count + s.step }));

  decrement = () =>
    this.update((s) => ({ ...s, count: s.count - s.step }));

  setStep = (step: number) =>
    this.update((s) => ({ ...s, step }));

  reset = () => this.update((s) => ({ ...s, count: 0 }));
}
`;

export const renderCounterTsx = `import { useRef } from 'react';

/**
 * Counts actual renders. The increment is in the render body (not useEffect)
 * so it reflects real renders and works correctly under React StrictMode.
 */
export function RenderCounter({ label }: { label: string }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <span className="render-counter">
      {label} renders: <strong>{renders.current}</strong>
    </span>
  );
}
`;

export const appTsx = `import { useBloc } from '@blac/react';
import { CounterCubit } from './counter';
import { RenderCounter } from './RenderCounter';
import './styles.css';

/**
 * Counter component — reads state from CounterCubit via useBloc.
 *
 * useBloc auto-tracks which state paths this component accesses. Add a second
 * independent field to the state and update it from a sibling component to see
 * that this one does NOT re-render (per-consumer tracking).
 */
function Counter() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <section className="card">
      <h2>Counter</h2>

      <p className="value">{state.count}</p>

      <div className="actions">
        <button onClick={cubit.decrement}>−</button>
        <button onClick={cubit.increment}>+</button>
        <button className="reset" onClick={cubit.reset}>
          Reset
        </button>
      </div>

      <label className="step-row">
        Step:
        <input
          type="number"
          min={1}
          value={state.step}
          onChange={(e) => cubit.setStep(Number(e.target.value))}
        />
      </label>

      <RenderCounter label="Counter" />
    </section>
  );
}

export default function App() {
  return (
    <main className="app">
      <h1>BlaC Playground</h1>
      <p className="hint">
        Edit the Cubit in <code>counter.ts</code>, add new state fields,
        change the step logic, or wire up a second consumer — the sky is
        the limit.
      </p>
      <Counter />
    </main>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1f2430;
  background: #f5f7fa;
}

.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
}

.app h1 {
  margin: 0 0 6px;
  font-size: 22px;
}

.hint {
  margin: 0 0 20px;
  font-size: 13px;
  color: #5a6373;
  line-height: 1.6;
}

.hint code {
  background: #eef0f4;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.card {
  background: #fff;
  border: 1px solid #e2e5ec;
  border-radius: 12px;
  padding: 20px;
}

.card h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

.value {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

button {
  flex: 1;
  appearance: none;
  border: 1px solid #c8cdd8;
  background: #fff;
  border-radius: 8px;
  padding: 8px 0;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.1s;
}

button:hover { background: #f2f4f8; }

button.reset {
  font-size: 13px;
  color: #666;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5a6373;
  margin-bottom: 14px;
}

.step-row input {
  width: 60px;
  border: 1px solid #c8cdd8;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
}

.render-counter {
  display: block;
  font-size: 12px;
  color: #5a6373;
  font-variant-numeric: tabular-nums;
}

.render-counter strong { color: #3451b2; }
`;

/**
 * Sandpack files map — pass to <BlacSandpack files={...} />
 */
export const playgroundStarterFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/counter.ts': cubitTs,
  '/RenderCounter.tsx': renderCounterTsx,
  '/styles.css': stylesCss,
};
