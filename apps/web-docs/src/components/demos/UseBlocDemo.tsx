import { useId } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Minimal counter for the useBloc "hello world" demo.
 *
 * The `{ _id: string }` args + `static key` give each page embed its own
 * private instance so resets on one embed don't affect another.
 */
class UseBlocCounterCubit extends Cubit<{ count: number }, { _id: string }> {
  static key = (a: { _id: string }) => a._id;

  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

/* ------------------------------------------------------------------ */
/* Exported island                                                      */
/* ------------------------------------------------------------------ */

/**
 * Minimal `useBloc` demo. Wires the hook to a `Cubit`, renders the current
 * state, and calls methods on the bloc instance — the simplest possible proof
 * that the hook connects a component to a state container.
 */
export function UseBlocDemo() {
  const _id = useId();
  // useBloc returns [state, bloc, ref]. Destructure just the first two.
  const [state, counter] = useBloc(UseBlocCounterCubit, { args: { _id } });

  return (
    <DemoFrame label="useBloc — minimal counter">
      <p className="blac-demo-desc">
        <code>useBloc</code> returns <code>[state, bloc]</code>. Read state,
        call methods — the component re-renders only when{' '}
        <code>state.count</code> changes.
      </p>
      <div className="blac-demo-panels" style={{ gridTemplateColumns: '1fr' }}>
        <div className="blac-demo-panel">
          <div className="blac-demo-panel__header">
            <span className="blac-demo-panel__name">Counter</span>
            <RenderCounter label="renders" />
          </div>
          <div className="blac-demo-panel__body">
            <p className="blac-demo-panel__reads">
              reads: <code>state.count</code>
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
      </div>
    </DemoFrame>
  );
}

export default UseBlocDemo;
