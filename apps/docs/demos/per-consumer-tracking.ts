/**
 * Demo source for the Sandpack interactivity spike.
 *
 * These are plain string exports (no runtime imports), so this module is
 * SSR-safe and can be imported anywhere. The strings are handed to
 * <BlacSandpack :files="..."> which maps them into the in-browser sandbox.
 *
 * The payoff: bumping `left` re-renders ONLY the left consumer. Each consumer
 * reads a single slice of the Cubit's state via useBloc auto-tracking, so the
 * RenderCounter for the untouched side does NOT tick. This is the
 * category-defining "per-consumer auto-tracking" artifact.
 *
 * Uses the REAL published API surface:
 *   - Cubit from @blac/core
 *   - useBloc from @blac/react (returns [state, bloc, ref])
 *   - useBloc options are only { args, instanceId, select, onMount, onUnmount }
 */

// RenderCounter increments a ref IN THE RENDER BODY (not useEffect) so it
// counts ACTUAL renders. useEffect would undercount (batched) and double-count
// under StrictMode.
export const renderCounterTsx = `import { useRef } from 'react';

/**
 * Counts how many times the component that renders it actually re-rendered.
 * The increment happens in the render body, so it reflects real renders.
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

export const cubitTsx = `import { Cubit } from '@blac/core';

export interface CountersState {
  left: number;
  right: number;
}

/**
 * One shared Cubit holding two independent slices. Each consumer below reads
 * only one slice, so only the consumer that read a changed slice re-renders.
 */
export class CountersCubit extends Cubit<CountersState> {
  constructor() {
    super({ left: 0, right: 0 });
  }

  bumpLeft = () => this.update((s) => ({ ...s, left: s.left + 1 }));
  bumpRight = () => this.update((s) => ({ ...s, right: s.right + 1 }));
}
`;

export const leftPanelTsx = `import { useBloc } from '@blac/react';
import { CountersCubit } from './counters';
import { RenderCounter } from './RenderCounter';

/**
 * Reads ONLY state.left. Auto-tracking subscribes this component to the
 * \`left\` path only — bumping \`right\` will not re-render it.
 */
export function LeftPanel() {
  const [state, counters] = useBloc(CountersCubit);

  return (
    <section className="panel">
      <h3>Left consumer</h3>
      <p className="value">left = {state.left}</p>
      <button onClick={counters.bumpLeft}>Bump left</button>
      <RenderCounter label="Left" />
    </section>
  );
}
`;

export const rightPanelTsx = `import { useBloc } from '@blac/react';
import { CountersCubit } from './counters';
import { RenderCounter } from './RenderCounter';

/**
 * Reads ONLY state.right. Auto-tracking subscribes this component to the
 * \`right\` path only — bumping \`left\` will not re-render it.
 */
export function RightPanel() {
  const [state, counters] = useBloc(CountersCubit);

  return (
    <section className="panel">
      <h3>Right consumer</h3>
      <p className="value">right = {state.right}</p>
      <button onClick={counters.bumpRight}>Bump right</button>
      <RenderCounter label="Right" />
    </section>
  );
}
`;

export const appTsx = `import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import './styles.css';

/**
 * Both panels share the SAME CountersCubit instance (no provider needed).
 * Bump "left" and watch: the Left renders counter ticks, the Right one does
 * not — that is per-consumer auto-tracking.
 */
export default function App() {
  return (
    <div className="demo">
      <h2>Per-consumer auto-tracking</h2>
      <p className="hint">
        Bump <code>left</code> and watch only the left "renders" count tick.
        The right consumer never re-renders because it never read{' '}
        <code>state.left</code>.
      </p>
      <div className="panels">
        <LeftPanel />
        <RightPanel />
      </div>
    </div>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1f2430;
  background: #ffffff;
}

.demo { padding: 16px; }

.demo h2 { margin: 0 0 4px; font-size: 18px; }

.hint {
  margin: 0 0 16px;
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

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  padding: 14px;
  background: #fafbfc;
}

.panel h3 { margin: 0 0 8px; font-size: 14px; }

.value {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

button {
  appearance: none;
  border: 1px solid #c8cdd8;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

button:hover { background: #f2f4f8; }

.render-counter {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #5a6373;
  font-variant-numeric: tabular-nums;
}

.render-counter strong { color: #3451b2; }
`;

/**
 * Sandpack files map: keys are absolute paths inside the sandbox.
 * Pass this straight to <BlacSandpack :files="perConsumerTrackingFiles" />.
 */
export const perConsumerTrackingFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/counters.ts': cubitTsx,
  '/LeftPanel.tsx': leftPanelTsx,
  '/RightPanel.tsx': rightPanelTsx,
  '/RenderCounter.tsx': renderCounterTsx,
  '/styles.css': stylesCss,
};
