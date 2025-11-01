import { useBloc } from '@blac/react';
import { CartBloc } from './CartBloc';
import {
  Card,
  Button,
  Badge,
  Alert,
  StatCard,
  RenderCounter,
} from '../../shared/components';

/**
 * Shopping cart view showing items and totals.
 *
 * Demonstrates:
 * - Only re-renders when cart items or checkout state changes
 * - Deep object tracking (array of cart items with nested product objects)
 * - Computed values via getters (subtotal, tax, total)
 * - Async operations with loading states
 */
export function CartView() {
  const [state, cart] = useBloc(CartBloc);

  console.log(
    `[CartView] Rendering - ${cart.itemCount} items, $${cart.total.toFixed(2)}`,
  );

  // Empty state
  if (state.items.length === 0) {
    return (
      <Card>
        <div className="stack-md" style={{ position: 'relative' }}>
          <RenderCounter name="CartView" />
          <div className="flex-between">
            <h2>Shopping Cart</h2>
            <Badge>0 items</Badge>
          </div>
          <div className="empty-state">
            <p>Your cart is empty</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="stack-md" style={{ position: 'relative' }}>
        <RenderCounter name="CartView" />

        {/* Header with item count */}
        <div className="flex-between">
          <h2>Shopping Cart</h2>
          <Badge variant="primary">{cart.itemCount} items</Badge>
        </div>

        {/* Cart items */}
        <div className="stack-sm">
          {state.items.map((item) => (
            <div key={item.product.id} className="cart-item">
              <div className="flex-between" style={{ gap: 'var(--space-md)' }}>
                {/* Product icon */}
                <div style={{ fontSize: '2rem', flexShrink: 0 }}>
                  {item.product.image}
                </div>

                {/* Product info */}
                <div className="stack-xs" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{item.product.name}</span>
                  <span className="text-small text-muted">
                    ${item.product.price.toFixed(2)} each
                  </span>
                </div>

                {/* Quantity controls */}
                <div className="row-xs">
                  <Button
                    size="small"
                    onClick={() =>
                      cart.updateQuantity(item.product.id, item.quantity - 1)
                    }
                    aria-label="Decrease quantity"
                    disabled={state.isCheckingOut}
                  >
                    −
                  </Button>
                  <span
                    style={{
                      minWidth: '2rem',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {item.quantity}
                  </span>
                  <Button
                    size="small"
                    onClick={() =>
                      cart.updateQuantity(item.product.id, item.quantity + 1)
                    }
                    aria-label="Increase quantity"
                    disabled={state.isCheckingOut}
                  >
                    +
                  </Button>
                </div>

                {/* Item total */}
                <span
                  style={{
                    fontWeight: 700,
                    minWidth: '4rem',
                    textAlign: 'right',
                  }}
                >
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>

                {/* Remove button */}
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => cart.removeFromCart(item.product.id)}
                  aria-label={`Remove ${item.product.name}`}
                  disabled={state.isCheckingOut}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart summary with stats */}
        <div className="stats-grid">
          <StatCard label="Subtotal" value={`$${cart.subtotal.toFixed(2)}`} />
          <StatCard label="Tax (8%)" value={`$${cart.tax.toFixed(2)}`} />
          <StatCard label="Total" value={`$${cart.total.toFixed(2)}`} />
        </div>

        {/* Action buttons */}
        <div className="row-sm">
          <Button
            variant="ghost"
            onClick={cart.clearCart}
            disabled={state.isCheckingOut}
            style={{ flex: 1 }}
          >
            Clear Cart
          </Button>
          <Button
            variant="success"
            onClick={cart.checkout}
            disabled={state.isCheckingOut}
            style={{ flex: 2 }}
          >
            {state.isCheckingOut ? 'Processing...' : 'Checkout'}
          </Button>
        </div>

        {/* Success/Error messages */}
        {state.checkoutComplete && (
          <Alert variant="success">
            Order placed successfully! Thank you for your purchase.
          </Alert>
        )}
        {state.error && <Alert variant="danger">{state.error}</Alert>}
      </div>
    </Card>
  );
}
