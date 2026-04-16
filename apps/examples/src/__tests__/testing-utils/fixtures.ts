import { Cubit } from '@blac/core';

// ─── Simple counter ──────────────────────────────────────────────

export class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };

  addAmount = (amount: number) => {
    this.emit({ count: this.state.count + amount });
  };
}

// ─── Auth bloc (common dependency) ──────────────────────────────

export interface AuthState {
  loggedIn: boolean;
  userId: string;
  role: 'admin' | 'user' | 'guest';
}

export class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ loggedIn: false, userId: '', role: 'guest' });
  }

  login = (userId: string, role: AuthState['role'] = 'user') => {
    this.emit({ loggedIn: true, userId, role });
  };

  logout = () => {
    this.emit({ loggedIn: false, userId: '', role: 'guest' });
  };
}

// ─── Settings bloc ──────────────────────────────────────────────

export interface SettingsState {
  theme: 'light' | 'dark';
  locale: string;
  notifications: boolean;
}

export class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    super({ theme: 'light', locale: 'en', notifications: true });
  }

  setTheme = (theme: SettingsState['theme']) => {
    this.patch({ theme });
  };

  setLocale = (locale: string) => {
    this.patch({ locale });
  };

  toggleNotifications = () => {
    this.emit({ ...this.state, notifications: !this.state.notifications });
  };
}

// ─── Todo bloc (complex state) ──────────────────────────────────

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

export class TodoCubit extends Cubit<TodoState> {
  private nextId = 0;

  constructor() {
    super({ todos: [], filter: 'all' });
  }

  addTodo = (text: string) => {
    this.emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        { id: `todo-${this.nextId++}`, text, done: false },
      ],
    });
  };

  toggleTodo = (id: string) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    });
  };

  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };

  get activeTodos() {
    return this.state.todos.filter((t) => !t.done);
  }

  get completedTodos() {
    return this.state.todos.filter((t) => t.done);
  }
}

// ─── Dashboard bloc (depends on Auth + Settings) ────────────────

export interface DashboardState {
  loaded: boolean;
  greeting: string;
}

export class DashboardCubit extends Cubit<DashboardState> {
  getAuth = this.depend(AuthCubit);
  getSettings = this.depend(SettingsCubit);

  constructor() {
    super({ loaded: false, greeting: '' });
  }

  loadDashboard = () => {
    const auth = this.getAuth();
    const settings = this.getSettings();
    const name = auth.state.loggedIn ? auth.state.userId : 'Guest';
    const locale = settings.state.locale;
    this.emit({
      loaded: true,
      greeting: `Hello ${name} (${locale})`,
    });
  };
}

// ─── Notification bloc (depends on Auth) ────────────────────────

export interface NotificationState {
  messages: string[];
  unreadCount: number;
}

export class NotificationCubit extends Cubit<NotificationState> {
  getAuth = this.depend(AuthCubit);

  constructor() {
    super({ messages: [], unreadCount: 0 });
  }

  loadNotifications = () => {
    const auth = this.getAuth();
    if (!auth.state.loggedIn) {
      this.emit({ messages: [], unreadCount: 0 });
      return;
    }
    this.emit({
      messages: [`Welcome back, ${auth.state.userId}!`],
      unreadCount: 1,
    });
  };

  markAllRead = () => {
    this.patch({ unreadCount: 0 });
  };
}

// ─── Primitive state cubit ──────────────────────────────────────

export class LoadingCubit extends Cubit<{ loading: boolean }> {
  constructor() {
    super({ loading: false });
  }

  start = () => this.emit({ loading: true });
  stop = () => this.emit({ loading: false });
}

// ─── Async cubit ────────────────────────────────────────────────

export interface AsyncDataState {
  data: string | null;
  loading: boolean;
  error: string | null;
}

export class AsyncDataCubit extends Cubit<AsyncDataState> {
  constructor() {
    super({ data: null, loading: false, error: null });
  }

  fetchData = async () => {
    this.patch({ loading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.patch({ data: 'fetched', loading: false });
    } catch {
      this.patch({ error: 'failed', loading: false });
    }
  };
}
