import { Cubit } from '@blac/core';

export interface CartLine {
  id: string;
  name: string;
  priceEur: number;
  qty: number;
}

export interface CartState {
  lines: CartLine[];
}

/** Products that can be added to the cart. */
export const CART_CATALOG: Omit<CartLine, 'qty'>[] = [
  { id: 'kbd', name: 'Mechanical Keyboard', priceEur: 89 },
  { id: 'mouse', name: 'Wireless Mouse', priceEur: 45 },
  { id: 'hub', name: 'USB-C Hub', priceEur: 32 },
  { id: 'cam', name: '4K Webcam', priceEur: 120 },
];

export class CartBloc extends Cubit<CartState> {
  constructor() {
    super({
      lines: [
        { id: 'kbd', name: 'Mechanical Keyboard', priceEur: 89, qty: 1 },
        { id: 'mouse', name: 'Wireless Mouse', priceEur: 45, qty: 2 },
      ],
    });
  }

  /**
   * Derived getter over the cart's OWN state. When CheckoutBloc reads this
   * through `this.cart.track()`, tracking follows transitively: the line items
   * this getter touches become part of the receipt consumer's interest, so
   * editing a quantity wakes a component that only knows about CheckoutBloc.
   */
  get subtotalEur(): number {
    return this.state.lines.reduce((sum, l) => sum + l.priceEur * l.qty, 0);
  }

  get itemCount(): number {
    return this.state.lines.reduce((sum, l) => sum + l.qty, 0);
  }

  setQty = (id: string, qty: number) => {
    const next = Math.max(0, qty);
    this.patch({
      lines: this.state.lines
        .map((l) => (l.id === id ? { ...l, qty: next } : l))
        .filter((l) => l.qty > 0),
    });
  };

  addProduct = (id: string) => {
    const existing = this.state.lines.find((l) => l.id === id);
    if (existing) {
      this.setQty(id, existing.qty + 1);
      return;
    }
    const product = CART_CATALOG.find((p) => p.id === id);
    if (!product) return;
    this.patch({ lines: [...this.state.lines, { ...product, qty: 1 }] });
  };
}
