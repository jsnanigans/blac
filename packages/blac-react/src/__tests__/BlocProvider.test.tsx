import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, hasInstance, borrow } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { BlocProvider } from '../BlocProvider';

class CounterCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.patch({ n: this.state.n + 1 });
  }
}

blacTestSetup();

describe('E1 — BlocProvider instance-id context', () => {
  it('descendants resolve to the provider id when no explicit instanceId is given', () => {
    let blocA!: CounterCubit;
    let blocB!: CounterCubit;

    function Probe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }

    render(
      <>
        <BlocProvider instanceId="ctx-1">
          <Probe assign={(b) => (blocA = b)} />
        </BlocProvider>
        <BlocProvider instanceId="ctx-2">
          <Probe assign={(b) => (blocB = b)} />
        </BlocProvider>
      </>,
    );

    expect(blocA).not.toBe(blocB);
    expect(hasInstance(CounterCubit, 'ctx-1')).toBe(true);
    expect(hasInstance(CounterCubit, 'ctx-2')).toBe(true);
  });

  it('two descendants under the same provider share the same instance', async () => {
    // Per-consumer design: each useBloc consumer returns its own proxy. The
    // shared-instance contract is verified against the raw bloc registered
    // under the provider's instanceId.
    let blocA!: CounterCubit;
    let blocB!: CounterCubit;

    function Probe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }

    render(
      <BlocProvider instanceId="shared">
        <Probe assign={(b) => (blocA = b)} />
        <Probe assign={(b) => (blocB = b)} />
      </BlocProvider>,
    );

    const raw = borrow(CounterCubit, 'shared');
    await act(async () => {
      raw.inc();
    });
    expect(blocA.state.n).toBe(1);
    expect(blocB.state.n).toBe(1);
    expect(blocA.state).toBe(blocB.state);
    expect(hasInstance(CounterCubit, 'shared')).toBe(true);
  });

  it('a state change under one provider does not re-render a sibling subtree', async () => {
    let blocA!: CounterCubit;

    function CompA() {
      const [state, b] = useBloc(CounterCubit);
      blocA = b as CounterCubit;
      return <span data-testid="a">{state.n}</span>;
    }
    function CompB() {
      const [state] = useBloc(CounterCubit);
      return <span data-testid="b">{state.n}</span>;
    }

    render(
      <>
        <BlocProvider instanceId="ctx-a">
          <CompA />
        </BlocProvider>
        <BlocProvider instanceId="ctx-b">
          <CompB />
        </BlocProvider>
      </>,
    );

    await act(async () => {
      blocA.inc();
    });

    expect(screen.getByTestId('a').textContent).toBe('1');
    expect(screen.getByTestId('b').textContent).toBe('0');
  });

  it('explicit instanceId on useBloc overrides the provider', () => {
    let blocA!: CounterCubit;
    let blocB!: CounterCubit;

    function CtxProbe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }
    function ExplicitProbe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit, { instanceId: 'override' });
      assign(b as CounterCubit);
      return null;
    }

    render(
      <BlocProvider instanceId="ctx">
        <CtxProbe assign={(b) => (blocA = b)} />
        <ExplicitProbe assign={(b) => (blocB = b)} />
      </BlocProvider>,
    );

    expect(blocA).not.toBe(blocB);
    expect(hasInstance(CounterCubit, 'ctx')).toBe(true);
    expect(hasInstance(CounterCubit, 'override')).toBe(true);
  });

  // Deleted: `autoInstance / static isolated overrides provider context` —
  // `static isolated` is gone (use `instanceId` with a unique key instead);
  // there is nothing left in the public surface that overrides BlocProvider.

  it('sibling subtree without a provider falls back to the default key', () => {
    let inside!: CounterCubit;
    let outside!: CounterCubit;

    function InsideProbe() {
      const [, b] = useBloc(CounterCubit);
      inside = b as CounterCubit;
      return null;
    }
    function OutsideProbe() {
      const [, b] = useBloc(CounterCubit);
      outside = b as CounterCubit;
      return null;
    }

    render(
      <>
        <BlocProvider instanceId="ctx">
          <InsideProbe />
        </BlocProvider>
        <OutsideProbe />
      </>,
    );

    expect(inside).not.toBe(outside);
    expect(hasInstance(CounterCubit, 'ctx')).toBe(true);
    expect(hasInstance(CounterCubit, 'default')).toBe(true);
  });

  it('unmounting a provider subtree drops the ref on that instance', () => {
    function Probe() {
      useBloc(CounterCubit);
      return null;
    }
    function Parent({ show }: { show: boolean }) {
      return (
        <>
          {show && (
            <BlocProvider instanceId="ephemeral">
              <Probe />
            </BlocProvider>
          )}
        </>
      );
    }

    const { rerender } = render(<Parent show={true} />);
    expect(hasInstance(CounterCubit, 'ephemeral')).toBe(true);

    rerender(<Parent show={false} />);
    expect(hasInstance(CounterCubit, 'ephemeral')).toBe(false);
  });

  it('numeric instanceId on the provider is coerced to string', async () => {
    let blocNum!: CounterCubit;
    let blocStr!: CounterCubit;

    function Probe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }

    render(
      <>
        <BlocProvider instanceId={7}>
          <Probe assign={(b) => (blocNum = b)} />
        </BlocProvider>
        <BlocProvider instanceId="7">
          <Probe assign={(b) => (blocStr = b)} />
        </BlocProvider>
      </>,
    );

    // Per-consumer design: compare via the raw instance registered under "7".
    const raw = borrow(CounterCubit, '7');
    await act(async () => {
      raw.inc();
    });
    expect(blocNum.state.n).toBe(1);
    expect(blocStr.state.n).toBe(1);
    expect(blocNum.state).toBe(blocStr.state);
    expect(hasInstance(CounterCubit, '7')).toBe(true);
  });
});
