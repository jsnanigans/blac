import { useBloc } from '@blac/react';
import { CartBloc } from './CartBloc';
import { useMemo } from 'react';

/**
 * Shopping cart view showing items and totals.
 *
 * Demonstrates:
 * - Only re-renders when cart items change
 * - Deep object tracking (array of cart items with nested product objects)
 * - Computed totals
 */
export function CartView() {
  const [state, cart] = useBloc(CartBloc);

  // Compute totals - depends on items
  const { total, itemCount } = useMemo(() => {
    const items = state.items;
    return {
      total: items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [state.items]);

  console.log(
    `[CartView] Rendering - ${itemCount} items, $${total.toFixed(2)}`,
  );

  if (state.items.length === 0) {
    return (
      <aside className="card card-subtle cart-card">
        <h2>Shopping Cart</h2>
        <div className="empty-panel text-center">Your cart is empty</div>
      </aside>
    );
  }

  return (
    <aside className="card cart-card">
      <h2>Shopping Cart ({itemCount} items)</h2>

      <div className="cart-items">
        {state.items.map((item) => (
          <div key={item.product.id} className="cart-item">
            <div className="cart-item-icon">{item.product.image}</div>
            <div className="cart-item-info">
              <div className="cart-item-title">{item.product.name}</div>
              <div className="text-small text-muted">
                ${item.product.price.toFixed(2)} each
              </div>
            </div>
            <div className="cart-quantity">
              <button
                onClick={() =>
                  cart.updateQuantity(item.product.id, item.quantity - 1)
                }
                className="button-compact"
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() =>
                  cart.updateQuantity(item.product.id, item.quantity + 1)
                }
                className="button-compact"
              >
                +
              </button>
            </div>
            <div className="price-tag">
              ${(item.product.price * item.quantity).toFixed(2)}
            </div>
            <button
              onClick={() => cart.removeFromCart(item.product.id)}
              className="danger button-compact"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="stack-sm">
          <span className="stat-label">Total items</span>
          <span className="stat-value">{itemCount}</span>
          <button
            onClick={cart.clearCart}
            className="button-ghost button-compact"
          >
            Clear Cart
          </button>
        </div>
        <div className="stack-sm text-right">
          <span className="stat-label">Order total</span>
          <span className="stat-value highlight">${total.toFixed(2)}</span>
          <button
            onClick={cart.checkout}
            disabled={state.isCheckingOut}
            className="success button-block"
          >
            {state.isCheckingOut ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>

      {state.error && (
        <div className="status-banner status-banner--error">{state.error}</div>
      )}

      {state.checkoutComplete && (
        <div className="status-banner status-banner--success text-center">
          ✓ Order placed successfully! Thank you for your purchase.
        </div>
      )}
    </aside>
  );
}
