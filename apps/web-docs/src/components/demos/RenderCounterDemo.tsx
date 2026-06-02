import { useId } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Demo bloc for the re-render isolation demos. Holds two independent fields
 * so two sibling components can each read a different one — proving that
 * changing `count` wakes only the `count` reader, and changing `label` wakes
 * only the `label` reader.
 *
 * Pass `{ args: { _id: useId() } }` at the call site to get a per-mount
 * private instance so multiple embeds on one page don't share state.
 */
class RenderDemoCubit extends Cubit<
  { count: number; label: string },
  { _id: string }
> {
  constructor() {
    super({ count: 0, label: 'hello' });
  }

  increment = () => this.emit({ ...this.state, count: this.state.count + 1 });
  decrement = () => this.emit({ ...this.state, count: this.state.count - 1 });
  setLabel = (label: string) => this.emit({ ...this.state, label });
}

/* ------------------------------------------------------------------ */
/* Internal sub-components — each reads exactly one field              */
/* ------------------------------------------------------------------ */

interface CountReaderProps {
  id: string;
}

function CountReader({ id }: CountReaderProps) {
  const [state, bloc] = useBloc(RenderDemoCubit, { args: { _id: id } });
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">CountReader</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.count</code>
        </p>
        <div className="blac-demo-panel__controls">
          <button type="button" onClick={bloc.decrement} aria-label="Decrement">
            −
          </button>
          <strong className="blac-demo-count">{state.count}</strong>
          <button type="button" onClick={bloc.increment} aria-label="Increment">
            +
          </button>
        </div>
      </div>
    </div>
  );
}

interface LabelReaderProps {
  id: string;
}

function LabelReader({ id }: LabelReaderProps) {
  const [state, bloc] = useBloc(RenderDemoCubit, { args: { _id: id } });
  return (
    <div className="blac-demo-panel">
      <div className="blac-demo-panel__header">
        <span className="blac-demo-panel__name">LabelReader</span>
        <RenderCounter label="renders" />
      </div>
      <div className="blac-demo-panel__body">
        <p className="blac-demo-panel__reads">
          reads: <code>state.label</code>
        </p>
        <div className="blac-demo-panel__controls">
          <input
            type="text"
            value={state.label}
            onChange={(e) => bloc.setLabel(e.target.value)}
            aria-label="Label value"
            className="blac-demo-input"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exported island — full two-reader layout                            */
/* ------------------------------------------------------------------ */

/**
 * Hero re-render isolation demo. Two components share one `RenderDemoCubit`
 * instance but each reads a different field. Changing `count` increments only
 * the CountReader's render badge; changing `label` increments only the
 * LabelReader's render badge. Proves BlaC's headline: only the component
 * reading changed state re-renders.
 *
 * Per-mount private instance via `{ args: { _id: useId() } }` ensures
 * multiple embeds on one page don't share state.
 */
export function RenderCounterDemo() {
  const id = useId();
  return (
    <DemoFrame label="Re-render isolation — live demo">
      <p className="blac-demo-desc">
        Two components share one bloc. Each reads a different field. Change one
        — only its reader re-renders.
      </p>
      <div className="blac-demo-panels">
        <CountReader id={id} />
        <LabelReader id={id} />
      </div>
    </DemoFrame>
  );
}

export default RenderCounterDemo;
