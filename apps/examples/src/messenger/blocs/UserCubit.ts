import { Cubit } from '@blac/core';
import type { User } from '../types';
import { MOCK_USERS } from '../mockData';

/**
 * User profile state - shared instances (one per user)
 * instanceKey: userId
 *
 * Demonstrates shared instance pattern - multiple components can share
 * the same user instance without duplication
 */
export class UserCubit extends Cubit<User> {
  constructor(props?: { userId: string }) {
    const user = MOCK_USERS.find((u) => u.id === props?.userId);
    if (!user) {
      throw new Error('UserCubit requires user to be passed via staticProps');
    }
    super(user);
  }

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
