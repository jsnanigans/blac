import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, getRegistry } from '@blac/core';
import { blacTestSetup, createTestRegistry } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { RegistryProvider, useRegistry } from '../RegistryProvider';

class CounterCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class PriceCubit extends Cubit<{ price: number }> {
  constructor() {
    super({ price: 100 });
  }
}

class CartCubit extends Cubit<{ qty: number }> {
  private price = this.depend(PriceCubit);
  constructor() {
    super({ qty: 2 });
  }
  get total() {
    const [price] = this.price.track();
    return this.state.qty * price.price;
  }
}

blacTestSetup();

describe('E — RegistryProvider scoping', () => {
  it('a consumer under RegistryProvider acquires from that registry, not the global', async () => {
    const scopedRegistry = createTestRegistry();

    function ScopedProbe() {
      useBloc(CounterCubit);
      return null;
    }

    await act(async () => {
      render(
        <RegistryProvider registry={scopedRegistry}>
          <ScopedProbe />
        </RegistryProvider>,
      );
    });

    expect(scopedRegistry.getInstancesMap(CounterCubit).size).toBe(1);
    expect(getRegistry().getInstancesMap(CounterCubit).size).toBe(0);
  });

  it('a tracked dep (`.track()`) resolves from the scoped registry, not the global', async () => {
    const scopedRegistry = createTestRegistry();

    function ScopedProbe() {
      const [, cart] = useBloc(CartCubit);
      void cart.total; // exercises the dep-reconcile lane via `.track()`
      return null;
    }

    await act(async () => {
      render(
        <RegistryProvider registry={scopedRegistry}>
          <ScopedProbe />
        </RegistryProvider>,
      );
    });

    expect(scopedRegistry.getInstancesMap(PriceCubit).size).toBe(1);
    expect(getRegistry().getInstancesMap(PriceCubit).size).toBe(0);
  });

  it('routes lifecycle events to the scoped registry, not the global', async () => {
    const scopedRegistry = createTestRegistry();
    const scopedSeen: string[] = [];
    const globalSeen: string[] = [];
    const offScoped = scopedRegistry.on('created', (c) =>
      scopedSeen.push(c.$blac.name),
    );
    const offGlobal = getRegistry().on('created', (c) =>
      globalSeen.push(c.$blac.name),
    );

    function ScopedProbe() {
      useBloc(CounterCubit);
      return null;
    }

    await act(async () => {
      render(
        <RegistryProvider registry={scopedRegistry}>
          <ScopedProbe />
        </RegistryProvider>,
      );
    });

    offScoped();
    offGlobal();
    expect(scopedSeen).toEqual(['CounterCubit']);
    expect(globalSeen).toEqual([]);
  });

  it('re-subscribes to the new registry when the provider swaps it', async () => {
    const r1 = createTestRegistry();
    const r2 = createTestRegistry();
    function Probe() {
      const [state] = useBloc(CounterCubit);
      return <span data-testid="n">{state.n}</span>;
    }
    const tree = (registry: typeof r1) => (
      <RegistryProvider registry={registry}>
        <Probe />
      </RegistryProvider>
    );
    const { rerender } = render(tree(r1));
    rerender(tree(r2));

    await act(async () => {
      r2.borrow(CounterCubit).emit({ n: 5 });
    });

    expect(screen.getByTestId('n').textContent).toBe('5');
  });

  it('moves tracked deps to the new registry when the provider swaps it', async () => {
    const r1 = createTestRegistry();
    const r2 = createTestRegistry();
    function Probe() {
      const [, cart] = useBloc(CartCubit);
      return <span data-testid="total">{cart.total}</span>;
    }
    const tree = (registry: typeof r1) => (
      <RegistryProvider registry={registry}>
        <Probe />
      </RegistryProvider>
    );
    const { rerender } = render(tree(r1));
    await act(async () => {
      rerender(tree(r2));
    });

    await act(async () => {
      r2.borrow(PriceCubit).emit({ price: 7 });
    });

    expect(screen.getByTestId('total').textContent).toBe('14');
    expect(r1.getInstancesMap(PriceCubit).size).toBe(0);
  });

  it('useRegistry returns the provider registry, else the global one', () => {
    const scopedRegistry = createTestRegistry();
    const seen: unknown[] = [];
    function Probe() {
      seen.push(useRegistry());
      return null;
    }

    render(
      <>
        <RegistryProvider registry={scopedRegistry}>
          <Probe />
        </RegistryProvider>
        <Probe />
      </>,
    );

    expect(seen).toEqual([scopedRegistry, getRegistry()]);
  });
});
