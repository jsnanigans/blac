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
      total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [state.items]);

  console.log(`[CartView] Rendering - ${itemCount} items, $${total.toFixed(2)}`);

  if (state.items.length === 0) {
    return (
      <div className="card" style={{ background: 'var(--gray-50)' }}>
        <h2>Shopping Cart</h2>
        <p className="text-muted text-center" style={{ padding: '2rem' }}>
          Your cart is empty
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>Shopping Cart ({itemCount} items)</h2>

      <div style={{ marginBottom: '1rem' }}>
        {state.items.map((item) => (
          <div
            key={item.product.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderBottom: '1px solid var(--gray-200)',
            }}
          >
            <div style={{ fontSize: '2rem' }}>{item.product.image}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{item.product.name}</div>
              <div className="text-small text-muted">
                ${item.product.price.toFixed(2)} each
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => cart.updateQuantity(item.product.id, item.quantity - 1)}
                style={{ padding: '0.25rem 0.75rem' }}
              >
                -
              </button>
              <span style={{ minWidth: '2rem', textAlign: 'center' }}>
                {item.quantity}
              </span>
              <button
                onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1)}
                style={{ padding: '0.25rem 0.75rem' }}
              >
                +
              </button>
            </div>
            <div style={{ fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>
              ${(item.product.price * item.quantity).toFixed(2)}
            </div>
            <button
              onClick={() => cart.removeFromCart(item.product.id)}
              className="danger"
              style={{ padding: '0.5rem 1rem' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Total</div>
          <button
            onClick={cart.clearCart}
            className="secondary"
            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
          >
            Clear Cart
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            ${total.toFixed(2)}
          </div>
          <button
            onClick={cart.checkout}
            disabled={state.isCheckingOut}
            className="success"
            style={{ marginTop: '0.5rem' }}
          >
            {state.isCheckingOut ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>

      {state.error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--danger)',
            color: 'white',
            borderRadius: 'var(--radius)',
          }}
        >
          {state.error}
        </div>
      )}

      {state.checkoutComplete && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--secondary)',
            color: 'white',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
          }}
        >
          ✓ Order placed successfully! Thank you for your purchase.
        </div>
      )}
    </div>
  );
}
