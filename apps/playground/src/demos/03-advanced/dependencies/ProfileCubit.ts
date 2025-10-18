import { Cubit } from '@blac/core';

export interface ProfileState {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  lastUpdated: string;
}

export class ProfileCubit extends Cubit<ProfileState> {
  static isolated = true;

  constructor() {
    super({
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
      stats: {
        posts: 42,
        followers: 1337,
        following: 256,
      },
      lastUpdated: new Date().toISOString(),
    });
  }

  // Computed getter - demonstrates getter tracking
  get fullName(): string {
    return `${this.state.user.firstName} ${this.state.user.lastName}`;
  }

  // Computed getter - demonstrates value-based comparison
  get followerRatio(): string {
    const ratio = this.state.stats.followers / this.state.stats.following;
    return ratio.toFixed(2);
  }

  updateFirstName = (firstName: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, firstName },
      lastUpdated: new Date().toISOString(),
    });
  };

  updateLastName = (lastName: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, lastName },
      lastUpdated: new Date().toISOString(),
    });
  };

  updateEmail = (email: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, email },
      lastUpdated: new Date().toISOString(),
    });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light',
      },
      lastUpdated: new Date().toISOString(),
    });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        notifications: !this.state.settings.notifications,
      },
      lastUpdated: new Date().toISOString(),
    });
  };

  incrementPosts = () => {
    this.emit({
      ...this.state,
      stats: { ...this.state.stats, posts: this.state.stats.posts + 1 },
      lastUpdated: new Date().toISOString(),
    });
  };

  incrementFollowers = () => {
    this.emit({
      ...this.state,
      stats: {
        ...this.state.stats,
        followers: this.state.stats.followers + 10,
      },
      lastUpdated: new Date().toISOString(),
    });
  };

  incrementFollowing = () => {
    this.emit({
      ...this.state,
      stats: {
        ...this.state.stats,
        following: this.state.stats.following + 5,
      },
      lastUpdated: new Date().toISOString(),
    });
  };

  updateEverything = () => {
    this.emit({
      user: {
        firstName: this.state.user.firstName === 'John' ? 'Jane' : 'John',
        lastName: this.state.user.lastName === 'Doe' ? 'Smith' : 'Doe',
        email:
          this.state.user.email === 'john@example.com'
            ? 'jane@example.com'
            : 'john@example.com',
      },
      settings: {
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light',
        notifications: !this.state.settings.notifications,
      },
      stats: {
        posts: this.state.stats.posts + 10,
        followers: this.state.stats.followers + 100,
        following: this.state.stats.following + 50,
      },
      lastUpdated: new Date().toISOString(),
    });
  };
}
