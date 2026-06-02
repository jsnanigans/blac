import { useId } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Demo bloc for the dependency-tracking page.
 *
 * Holds two independent fields — `temperature` (a number) and `status` (a
 * string) — so two sibling components can each read a different one. When
 * `temperature` changes only the temperature reader re-renders; when `status`
 * changes only the status reader re-renders. Auto-tracking makes this happen
 * without any `select` option.
 *
 * The `{ _id: string }` args + `static key` guarantee each page embed gets its
 * own private instance so multiple embeds never share state.
 */
class SensorCubit extends Cubit<
  { temperature: number; status: string },
  { _id: string }
> {
  static key = (a: { _id: string }) => a._id;

  constructor() {
    super({ temperature: 20, status: 'idle' });
  }

  warmer = () =>
    this.emit({ ...this.state, temperature: this.state.temperature + 1 });
  cooler = () =>
    this.emit({ ...this.state, temperature: this.state.temperature - 1 });
  setStatus = (status: string) => this.emit({ ...this.state, status });
}

/* ------------------------------------------------------------------ */
/* Internal sub-components — each reads exactly one field              */
/* ------------------------------------------------------------------ */

/** Reads only `state.temperature` — auto-tracking records that path only. */
function TemperaturePanel({ id }: { id: string }) {
  const [state, sensor] = useBloc(SensorCubit, { args: { _id: id } });
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">TemperaturePanel</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.temperature</code>
        </p>
        <div className="blac-demo-panel__controls">
          <button type="button" onClick={sensor.cooler} aria-label="Decrease">
            −
          </button>
          <strong className="blac-demo-count">{state.temperature}°</strong>
          <button type="button" onClick={sensor.warmer} aria-label="Increase">
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reads only `state.status` — auto-tracking records that path only. */
function StatusPanel({ id }: { id: string }) {
  const [state, sensor] = useBloc(SensorCubit, { args: { _id: id } });
  const STATUSES = ['idle', 'running', 'error'];
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">StatusPanel</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.status</code>
        </p>
        <div className="blac-demo-panel__controls">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sensor.setStatus(s)}
              style={
                state.status === s
                  ? { opacity: 1 }
                  : {
                      opacity: 0.45,
                      background: 'transparent',
                      color: 'inherit',
                    }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exported island                                                      */
/* ------------------------------------------------------------------ */

/**
 * Auto-tracking dependency demo. Two components share one `SensorCubit`
 * instance but each reads a different field. No `select` option is passed —
 * auto-tracking infers each component's re-render scope from what it actually
 * reads during render.
 *
 * Change `temperature` — only `TemperaturePanel`'s render counter ticks.
 * Change `status` — only `StatusPanel`'s render counter ticks.
 */
export function DependencyTrackingDemo() {
  const id = useId();
  return (
    <DemoFrame label="Auto-tracking — live demo">
      <p className="blac-demo-desc">
        Two components, one bloc. Each reads a different field — change one,
        only its reader re-renders. No <code>select</code>, no manual deps.
      </p>
      <div className="blac-demo-panels">
        <TemperaturePanel id={id} />
        <StatusPanel id={id} />
      </div>
    </DemoFrame>
  );
}

export default DependencyTrackingDemo;
