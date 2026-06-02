import { useBloc } from '@blac/react';
import { Card, Button, RenderCounter } from '../../shared/components';
import { PromoBloc, TIER_LABEL, TIERS } from './PromoBloc';

/**
 * Picks the membership tier. Subscribes only to PromoBloc; stays still while
 * the FX feed ticks or the cart changes.
 */
export function PromoPicker() {
  const [promo, bloc] = useBloc(PromoBloc);

  return (
    <Card title="Membership" subtitle="Tier sets the checkout discount">
      <div style={{ position: 'relative' }}>
        <RenderCounter name="PromoPicker" />
        <div className="stack-sm">
          {TIERS.map((tier) => (
            <Button
              key={tier}
              variant={promo.tier === tier ? 'primary' : 'ghost'}
              onClick={() => bloc.setTier(tier)}
            >
              {TIER_LABEL[tier]}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
