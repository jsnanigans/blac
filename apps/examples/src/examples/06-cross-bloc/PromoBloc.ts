import { Cubit } from '@blac/core';

export type MembershipTier = 'none' | 'silver' | 'gold';

export interface PromoState {
  tier: MembershipTier;
}

export const TIER_DISCOUNT: Record<MembershipTier, number> = {
  none: 0,
  silver: 0.1,
  gold: 0.2,
};

export const TIER_LABEL: Record<MembershipTier, string> = {
  none: 'No membership',
  silver: 'Silver · 10% off',
  gold: 'Gold · 20% off',
};

export const TIERS: MembershipTier[] = ['none', 'silver', 'gold'];

export class PromoBloc extends Cubit<PromoState> {
  constructor() {
    super({ tier: 'none' });
  }

  setTier = (tier: MembershipTier) => this.emit({ tier });
}
