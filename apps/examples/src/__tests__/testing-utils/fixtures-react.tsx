import React from 'react';
import { useBloc } from '@blac/react';
import {
  CounterCubit,
  AuthCubit,
  SettingsCubit,
  TodoCubit,
  DashboardCubit,
  NotificationCubit,
  LoadingCubit,
} from './fixtures';

// ─── Counter component ──────────────────────────────────────────

export function Counter() {
  const [state, bloc] = useBloc(CounterCubit);
  return (
    <div>
      <span data-testid="count">{state.count}</span>
      <button onClick={bloc.increment}>+</button>
      <button onClick={bloc.decrement}>-</button>
      <button onClick={bloc.reset}>Reset</button>
    </div>
  );
}

// ─── Auth status component ──────────────────────────────────────

export function AuthStatus() {
  const [state, bloc] = useBloc(AuthCubit);
  return (
    <div>
      {state.loggedIn ? (
        <div>
          <span data-testid="user">{state.userId}</span>
          <span data-testid="role">{state.role}</span>
          <button onClick={bloc.logout}>Logout</button>
        </div>
      ) : (
        <div>
          <span data-testid="status">Not logged in</span>
          <button onClick={() => bloc.login('alice', 'admin')}>Login</button>
        </div>
      )}
    </div>
  );
}

// ─── Settings panel ─────────────────────────────────────────────

export function SettingsPanel() {
  const [state, bloc] = useBloc(SettingsCubit);
  return (
    <div>
      <span data-testid="theme">{state.theme}</span>
      <span data-testid="locale">{state.locale}</span>
      <span data-testid="notifications">
        {state.notifications ? 'on' : 'off'}
      </span>
      <button onClick={() => bloc.setTheme('dark')}>Dark mode</button>
      <button onClick={bloc.toggleNotifications}>Toggle notifs</button>
    </div>
  );
}

// ─── Todo list component ────────────────────────────────────────

export function TodoList() {
  const [state, bloc] = useBloc(TodoCubit);
  return (
    <div>
      <span data-testid="count">{state.todos.length}</span>
      <span data-testid="filter">{state.filter}</span>
      <ul>
        {state.todos.map((t) => (
          <li
            key={t.id}
            data-testid={`todo-${t.id}`}
            onClick={() => bloc.toggleTodo(t.id)}
          >
            {t.done ? '✓' : '○'} {t.text}
          </li>
        ))}
      </ul>
      <button onClick={() => bloc.addTodo('New task')}>Add</button>
    </div>
  );
}

// ─── Dashboard (multi-dependency component) ─────────────────────

export function Dashboard() {
  const [state, bloc] = useBloc(DashboardCubit);
  return (
    <div>
      <span data-testid="loaded">{state.loaded ? 'yes' : 'no'}</span>
      <span data-testid="greeting">{state.greeting}</span>
      <button onClick={bloc.loadDashboard}>Load</button>
    </div>
  );
}

// ─── Notification badge ─────────────────────────────────────────

export function NotificationBadge() {
  const [state, bloc] = useBloc(NotificationCubit);
  return (
    <div>
      <span data-testid="unread">{state.unreadCount}</span>
      <span data-testid="messages">{state.messages.join(', ')}</span>
      <button onClick={bloc.loadNotifications}>Load</button>
      <button onClick={bloc.markAllRead}>Mark read</button>
    </div>
  );
}

// ─── Loading indicator (primitive state) ────────────────────────

export function LoadingIndicator() {
  const [isLoading] = useBloc(LoadingCubit);
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'Loading...' : 'Ready'}</span>
    </div>
  );
}
