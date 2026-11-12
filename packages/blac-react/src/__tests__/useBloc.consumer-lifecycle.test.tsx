import { describe, it, expect } from 'vite-plus/test';
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { render, act, screen } from '@testing-library/react';
import { Cubit, clearWhere, getAll } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class Counter extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc = () => this.patch({ n: this.state.n + 1 });
}

blacTestSetup();

// Without `act`, passive effects run a task after the commit, as in an app.
async function renderOutsideAct(element: ReactNode): Promise<string | null> {
  const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  env.IS_REACT_ACT_ENVIRONMENT = false;
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(element);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const text = container.textContent;
  root.unmount();
  env.IS_REACT_ACT_ENVIRONMENT = true;
  return text;
}

describe('useBloc — consumer lifecycle', () => {
  it('delivers an emit raised between commit and the passive subscribe', async () => {
    function Reader() {
      const [state] = useBloc(Counter);
      return <span>{state.n}</span>;
    }
    function Emitter() {
      useBloc(Counter, { onMount: (bloc) => bloc.inc() });
      return null;
    }

    const text = await renderOutsideAct(
      <>
        <Reader />
        <Emitter />
      </>,
    );

    expect(text).toBe('1');
  });

  it('moves to a new instance when its bloc is disposed from outside', async () => {
    function Comp() {
      const [state, bloc] = useBloc(Counter);
      return <button onClick={bloc.inc}>{state.n}</button>;
    }
    render(<Comp />);
    await act(async () => screen.getByRole('button').click());

    await act(async () => clearWhere(() => true));
    expect(screen.getByRole('button').textContent).toBe('0');

    await act(async () => screen.getByRole('button').click());
    expect(screen.getByRole('button').textContent).toBe('1');
    expect(getAll(Counter)).toHaveLength(1);
  });

  it('keeps state when two consumers swap in one commit', async () => {
    function A() {
      const [state, bloc] = useBloc(Counter);
      return <button onClick={bloc.inc}>A{state.n}</button>;
    }
    function B() {
      const [state] = useBloc(Counter);
      return <span data-testid="b">B{state.n}</span>;
    }
    function App() {
      const [showA, setShowA] = useState(true);
      return (
        <>
          {showA ? <A /> : <B />}
          <a onClick={() => setShowA(false)}>swap</a>
        </>
      );
    }
    render(<App />);
    await act(async () => screen.getByRole('button').click());

    await act(async () => screen.getByText('swap').click());

    expect(screen.getByTestId('b').textContent).toBe('B1');
  });
});
