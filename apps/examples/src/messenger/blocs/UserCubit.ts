import { Cubit } from '@blac/core';
import type { User } from '../types';

/**
 * User profile state - shared instances (one per user)
 * instanceKey: userId
 *
 * Demonstrates shared instance pattern - multiple components can share
 * the same user instance without duplication
 */
export class UserCubit extends Cubit<User> {
  constructor(props?: { user: User }) {
    if (!props?.user) {
      throw new Error('UserCubit requires user to be passed via staticProps');
    }
    super(props.user);
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
