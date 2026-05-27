import { Cubit } from '@blac/core';

export interface TrackingItem {
  id: string;
  title: string;
  done: boolean;
}

export interface TrackingProfile {
  bio: string;
  joined: string;
}

export interface TrackingState {
  color: string;
  theme: 'light' | 'dark';
  version: number;
  user: {
    name: string;
    email: string;
    address: {
      city: string;
      zip: string;
    };
  };
  profile: TrackingProfile | null;
  items: TrackingItem[];
  matrix: number[][];
  unrelated: number;
}

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const CITIES = ['Berlin', 'Lisbon', 'Tokyo', 'Austin', 'Oslo', 'Reykjavik'];

const makeMatrix = (): number[][] =>
  Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => r * 10 + c)
  );

const initialState = (): TrackingState => ({
  color: PALETTE[0],
  theme: 'dark',
  version: 1,
  user: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    address: { city: 'Berlin', zip: '10115' },
  },
  profile: { bio: 'Loves analytical engines.', joined: '2024-01-01' },
  items: [
    { id: 'a', title: 'Wire up tracker', done: true },
    { id: 'b', title: 'Survive null swaps', done: false },
    { id: 'c', title: 'Track array indices', done: false },
  ],
  matrix: makeMatrix(),
  unrelated: 0,
});

export class TrackingBloc extends Cubit<TrackingState> {
  constructor() {
    super(initialState());
  }

  cycleColor = () => {
    const idx = PALETTE.indexOf(this.state.color);
    this.patch({ color: PALETTE[(idx + 1) % PALETTE.length] });
  };

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'dark' ? 'light' : 'dark' });
  };

  bumpVersion = () => {
    this.patch({ version: this.state.version + 1 });
  };

  bumpUnrelated = () => {
    this.patch({ unrelated: this.state.unrelated + 1 });
  };

  setUserName = (name: string) => {
    this.patch({ user: { ...this.state.user, name } });
  };

  setUserEmail = (email: string) => {
    this.patch({ user: { ...this.state.user, email } });
  };

  cycleCity = () => {
    const idx = CITIES.indexOf(this.state.user.address.city);
    const city = CITIES[(idx + 1) % CITIES.length];
    this.patch({
      user: {
        ...this.state.user,
        address: { ...this.state.user.address, city },
      },
    });
  };

  swapAddress = () => {
    // Replace the address object entirely — exercises nested proxy path
    // invalidation (the cached child proxy must NOT be reused with a stale path).
    this.patch({
      user: {
        ...this.state.user,
        address: {
          city: CITIES[Math.floor(Math.random() * CITIES.length)],
          zip: String(10000 + Math.floor(Math.random() * 89999)),
        },
      },
    });
  };

  clearProfile = () => {
    this.patch({ profile: null });
  };

  restoreProfile = () => {
    this.patch({
      profile: {
        bio: 'Re-hydrated profile.',
        joined: new Date().toISOString().slice(0, 10),
      },
    });
  };

  editProfileBio = (bio: string) => {
    if (!this.state.profile) return;
    this.patch({ profile: { ...this.state.profile, bio } });
  };

  toggleItem = (id: string) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    });
  };

  editItemTitle = (id: string, title: string) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, title } : item
      ),
    });
  };

  addItem = () => {
    const id = Math.random().toString(36).slice(2, 8);
    this.patch({
      items: [...this.state.items, { id, title: `Item ${id}`, done: false }],
    });
  };

  removeLastItem = () => {
    if (this.state.items.length === 0) return;
    this.patch({ items: this.state.items.slice(0, -1) });
  };

  reorderItems = () => {
    this.patch({ items: [...this.state.items].reverse() });
  };

  bumpMatrixCell = (row: number, col: number) => {
    const next = this.state.matrix.map((r) => [...r]);
    next[row][col] = next[row][col] + 1;
    this.patch({ matrix: next });
  };

  resetMatrix = () => {
    this.patch({ matrix: makeMatrix() });
  };

  reset = () => {
    this.emit(initialState());
  };

  get completedCount(): number {
    return this.state.items.filter((item) => item.done).length;
  }

  get matrixSum(): number {
    return this.state.matrix.reduce(
      (sum, row) => sum + row.reduce((a, b) => a + b, 0),
      0
    );
  }
}
