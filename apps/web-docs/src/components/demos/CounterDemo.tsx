import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { DemoFrame } from './DemoFrame';
import { RenderCounter } from './RenderCounter';

/**
 * Proof island for the Phase 0 foundation: a real `@blac/core` Cubit driven by
 * the real `@blac/react` `useBloc` hook, wrapped in the shared `DemoFrame` and
 * annotated with a `RenderCounter`. If `@blac/react`'s public API breaks, this
 * island fails the docs build — which is the whole point of islands running
 * `workspace:*` blac.
 *
 * This is also the reference shape Phase 1 island authors should copy:
 *   1. Define a local Cubit (or import a shared demo bloc).
 *   2. `const [state, bloc] = useBloc(SomeCubit)`.
 *   3. Render inside `<DemoFrame label="…">`.
 *
 * The single exported component is what an `.mdx` page mounts with
 * `client:visible`; helper components stay internal to the island file.
 */
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

export function CounterDemo() {
  // Default (shared) instance — fine for a single proof embed. For a per-mount
  // private instance, pass a unique args object: `{ args: { _id: useId() } }`.
  const [state, counter] = useBloc(CounterCubit);

  return (
    <DemoFrame label="Counter — live blac island">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={counter.decrement}
          aria-label="Decrement"
        >
          −
        </button>
        <strong
          style={{
            minWidth: '3ch',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {state.count}
        </strong>
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
        <RenderCounter />
      </div>
    </DemoFrame>
  );
}

export default CounterDemo;
