import { describe, it, expect } from 'vite-plus/test';
import { StrictMode } from 'react';
import { render, act, screen } from '@testing-library/react';
import { Cubit, ensure } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

interface ChannelProtoLike {
  subscribe: (...args: never[]) => () => void;
}

const ensureBloc = () => ensure(CounterBloc) as unknown as CounterBloc;

blacTestSetup();

describe('useBloc — useSyncExternalStore', () => {
  it('renders an emit raised during the first render', async () => {
    // The rewrite drops the old renderStateRef + force mount-gap
    // compensation, relying instead on the channel accumulating the mark
    // until its scheduler flushes — by which time uSES has subscribed. This
    // pins that assumption.
    let emitted = false;
    function Comp() {
      const [state] = useBloc(CounterBloc);
      if (!emitted) {
        emitted = true;
        ensureBloc().increment();
      }
      return <span data-testid="count">{state.count}</span>;
    }

    await act(async () => {
      render(<Comp />);
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('pairs subscribe with unsubscribe under StrictMode', async () => {
    // The deletion of the old rebindNonce/force compensation rests on uSES
    // pairing every subscribe with an unsubscribe across StrictMode's
    // setup→cleanup→setup double-invoke.
    let subs = 0;
    let unsubs = 0;

    // Count on the channel PROTOTYPE so the counters survive the
    // dispose/recreate that StrictMode's double-invoke puts the instance
    // through — a per-instance spy would be discarded with the first instance.
    const proto = Object.getPrototypeOf(
      ensureBloc().channel,
    ) as ChannelProtoLike;
    const original = proto.subscribe;
    proto.subscribe = function patched(this: unknown, ...args: never[]) {
      subs++;
      const unsubscribe = original.apply(this, args);
      return () => {
        unsubs++;
        unsubscribe();
      };
    };

    function Comp() {
      const [state] = useBloc(CounterBloc);
      return <span data-testid="count">{state.count}</span>;
    }

    let unmount!: () => void;
    await act(async () => {
      unmount = render(
        <StrictMode>
          <Comp />
        </StrictMode>,
      ).unmount;
    });
    expect(subs).toBeGreaterThan(0);

    await act(async () => {
      unmount();
    });
    expect(unsubs).toBe(subs);

    proto.subscribe = original;
  });
});
