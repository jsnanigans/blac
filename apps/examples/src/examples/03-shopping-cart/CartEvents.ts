import { BaseEvent } from '@blac/core';
import { Product } from './types';

/**
 * Shopping cart events - demonstrates event-driven architecture
 */

export class AddToCartEvent implements BaseEvent {
  readonly type = 'addToCart';
  readonly timestamp = Date.now();

  constructor(public readonly product: Product) {}
}

export class RemoveFromCartEvent implements BaseEvent {
  readonly type = 'removeFromCart';
  readonly timestamp = Date.now();

  constructor(public readonly productId: string) {}
}

export class UpdateQuantityEvent implements BaseEvent {
  readonly type = 'updateQuantity';
  readonly timestamp = Date.now();

  constructor(
    public readonly productId: string,
    public readonly quantity: number,
  ) {}
}

export class CheckoutEvent implements BaseEvent {
  readonly type = 'checkout';
  readonly timestamp = Date.now();
}

export class ClearCartEvent implements BaseEvent {
  readonly type = 'clearCart';
  readonly timestamp = Date.now();
}
