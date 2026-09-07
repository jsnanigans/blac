import { useBloc } from '@blac/react';
import {
  Card,
  Badge,
  Button,
  StatCard,
  RenderCounter,
} from '../../shared/components';
import { CheckoutBloc } from './CheckoutBloc';

/**
 * The star of the demo. It subscribes to ONE bloc — CheckoutBloc — yet stays
 * live against the cart, the FX feed, and the membership tier. Reading
 * `checkout.receipt` runs the getter through this consumer's tracking proxy,
 * and every `this.<handle>.track()` inside it wires up the subscription.
 */
export function Receipt() {
  const [, checkout] = useBloc(CheckoutBloc);
  const r = checkout.receipt;

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="Receipt" />
        <div className="flex-between">
          <h3>Order total</h3>
          <Badge variant={r.liveFx ? 'success' : 'warning'}>
            {r.liveFx ? 'FX live' : 'FX frozen'}
          </Badge>
        </div>

        <div className="counter-display">${r.totalUsd.toFixed(2)}</div>

        <div className="grid grid-cols-3 gap-sm">
          <StatCard label="Subtotal" value={`€${r.subtotalEur.toFixed(2)}`} />
          <StatCard
            label="Discount"
            value={`${Math.round(r.discountPct * 100)}%`}
          />
          <StatCard label="EUR→USD" value={r.usdPerEur.toFixed(4)} />
        </div>

        <Button
          variant="ghost"
          onClick={checkout.toggleLiveFx}
          style={{ marginTop: 12 }}
        >
          {r.liveFx ? 'Freeze FX rate' : 'Resume live FX'}
        </Button>

        <p className="text-xs text-muted" style={{ marginTop: 8 }}>
          Subscribed to <code>CheckoutBloc</code> only. Watch the render badge
          bump when the cart, FX feed, or membership change — no extra{' '}
          <code>useBloc</code> calls.
        </p>
      </div>
    </Card>
  );
}
