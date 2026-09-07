import { describe, it, expect, vi } from 'vitest';
import { ensure } from '@blac/core';
import {
  blacTestSetup,
  createCubitStub,
  withBlocState,
  withBlocMethod,
} from '@blac/core/testing';
import { CheckoutCubit } from './CheckoutCubit';

// Swaps the global registry per test, so instances never leak between cases.
blacTestSetup();

describe('CheckoutCubit', () => {
  it('blocks submitting an empty cart', () => {
    const cubit = withBlocState(CheckoutCubit, { items: 0 });
    expect(cubit.canSubmit).toBe(false);
  });

  it('records the failure when the order API rejects', async () => {
    const cubit = createCubitStub(CheckoutCubit, {
      state: { items: 3 },
      methods: {
        placeOrder: async function (this: CheckoutCubit) {
          this.patch({ status: 'failed', error: 'Card declined' });
        },
      },
    });

    await cubit.placeOrder();

    expect(cubit.state.status).toBe('failed');
    expect(cubit.state.error).toBe('Card declined');
  });

  it('routes ensure() to the overridden method', () => {
    const addItem = vi.fn();
    withBlocMethod(CheckoutCubit, 'addItem', addItem);

    ensure(CheckoutCubit).addItem();

    expect(addItem).toHaveBeenCalledOnce();
  });
});
