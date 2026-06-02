import { useId } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Demo bloc for the performance page.
 *
 * Holds three independent sensor fields: `temperature`, `humidity`, and
 * `pressure`. Used by both the "coarse read" and "fine tracking" panels to
 * show the re-render difference between reading the whole state vs. reading
 * only the field a component displays.
 */
class DashCubit extends Cubit<
  { temperature: number; humidity: number; pressure: number },
  { _id: string }
> {
  static key = (a: { _id: string }) => a._id;

  constructor() {
    super({ temperature: 22, humidity: 55, pressure: 1013 });
  }

  bumpTemperature = () =>
    this.emit({ ...this.state, temperature: this.state.temperature + 1 });
  bumpHumidity = () =>
    this.emit({ ...this.state, humidity: this.state.humidity + 1 });
  bumpPressure = () =>
    this.emit({ ...this.state, pressure: this.state.pressure + 1 });
}

/* ------------------------------------------------------------------ */
/* "Before" — coarse read via select on all three fields               */
/* ------------------------------------------------------------------ */

/**
 * Reads ALL three fields via a single `select` that returns them together.
 * Any field bump re-renders this component even if it only displays one field.
 * This mirrors the anti-pattern of a parent reading everything and passing
 * props, collapsed to one component for clarity.
 */
const selectAll = (s: {
  temperature: number;
  humidity: number;
  pressure: number;
}) => [s.temperature, s.humidity, s.pressure];

function CoarseCard({
  id,
  field,
}: {
  id: string;
  field: 'temperature' | 'humidity' | 'pressure';
}) {
  const [state] = useBloc(DashCubit, { args: { _id: id }, select: selectAll });
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">{field}</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          select: <code>all three fields</code>
        </p>
        <strong className="blac-demo-count">{state[field]}</strong>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "After" — fine auto-tracking (each component reads only its field)  */
/* ------------------------------------------------------------------ */

function FineCard({
  id,
  field,
}: {
  id: string;
  field: 'temperature' | 'humidity' | 'pressure';
}) {
  const [state] = useBloc(DashCubit, { args: { _id: id } });
  // Auto-tracking: only `state[field]` is read — that path is the entire
  // recorded dependency for this component.
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">{field}</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.{field}</code>
        </p>
        <strong className="blac-demo-count">{state[field]}</strong>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls — writer component that never reads state                  */
/* ------------------------------------------------------------------ */

function DashControls({ id }: { id: string }) {
  // Only destructures the bloc instance — never reads `state` — so this
  // component records an empty path set and never re-renders on state changes.
  const [, dash] = useBloc(DashCubit, { args: { _id: id } });
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '0.75rem',
      }}
    >
      <button type="button" onClick={dash.bumpTemperature}>
        Temp +1
      </button>
      <button type="button" onClick={dash.bumpHumidity}>
        Humidity +1
      </button>
      <button type="button" onClick={dash.bumpPressure}>
        Pressure +1
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exported island                                                      */
/* ------------------------------------------------------------------ */

/**
 * Side-by-side comparison: coarse `select` (wakes every card on any change)
 * vs. fine auto-tracking (wakes only the card whose field changed).
 *
 * Both rows share the same `DashCubit` instance (via the same `_id`). Bump
 * "Temp +1" — top row: all three counters tick; bottom row: only the
 * temperature card ticks.
 */
export function PerformanceDemo() {
  const id = useId();
  return (
    <DemoFrame label="Re-render scope — coarse vs fine tracking">
      <p className="blac-demo-desc">
        Both rows read the same bloc. <strong>Top row</strong> selects all three
        fields — any bump re-renders every card. <strong>Bottom row</strong>{' '}
        auto-tracks each field independently — only the changed field&apos;s
        card re-renders.
      </p>
      <DashControls id={id} />
      <p
        style={{
          fontSize: 'var(--sl-text-xs)',
          color: 'var(--sl-color-gray-3)',
          margin: '0 0 0.4rem',
        }}
      >
        Coarse — <code>select: all three fields</code>
      </p>
      <div className="blac-demo-panels" style={{ marginBottom: '0.75rem' }}>
        <CoarseCard id={id} field="temperature" />
        <CoarseCard id={id} field="humidity" />
        <CoarseCard id={id} field="pressure" />
      </div>
      <p
        style={{
          fontSize: 'var(--sl-text-xs)',
          color: 'var(--sl-color-gray-3)',
          margin: '0 0 0.4rem',
        }}
      >
        Fine — <code>auto-tracking (no select)</code>
      </p>
      <div className="blac-demo-panels">
        <FineCard id={id} field="temperature" />
        <FineCard id={id} field="humidity" />
        <FineCard id={id} field="pressure" />
      </div>
    </DemoFrame>
  );
}

export default PerformanceDemo;
