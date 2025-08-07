import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit, Blac } from '@blac/core';

// Auth Cubit - Shared globally
interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  isLoading: boolean;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  userName: null,
  isLoading: false,
};

class AuthCubit extends Cubit<AuthState> {
  // Shared by default (no static isolated = true)
  constructor() {
    super(initialAuthState);
  }

  login = async (userName: string) => {
    this.patch({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call
    this.patch({ isAuthenticated: true, userName, isLoading: false });
  };

  logout = async () => {
    this.patch({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call
    this.patch({
      isAuthenticated: false,
      userName: null,
      isLoading: false,
    });
  };

  get currentUserName(): string | null {
    return this.state.userName;
  }
}

// Dashboard Stats Cubit - Isolated, but accesses shared AuthCubit
interface DashboardStatsState {
  statsMessage: string;
  isLoading: boolean;
  lastLoadedForUser: string | null;
}

const initialStatsState: DashboardStatsState = {
  statsMessage: 'No stats loaded yet.',
  isLoading: false,
  lastLoadedForUser: null,
};

class DashboardStatsCubit extends Cubit<DashboardStatsState> {
  static isolated = true; // Each instance gets its own stats cubit

  constructor() {
    super(initialStatsState);
  }

  loadDashboard = async () => {
    this.patch({ isLoading: true, statsMessage: 'Loading dashboard data...' });
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

    let userName: string | null = 'Guest (Auth Unavailable)';
    let isAuthenticated = false;

    try {
      // Bloc-to-Bloc communication: Access the shared AuthCubit
      const authCubit = Blac.getBloc(AuthCubit, { throwIfNotFound: true });
      isAuthenticated = authCubit.state.isAuthenticated;
      userName =
        authCubit.state.userName ||
        (isAuthenticated ? 'Authenticated User (No Name)' : 'Guest');
    } catch (error) {
      console.warn(
        `DashboardStatsCubit: Error getting AuthCubit - ${(error as Error).message}. Assuming guest.`,
      );
    }

    if (isAuthenticated) {
      this.patch({
        statsMessage: `Showing personalized stats for ${userName}. Total Sales: $${Math.floor(
          Math.random() * 10000,
        )}. Active Users: ${Math.floor(Math.random() * 100)}.`,
        isLoading: false,
        lastLoadedForUser: userName,
      });
    } else {
      this.patch({
        statsMessage: `Showing generic stats for ${userName}. Please log in for personalized data.`,
        isLoading: false,
        lastLoadedForUser: 'Guest',
      });
    }
  };

  resetStats = () => {
    this.emit(initialStatsState);
  };
}

// Notification Cubit - Subscribes to AuthCubit changes
interface NotificationState {
  messages: string[];
  unreadCount: number;
}

class NotificationCubit extends Cubit<NotificationState> {
  private authSubscription?: () => void;

  constructor() {
    super({ messages: [], unreadCount: 0 });
    this.subscribeToAuth();
  }

  private subscribeToAuth = () => {
    try {
      const authCubit = Blac.getBloc(AuthCubit, { throwIfNotFound: false });
      if (authCubit) {
        // Subscribe to auth state changes
        this.authSubscription = authCubit.subscribe((authState) => {
          if (authState.isAuthenticated && authState.userName) {
            this.addMessage(`Welcome back, ${authState.userName}!`);
          } else if (!authState.isAuthenticated) {
            this.addMessage('You have been logged out.');
          }
        });
      }
    } catch (error) {
      console.warn('NotificationCubit: Could not subscribe to AuthCubit');
    }
  };

  addMessage = (message: string) => {
    this.patch({
      messages: [...this.state.messages, message],
      unreadCount: this.state.unreadCount + 1,
    });
  };

  clearMessages = () => {
    this.patch({ messages: [], unreadCount: 0 });
  };

  markAsRead = () => {
    this.patch({ unreadCount: 0 });
  };

  onDispose = () => {
    if (this.authSubscription) {
      this.authSubscription();
    }
  };
}

// Demo Component
export const BlocCommunicationDemo: React.FC = () => {
  const [authState, authCubit] = useBloc(AuthCubit);
  const [dashboardState, dashboardCubit] = useBloc(DashboardStatsCubit);
  const [notificationState, notificationCubit] = useBloc(NotificationCubit);
  const [userNameInput, setUserNameInput] = useState('DemoUser');

  const handleLogin = () => {
    if (userNameInput.trim()) {
      authCubit.login(userNameInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Auth Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Authentication Control</h3>
        {authState.isLoading && (
          <p className="text-gray-500">Auth loading...</p>
        )}
        {authState.isAuthenticated ? (
          <div className="space-y-3">
            <p>
              Logged in as:{' '}
              <strong className="text-green-600 dark:text-green-400">
                {authState.userName}
              </strong>
            </p>
            <button
              onClick={authCubit.logout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Username:
              </label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter username"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={authState.isLoading || !userNameInput.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login
            </button>
            <p className="text-gray-500 text-sm">Not logged in.</p>
          </div>
        )}
      </div>

      {/* Dashboard Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dashboard Stats</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={dashboardCubit.loadDashboard}
              disabled={dashboardState.isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dashboardState.isLoading
                ? 'Loading Stats...'
                : 'Load/Refresh Dashboard Stats'}
            </button>
            <button
              onClick={dashboardCubit.resetStats}
              disabled={dashboardState.isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Stats View
            </button>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p>
              <strong>Stats:</strong> {dashboardState.statsMessage}
            </p>
            {dashboardState.lastLoadedForUser && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Last loaded for: {dashboardState.lastLoadedForUser}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Notifications
            {notificationState.unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {notificationState.unreadCount}
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={notificationCubit.markAsRead}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
            >
              Mark as Read
            </button>
            <button
              onClick={notificationCubit.clearMessages}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {notificationState.messages.length === 0 ? (
            <p className="text-gray-500">No notifications</p>
          ) : (
            notificationState.messages.map((message, index) => (
              <div
                key={index}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm"
              >
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">
          How Bloc-to-Bloc Communication Works
        </h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Shared AuthCubit:</strong> The authentication state is
            shared globally across all components
          </li>
          <li>
            <strong>Isolated DashboardStatsCubit:</strong> Each instance is
            isolated but can access the shared AuthCubit using{' '}
            <code>Blac.getBloc(AuthCubit)</code>
          </li>
          <li>
            <strong>NotificationCubit:</strong> Subscribes to AuthCubit changes
            and reacts to authentication events
          </li>
          <li>
            <strong>Communication Pattern:</strong> Blocs can access other
            Blocs' state and subscribe to their changes
          </li>
          <li>
            <strong>Use Cases:</strong> User authentication affecting multiple
            features, global app state, cross-feature coordination
          </li>
        </ul>
      </div>
    </div>
  );
};
