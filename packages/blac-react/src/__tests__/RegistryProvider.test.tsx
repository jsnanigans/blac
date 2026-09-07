import { describe, it, expect } from 'vite-plus/test';
import { render, act } from '@testing-library/react';
import { Cubit, getRegistry } from '@blac/core';
import { blacTestSetup, createTestRegistry } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { RegistryProvider } from '../RegistryProvider';

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
});
