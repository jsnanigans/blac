import { Cubit } from '@blac/core';
import type { AccountState } from './AccountContainer';

/**
 * The same state as a `Cubit`. Identical behaviour, one difference that
 * matters: `emit` / `patch` / `update` are public, so any caller can drive a
 * transition the class never sanctioned — including into an invalid state.
 */
export class LooseAccountCubit extends Cubit<AccountState> {
  constructor() {
    super({
      balanceCents: 5_000,
      history: ['opened with $50.00'],
      lastError: null,
    });
  }
}
