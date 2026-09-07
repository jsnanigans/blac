import { StateContainer } from '@blac/core';

export interface AccountState {
  balanceCents: number;
  history: string[];
  lastError: string | null;
}

/**
 * A `StateContainer` keeps `emit` / `patch` / `update` protected, so the only
 * way to change an account balance is to go through a method that enforces the
 * rules. Callers cannot reach past `withdraw()` to set a negative balance.
 */
export class AccountContainer extends StateContainer<AccountState> {
  constructor() {
    super({
      balanceCents: 5_000,
      history: ['opened with $50.00'],
      lastError: null,
    });
  }

  deposit = (cents: number) => {
    if (cents <= 0) return this.fail('Deposit must be positive');
    this.commit(this.state.balanceCents + cents, `deposit ${format(cents)}`);
  };

  withdraw = (cents: number) => {
    if (cents <= 0) return this.fail('Withdrawal must be positive');
    if (cents > this.state.balanceCents) {
      return this.fail(`Insufficient funds for ${format(cents)}`);
    }
    this.commit(this.state.balanceCents - cents, `withdraw ${format(cents)}`);
  };

  private commit(balanceCents: number, entry: string) {
    this.patch({
      balanceCents,
      history: [...this.state.history, entry].slice(-6),
      lastError: null,
    });
  }

  private fail(message: string) {
    this.patch({ lastError: message });
  }

  get balance(): string {
    return format(this.state.balanceCents);
  }
}

function format(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
