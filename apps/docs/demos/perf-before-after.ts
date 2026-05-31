/**
 * Demo source for the "before/after" performance comparison on the Performance page.
 *
 * Two variants, same state, same Cubit — contrasting coarse reads vs tracked reads:
 *
 *   BEFORE: A parent component reads the whole state and passes props down.
 *           Every field change re-renders ALL children because the parent always
 *           re-renders (it read the whole state) and passes new props.
 *
 *   AFTER:  Each component calls useBloc directly and reads only its own slice.
 *           Auto-tracking limits re-renders to the component that read the
 *           changed field. The untouched counters stay at their initial value.
 *
 * All exports are plain strings (no runtime imports at module top), so this
 * module is SSR-safe and can be imported from VitePress markdown pages.
 * Pass the files maps to <BlacSandpack :files="..." />.
 */

// ---------------------------------------------------------------------------
// Shared: Cubit + RenderCounter (same in both variants)
// ---------------------------------------------------------------------------

export const sharedCubitTs = `import { Cubit } from '@blac/core';

export interface DashState {
  temperature: number;
  humidity: number;
  pressure: number;
}

/**
 * One shared Cubit with three independent fields.
 * In the BEFORE variant a parent reads all three, so any field change
 * re-renders every child. In the AFTER variant each child reads its own
 * field — only the changed-field child re-renders.
 */
export class DashCubit extends Cubit<DashState> {
  constructor() {
    super({ temperature: 20, humidity: 55, pressure: 1013 });
  }

  bumpTemp = () =>
    this.update((s) => ({ ...s, temperature: s.temperature + 1 }));
  bumpHumidity = () =>
    this.update((s) => ({ ...s, humidity: Math.min(100, s.humidity + 1) }));
  bumpPressure = () =>
    this.update((s) => ({ ...s, pressure: s.pressure + 1 }));
}
`;

export const sharedRenderCounterTsx = `import { useRef } from 'react';

/**
 * Counts actual renders by incrementing a ref IN THE RENDER BODY.
 * (useEffect would undercount because it is batched and skipped under StrictMode.)
 */
export function RenderCounter({ label }: { label: string }) {
  const count = useRef(0);
  count.current += 1;
  return (
    <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#888' }}>
      {label} renders: <strong style={{ color: '#3451b2' }}>{count.current}</strong>
    </span>
  );
}
`;

// ---------------------------------------------------------------------------
// BEFORE variant — coarse read; parent distributes props
// ---------------------------------------------------------------------------

export const beforeAppTsx = `import { useBloc } from '@blac/react';
import { DashCubit } from './dash';
import { RenderCounter } from './RenderCounter';

/**
 * BEFORE — coarse read: the parent reads the entire state and passes every
 * value down as props. Any field change re-renders Parent (it read all
 * three fields), which re-renders all three Stat children with new props.
 *
 * Bump "Temp" and watch: ALL three render counters tick.
 */

interface StatProps {
  label: string;
  value: number;
  unit: string;
}

function Stat({ label, value, unit }: StatProps) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>
        {value}
        <span style={{ fontSize: 14, marginLeft: 2 }}>{unit}</span>
      </div>
      <RenderCounter label={label} />
    </div>
  );
}

function Dashboard() {
  // Reads all three fields → over-tracked; any change re-renders this component.
  const [state, dash] = useBloc(DashCubit);

  return (
    <div>
      <div style={gridStyle}>
        <Stat label="Temp" value={state.temperature} unit="°C" />
        <Stat label="Humidity" value={state.humidity} unit="%" />
        <Stat label="Pressure" value={state.pressure} unit="hPa" />
      </div>
      <div style={btnRowStyle}>
        <button style={btnStyle} onClick={dash.bumpTemp}>Bump Temp</button>
        <button style={btnStyle} onClick={dash.bumpHumidity}>Bump Humidity</button>
        <button style={btnStyle} onClick={dash.bumpPressure}>Bump Pressure</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Before — coarse read</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#666' }}>
        The parent reads all three fields. Bump any one — watch all three
        counters tick.
      </p>
      <Dashboard />
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 10,
  marginBottom: 12,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #e2e5ec',
  borderRadius: 10,
  padding: '12px 14px',
  background: '#fafbfc',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

const btnStyle: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid #c8cdd8',
  background: '#fff',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 13,
  cursor: 'pointer',
};
`;

// ---------------------------------------------------------------------------
// AFTER variant — each child reads its own slice via useBloc directly
// ---------------------------------------------------------------------------

export const afterAppTsx = `import { useBloc } from '@blac/react';
import { DashCubit } from './dash';
import { RenderCounter } from './RenderCounter';

/**
 * AFTER — tracked read: each Stat calls useBloc and reads only its own
 * field. Auto-tracking limits re-renders to the component whose field changed.
 *
 * Bump "Temp" and watch: ONLY the Temp counter ticks.
 */

function TempStat() {
  const [state, dash] = useBloc(DashCubit);
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: '#666' }}>Temp</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>
        {state.temperature}
        <span style={{ fontSize: 14, marginLeft: 2 }}>°C</span>
      </div>
      <RenderCounter label="Temp" />
      <button style={{ ...btnStyle, marginTop: 10 }} onClick={dash.bumpTemp}>
        Bump Temp
      </button>
    </div>
  );
}

function HumidityStat() {
  const [state, dash] = useBloc(DashCubit);
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: '#666' }}>Humidity</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>
        {state.humidity}
        <span style={{ fontSize: 14, marginLeft: 2 }}>%</span>
      </div>
      <RenderCounter label="Humidity" />
      <button style={{ ...btnStyle, marginTop: 10 }} onClick={dash.bumpHumidity}>
        Bump Humidity
      </button>
    </div>
  );
}

function PressureStat() {
  const [state, dash] = useBloc(DashCubit);
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, color: '#666' }}>Pressure</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>
        {state.pressure}
        <span style={{ fontSize: 14, marginLeft: 2 }}>hPa</span>
      </div>
      <RenderCounter label="Pressure" />
      <button style={{ ...btnStyle, marginTop: 10 }} onClick={dash.bumpPressure}>
        Bump Pressure
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>After — per-field tracking</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#666' }}>
        Each card reads only its own field. Bump any one — watch ONLY that
        counter tick.
      </p>
      <div style={gridStyle}>
        <TempStat />
        <HumidityStat />
        <PressureStat />
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 10,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #e2e5ec',
  borderRadius: 10,
  padding: '12px 14px',
  background: '#fafbfc',
};

const btnStyle: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid #c8cdd8',
  background: '#fff',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 13,
  cursor: 'pointer',
  width: '100%',
};
`;

// ---------------------------------------------------------------------------
// Files maps — pass each to <BlacSandpack :files="..." />
// ---------------------------------------------------------------------------

const sharedFiles = {
  '/dash.ts': sharedCubitTs,
  '/RenderCounter.tsx': sharedRenderCounterTsx,
};

/**
 * Files for the "before" panel: parent reads all three fields, children
 * accept props — every child re-renders on any field change.
 */
export const perfBeforeFiles: Record<string, string> = {
  '/App.tsx': beforeAppTsx,
  ...sharedFiles,
};

/**
 * Files for the "after" panel: each child calls useBloc and reads only its
 * own field — only the changed-field child re-renders.
 */
export const perfAfterFiles: Record<string, string> = {
  '/App.tsx': afterAppTsx,
  ...sharedFiles,
};
