import { Button } from '@/ui/Button';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { User, BarChart3, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';

// ============================================================================
// State Interfaces
// ============================================================================

interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  isLoading: boolean;
}

interface DashboardStatsState {
  statsMessage: string;
  isLoading: boolean;
  lastLoadedForUser: string | null;
}

interface NotificationState {
  messages: string[];
  unreadCount: number;
}

// ============================================================================
// AuthCubit - Shared globally
// ============================================================================

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

// ============================================================================
// DashboardStatsCubit - Isolated, but accesses shared AuthCubit
// ============================================================================

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

// ============================================================================
// NotificationCubit - Subscribes to AuthCubit changes
// ============================================================================

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

// ============================================================================
// Interactive Demo Component
// ============================================================================

export function BlocCompositionInteractive() {
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
    <div className="my-8 space-y-6 not-prose">
      {/* Auth Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">
            1. Authentication Control (Shared)
          </h3>
        </div>

        {authState.isLoading && (
          <p className="text-gray-500 mb-3">Auth loading...</p>
        )}

        {authState.isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p>
                Logged in as:{' '}
                <strong className="text-green-600 dark:text-green-400">
                  {authState.userName}
                </strong>
              </p>
            </div>
            <Button
              onClick={authCubit.logout}
              variant="danger"
              className="w-full"
            >
              Logout
            </Button>
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
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600
                  focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Enter username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userNameInput.trim()) {
                    handleLogin();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={authState.isLoading || !userNameInput.trim()}
              variant="primary"
              className="w-full"
            >
              Login
            </Button>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Not logged in.
            </p>
          </div>
        )}
      </motion.div>

      {/* Dashboard Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-purple-200 dark:border-purple-800"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">
            2. Dashboard Stats (Isolated + Accesses Auth)
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={dashboardCubit.loadDashboard}
              disabled={dashboardState.isLoading}
              variant="primary"
              className="flex-1"
            >
              {dashboardState.isLoading
                ? 'Loading Stats...'
                : 'Load/Refresh Dashboard'}
            </Button>
            <Button
              onClick={dashboardCubit.resetStats}
              disabled={dashboardState.isLoading}
              variant="muted"
            >
              Reset
            </Button>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-md">
            <p className="text-sm">
              <strong>Stats:</strong> {dashboardState.statsMessage}
            </p>
            {dashboardState.lastLoadedForUser && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Last loaded for: {dashboardState.lastLoadedForUser}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 relative overflow-hidden rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-3">
          <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
            💡 Cross-Bloc Access
          </p>
          <p className="text-xs text-purple-800 dark:text-purple-200">
            This Cubit uses <code className="bg-white/50 dark:bg-black/20 px-1 rounded">Blac.getBloc(AuthCubit)</code> to access
            the shared authentication state when loading stats.
          </p>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-amber-200 dark:border-amber-800"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold">
              3. Notifications (Subscribes to Auth)
              {notificationState.unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {notificationState.unreadCount}
                </span>
              )}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={notificationCubit.markAsRead}
              variant="muted"
              className="text-xs"
            >
              Mark Read
            </Button>
            <Button
              onClick={notificationCubit.clearMessages}
              variant="danger"
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {notificationState.messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No notifications</p>
          ) : (
            notificationState.messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-md text-sm border border-amber-200 dark:border-amber-700"
              >
                {message}
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-3 relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
            💡 Reactive Subscriptions
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            This Cubit uses <code className="bg-white/50 dark:bg-black/20 px-1 rounded">authCubit.subscribe()</code> to
            automatically react to authentication events.
          </p>
        </div>
      </motion.div>

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Try It Out!
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Experiment:</strong> Log in and watch how the dashboard
            loads personalized stats and notifications appear automatically. Log
            out and see both sections react to the change. This is the power of
            Bloc composition!
          </p>
        </div>
      </div>
    </div>
  );
}
