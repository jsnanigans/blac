import { Cubit } from '@blac/core';

export interface UserArgs {
  userId: string;
}

export interface UserCardState {
  userId: string;
  displayName: string;
  likes: number;
  online: boolean;
}

/**
 * Cubit keyed by userId via args.
 * Two components passing the same userId share the same instance and state.
 * Different userIds get distinct instances with independent state.
 */
export class UserCardCubit extends Cubit<UserCardState, UserArgs> {
  static key = (args: UserArgs) => args.userId;

  constructor() {
    super({ userId: '', displayName: '', likes: 0, online: false });
  }

  protected override init(args: UserArgs): void {
    const names: Record<string, string> = {
      alice: 'Alice Nakamura',
      bob: 'Bob Chen',
      carol: 'Carol Rivera',
    };
    this.emit({
      userId: args.userId,
      displayName: names[args.userId] ?? args.userId,
      likes: 0,
      online: true,
    });
  }

  like = () => {
    this.patch({ likes: this.state.likes + 1 });
  };

  toggleOnline = () => {
    this.patch({ online: !this.state.online });
  };
}
