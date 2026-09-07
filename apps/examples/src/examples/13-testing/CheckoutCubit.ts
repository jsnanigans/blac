import { Cubit } from '@blac/core';

export interface CheckoutState {
  items: number;
  couponCode: string | null;
  status: 'editing' | 'submitting' | 'placed' | 'failed';
  error: string | null;
}

/** Stands in for a real payment API; overridden in tests. */
export async function submitOrder(items: number): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  if (items === 0) throw new Error('Cart is empty');
  return `order-${Math.random().toString(36).slice(2, 8)}`;
}

export class CheckoutCubit extends Cubit<CheckoutState> {
  constructor() {
    super({ items: 2, couponCode: null, status: 'editing', error: null });
  }

  addItem = () => this.patch({ items: this.state.items + 1 });

  removeItem = () => this.patch({ items: Math.max(0, this.state.items - 1) });

  applyCoupon = (code: string) => this.patch({ couponCode: code || null });

  placeOrder = async () => {
    this.patch({ status: 'submitting', error: null });
    try {
      await submitOrder(this.state.items);
      this.patch({ status: 'placed' });
    } catch (err) {
      this.patch({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  get canSubmit(): boolean {
    return this.state.items > 0 && this.state.status === 'editing';
  }
}
