import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, hasInstance } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { BlocProvider } from '../BlocProvider';

class CounterCubit extends Cubit<{ n: number }, { _id: string }> {
  static key(args: { _id: string } | undefined) {
    return args?._id ?? 'default';
  }
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.patch({ n: this.state.n + 1 });
  }
}

// A second bloc so we can test multi-bloc provider composition.
class FlagCubit extends Cubit<{ on: boolean }, { _id: string }> {
  static key(args: { _id: string } | undefined) {
    return args?._id ?? 'default';
  }
  constructor() {
    super({ on: false });
  }
  toggle() {
    this.patch({ on: !this.state.on });
  }
}

blacTestSetup();

describe('E1 — BlocProvider args-based scoping', () => {
  it('descendants resolve to the provider args when no own args are given', () => {
    let blocA!: CounterCubit;
    let blocB!: CounterCubit;

    function Probe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }

    render(
      <>
        <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx-1' }}>
          <Probe assign={(b) => (blocA = b)} />
        </BlocProvider>
        <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx-2' }}>
          <Probe assign={(b) => (blocB = b)} />
        </BlocProvider>
      </>,
    );

    expect(blocA).not.toBe(blocB);
    // CounterCubit.key returns _id, so key equals the _id string.
    expect(hasInstance(CounterCubit, { args: { _id: 'ctx-1' } })).toBe(true);
    expect(hasInstance(CounterCubit, { args: { _id: 'ctx-2' } })).toBe(true);
  });

  it('two descendants under the same provider share the same instance', async () => {
    let blocA!: CounterCubit;
    let blocB!: CounterCubit;

    function Probe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }

    render(
      <BlocProvider bloc={CounterCubit} args={{ _id: 'shared' }}>
        <Probe assign={(b) => (blocA = b)} />
        <Probe assign={(b) => (blocB = b)} />
      </BlocProvider>,
    );

    await act(async () => {
      blocA.inc();
    });
    expect(blocA.state.n).toBe(1);
    expect(blocB.state.n).toBe(1);
    expect(blocA.state).toBe(blocB.state);
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
        <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx-a' }}>
          <CompA />
        </BlocProvider>
        <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx-b' }}>
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

  it('explicit args on useBloc override the provider args', () => {
    let blocCtx!: CounterCubit;
    let blocOwn!: CounterCubit;

    function CtxProbe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit);
      assign(b as CounterCubit);
      return null;
    }
    function OwnArgsProbe({ assign }: { assign: (b: CounterCubit) => void }) {
      const [, b] = useBloc(CounterCubit, { args: { _id: 'override' } });
      assign(b as CounterCubit);
      return null;
    }

    render(
      <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx' }}>
        <CtxProbe assign={(b) => (blocCtx = b)} />
        <OwnArgsProbe assign={(b) => (blocOwn = b)} />
      </BlocProvider>,
    );

    expect(blocCtx).not.toBe(blocOwn);
    expect(hasInstance(CounterCubit, { args: { _id: 'ctx' } })).toBe(true);
    expect(hasInstance(CounterCubit, { args: { _id: 'override' } })).toBe(true);
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
        <BlocProvider bloc={CounterCubit} args={{ _id: 'ctx' }}>
          <InsideProbe />
        </BlocProvider>
        <OutsideProbe />
      </>,
    );

    expect(inside).not.toBe(outside);
    expect(hasInstance(CounterCubit, { args: { _id: 'ctx' } })).toBe(true);
    // Outside has no args and no provider → default key
    expect(hasInstance(CounterCubit)).toBe(true);
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
            <BlocProvider bloc={CounterCubit} args={{ _id: 'ephemeral' }}>
              <Probe />
            </BlocProvider>
          )}
        </>
      );
    }

    const { rerender } = render(<Parent show={true} />);
    expect(hasInstance(CounterCubit, { args: { _id: 'ephemeral' } })).toBe(
      true,
    );

    rerender(<Parent show={false} />);
    expect(hasInstance(CounterCubit, { args: { _id: 'ephemeral' } })).toBe(
      false,
    );
  });

  it('nested providers for different bloc classes compose correctly', () => {
    let counter!: CounterCubit;
    let flag!: FlagCubit;

    function Probe() {
      const [, c] = useBloc(CounterCubit);
      const [, f] = useBloc(FlagCubit);
      counter = c as CounterCubit;
      flag = f as FlagCubit;
      return null;
    }

    render(
      <BlocProvider bloc={CounterCubit} args={{ _id: 'counter-ctx' }}>
        <BlocProvider bloc={FlagCubit} args={{ _id: 'flag-ctx' }}>
          <Probe />
        </BlocProvider>
      </BlocProvider>,
    );

    expect(hasInstance(CounterCubit, { args: { _id: 'counter-ctx' } })).toBe(
      true,
    );
    expect(hasInstance(FlagCubit, { args: { _id: 'flag-ctx' } })).toBe(true);
    expect(counter).not.toBeNull();
    expect(flag).not.toBeNull();
  });

  it('provider for one bloc does not affect useBloc of a different bloc', () => {
    let flag!: FlagCubit;

    function Probe() {
      // No FlagCubit provider above — should use default key.
      const [, f] = useBloc(FlagCubit);
      flag = f as FlagCubit;
      return null;
    }

    render(
      // Only a CounterCubit provider, no FlagCubit provider.
      <BlocProvider bloc={CounterCubit} args={{ _id: 'counter-only' }}>
        <Probe />
      </BlocProvider>,
    );

    // FlagCubit should have resolved to the default key (no args, no provider).
    expect(hasInstance(FlagCubit)).toBe(true);
    expect(flag).not.toBeNull();
  });
});
