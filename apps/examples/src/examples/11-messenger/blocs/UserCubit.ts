import { Cubit } from '@blac/core';
import type { User } from '../types';
import { MOCK_USERS } from '../mockData';

/**
 * User profile state - shared instances (one per user)
 * Keyed by userId via args identity.
 *
 * Demonstrates shared instance pattern - multiple components can share
 * the same user instance without duplication
 */
export type UserArgs = { userId: string };

export class UserCubit extends Cubit<User, UserArgs> {
  static key = (a: UserArgs) => a.userId;

  constructor() {
    super({
      id: '',
      name: '',
      avatar: '',
      status: 'offline',
      customStatus: undefined,
    });
  }

  protected override init({ userId }: UserArgs): void {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) {
      this.patch(user);
    }
  }

  setUserId = (userId: string) => {
    // No-op if same userId
    if (this.state.id === userId) return;

    // Lookup user from mock data
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found in mock data`);
    }
    this.patch(user);
  };

  setStatus = (status: User['status']) => {
    this.patch({ status });
  };

  setCustomStatus = (customStatus: string) => {
    this.patch({ customStatus });
  };

  updateAvatar = (avatar: string) => {
    this.patch({ avatar });
  };
}
