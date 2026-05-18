import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, hasInstance } from '@blac/core';
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

class IsolatedCubit extends Cubit<{ n: number }> {
  static isolated = true;
  constructor() {
    super({ n: 0 });
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

  it('two descendants under the same provider share the same instance', () => {
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

    expect(blocA).toBe(blocB);
    expect(hasInstance(CounterCubit, 'shared')).toBe(true);
  });

  it('a state change under one provider does not re-render a sibling subtree', () => {
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

    act(() => {
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

  it('autoInstance / static isolated overrides provider context', () => {
    let blocCtx!: CounterCubit;
    let blocIso!: IsolatedCubit;

    function CtxProbe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }
    function IsoProbe({ assign }: { assign: (b: IsolatedCubit) => void }) {
      const [, b] = useBloc(IsolatedCubit);
      assign(b as IsolatedCubit);
      return null;
    }

    render(
      <BlocProvider instanceId="ctx">
        <CtxProbe assign={(b) => (blocCtx = b)} />
        <IsoProbe assign={(b) => (blocIso = b)} />
      </BlocProvider>,
    );

    // CounterCubit resolves to "ctx" key.
    expect(hasInstance(CounterCubit, 'ctx')).toBe(true);
    expect(blocCtx).toBeDefined();
    // IsolatedCubit is per-mount; the provider must not have parked it under "ctx".
    expect(hasInstance(IsolatedCubit, 'ctx')).toBe(false);
    expect(blocIso).toBeDefined();
  });

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

  it('numeric instanceId on the provider is coerced to string', () => {
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

    expect(blocNum).toBe(blocStr);
  });
});
