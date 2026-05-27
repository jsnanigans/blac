/**
 * Repro: emitting state on a bloc that has a `deps` slice must not cause an
 * infinite render loop. Mirrors the input-pattern example (DepsView): a bloc
 * receives a stable DOM handle via deps, the component reads state, and a button
 * calls a method that `patch`es state.
 */
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

type TickerDeps = { display: HTMLElement | null };

class Ticker extends Cubit<{ tick: number }, void, TickerDeps> {
  constructor() {
    super({ tick: 0 });
  }
  step = () => this.patch({ tick: this.state.tick + 1 });
}

let renderCount = 0;

function Ticked() {
  renderCount++;
  if (renderCount > 100) {
    throw new Error(`render loop: ${renderCount} renders`);
  }

  const displayRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);

  const [state, ticker] = useBloc(Ticker, {
    autoInstance: true,
    deps: { display: displayRef.current },
  });

  useEffect(() => {
    bump((n) => n + 1); // one extra commit so the ref flows into deps
  }, []);

  return (
    <div>
      <div ref={displayRef}>display</div>
      <span data-testid="tick">{state.tick}</span>
      <button data-testid="step" onClick={ticker.step}>
        step
      </button>
    </div>
  );
}

describe('emit on a deps-bloc does not loop', () => {
  it('a single step produces a bounded number of renders', () => {
    renderCount = 0;
    render(
      <StrictMode>
        <Ticked />
      </StrictMode>,
    );

    const before = renderCount;
    act(() => {
      fireEvent.click(screen.getByTestId('step'));
    });

    expect(screen.getByTestId('tick')).toHaveTextContent('1');
    // One click should cost a small, bounded number of renders — not a loop.
    expect(renderCount - before).toBeLessThan(5);
  });
});
