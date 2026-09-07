import { useBloc } from '@blac/react';
import { Card, Button, RenderCounter } from '../../shared/components';
import { CartBloc, CART_CATALOG } from './CartBloc';

/**
 * Edits the cart. Subscribes only to CartBloc — it never re-renders when the FX
 * feed ticks or the membership tier changes, because those slices aren't part
 * of what it reads (path-scoped tracking).
 */
export function CartEditor() {
  const [cart, bloc] = useBloc(CartBloc);

  return (
    <Card title="Cart" subtitle="Quantities feed the receipt subtotal">
      <div style={{ position: 'relative' }}>
        <RenderCounter name="CartEditor" />
        <div className="stack-sm">
          {cart.lines.map((line) => (
            <div key={line.id} className="flex-between">
              <div>
                <div className="text-bold">{line.name}</div>
                <div className="text-xs text-muted">€{line.priceEur} each</div>
              </div>
              <div className="counter-controls">
                <Button
                  size="small"
                  onClick={() => bloc.setQty(line.id, line.qty - 1)}
                >
                  −
                </Button>
                <span
                  className="text-bold"
                  style={{ minWidth: 24, textAlign: 'center' }}
                >
                  {line.qty}
                </span>
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => bloc.setQty(line.id, line.qty + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="stack-xs" style={{ marginTop: 12 }}>
          <span className="text-small text-muted">Add product</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CART_CATALOG.map((product) => (
              <Button
                key={product.id}
                size="small"
                variant="ghost"
                onClick={() => bloc.addProduct(product.id)}
              >
                + {product.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
