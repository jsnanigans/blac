import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import {
  User,
  BarChart3,
  Bell,
  Share2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
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
  private authSubscription?: { unsubscribe: () => void };

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
      this.authSubscription.unsubscribe();
    }
  };
}

// ============================================================================
// Demo Component
// ============================================================================

export const BlocCompositionDemo: React.FC = () => {
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
    <DemoArticle
      metadata={{
        id: 'bloc-composition',
        title: 'Bloc Composition & Communication',
        description:
          'Learn how multiple Blocs work together, share state, and communicate through subscriptions',
        category: '03-advanced',
        difficulty: 'advanced',
        tags: [
          'composition',
          'communication',
          'shared-state',
          'subscriptions',
          'architecture',
        ],
        estimatedTime: 25,
      }}
    >
      {/* Introduction Section */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Composing Multiple Blocs</h2>
          <p>
            Real applications rarely use a single Bloc in isolation. More often,
            you'll have multiple Blocs working together: user authentication,
            feature-specific state, notifications, analytics, and more. This
            demo shows the patterns for composing Blocs and enabling them to
            communicate.
          </p>
          <p>
            BlaC supports three key patterns for Bloc composition:
          </p>
          <ul>
            <li>
              <strong>Shared State:</strong> Multiple components access the same
              Bloc instance (default behavior)
            </li>
            <li>
              <strong>Cross-Bloc Access:</strong> One Bloc reads another Bloc's
              state using <code>Blac.getBloc()</code>
            </li>
            <li>
              <strong>Reactive Subscriptions:</strong> One Bloc subscribes to
              another's state changes
            </li>
          </ul>
        </Prose>

        <ConceptCallout type="info" title="Architecture Pattern">
          <p className="text-sm">
            Think of Blocs as domain-specific state containers. AuthCubit
            handles authentication, DashboardStatsCubit handles dashboard logic,
            and NotificationCubit handles notifications. They collaborate but
            remain focused on their own responsibilities.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Interactive Demo Section */}
      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Demo: Three Blocs Working Together</h2>
          <p>
            This demo features three Cubits that communicate with each other.
            Notice how logging in or out affects all three sections:
          </p>
        </Prose>

        <div className="space-y-6 not-prose">
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
                  variant="ghost"
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

            <ConceptCallout type="tip" title="Cross-Bloc Access">
              <p className="text-xs">
                This Cubit uses <code>Blac.getBloc(AuthCubit)</code> to access
                the shared authentication state when loading stats.
              </p>
            </ConceptCallout>
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
                  variant="ghost"
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

            <ConceptCallout type="tip" title="Reactive Subscriptions">
              <p className="text-xs">
                This Cubit uses <code>authCubit.subscribe()</code> to
                automatically react to authentication events.
              </p>
            </ConceptCallout>
          </motion.div>
        </div>

        <ConceptCallout type="success" title="Try It Out!">
          <p className="text-sm">
            <strong>Experiment:</strong> Log in and watch how the dashboard
            loads personalized stats and notifications appear automatically. Log
            out and see both sections react to the change. This is the power of
            Bloc composition!
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation Section */}
      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementation Patterns</h2>
        </Prose>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Pattern 1: Shared State Access
            </h3>
            <Prose>
              <p>
                By default, Cubits are shared across all consumers. Multiple
                components can access the same instance.
              </p>
            </Prose>
            <CodePanel
              code={`// AuthCubit is shared by default
class AuthCubit extends Cubit<AuthState> {
  // No static isolated = true
  constructor() {
    super({ isAuthenticated: false, userName: null });
  }

  login = async (userName: string) => {
    this.patch({ isAuthenticated: true, userName });
  };
}

// Multiple components access the same instance
function Component1() {
  const [state] = useBloc(AuthCubit);
  return <div>{state.userName}</div>;
}

function Component2() {
  const [state, cubit] = useBloc(AuthCubit); // Same instance!
  return <button onClick={() => cubit.login('User')}>Login</button>;
}`}
              language="typescript"
              lineLabels={{
                1: 'Shared Cubit',
                2: 'Default behavior',
                14: 'Component 1',
                15: 'Gets shared instance',
                19: 'Component 2',
                20: 'Gets same instance',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Pattern 2: Cross-Bloc Access
            </h3>
            <Prose>
              <p>
                One Bloc can access another Bloc's state using{' '}
                <code>Blac.getBloc()</code>. This is useful for reading shared
                state from other domains.
              </p>
            </Prose>
            <CodePanel
              code={`class DashboardStatsCubit extends Cubit<DashboardState> {
  static isolated = true; // Each instance is isolated

  loadDashboard = async () => {
    try {
      // Access the shared AuthCubit
      const authCubit = Blac.getBloc(AuthCubit, {
        throwIfNotFound: true
      });

      // Read its state
      const userName = authCubit.state.userName;
      const isAuth = authCubit.state.isAuthenticated;

      // Use the auth state to load appropriate data
      if (isAuth) {
        this.patch({
          stats: \`Personalized stats for \${userName}\`
        });
      } else {
        this.patch({ stats: 'Generic guest stats' });
      }
    } catch (error) {
      // Handle case where AuthCubit doesn't exist
      console.warn('AuthCubit not found');
    }
  };
}`}
              language="typescript"
              lineLabels={{
                2: 'Isolated instance',
                6: 'Get shared Cubit',
                7: 'Throw if not found',
                11: 'Read auth state',
                15: 'Use auth data',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Pattern 3: Reactive Subscriptions
            </h3>
            <Prose>
              <p>
                For reactive behavior, one Bloc can subscribe to another's state
                changes. This is perfect for side effects and cross-feature
                coordination.
              </p>
            </Prose>
            <CodePanel
              code={`class NotificationCubit extends Cubit<NotificationState> {
  private authSubscription?: () => void;

  constructor() {
    super({ messages: [], unreadCount: 0 });
    this.subscribeToAuth();
  }

  private subscribeToAuth = () => {
    const authCubit = Blac.getBloc(AuthCubit, {
      throwIfNotFound: false
    });

    if (authCubit) {
      // Subscribe to auth state changes
      this.authSubscription = authCubit.subscribe((authState) => {
        if (authState.isAuthenticated) {
          this.addMessage(\`Welcome, \${authState.userName}!\`);
        } else {
          this.addMessage('You have been logged out.');
        }
      });
    }
  };

  addMessage = (message: string) => {
    this.patch({
      messages: [...this.state.messages, message],
      unreadCount: this.state.unreadCount + 1
    });
  };

  onDispose = () => {
    // CRITICAL: Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription();
    }
  };
}`}
              language="typescript"
              lineLabels={{
                2: 'Store subscription',
                6: 'Subscribe in constructor',
                10: 'Get auth cubit',
                16: 'Subscribe callback',
                17: 'React to login',
                19: 'React to logout',
                34: 'Cleanup on dispose',
                35: 'Unsubscribe',
              }}
            />
            <ConceptCallout type="warning" title="Memory Leak Warning">
              <p className="text-sm">
                Always unsubscribe in <code>onDispose()</code> to prevent memory
                leaks! The subscription callback is called <code>subscribe()</code>{' '}
                returns an unsubscribe function.
              </p>
            </ConceptCallout>
          </div>
        </div>
      </ArticleSection>

      {/* Architecture Section */}
      <ArticleSection theme="cubit" id="architecture">
        <Prose>
          <h2>Architectural Considerations</h2>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConceptCallout type="success" title="Best Practices">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Keep Blocs focused on single responsibilities</li>
              <li>Use shared Blocs for global state (auth, settings)</li>
              <li>Use isolated Blocs for feature-specific state</li>
              <li>Prefer cross-bloc access for one-time reads</li>
              <li>Use subscriptions for reactive side effects</li>
              <li>Always clean up subscriptions in onDispose</li>
            </ul>
          </ConceptCallout>

          <ConceptCallout type="warning" title="Anti-Patterns">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Circular dependencies between Blocs</li>
              <li>Too many subscriptions (performance impact)</li>
              <li>Forgetting to unsubscribe (memory leaks)</li>
              <li>Deep Bloc dependency chains (hard to test)</li>
              <li>Using Blocs for component-local state</li>
              <li>Accessing non-existent Blocs without error handling</li>
            </ul>
          </ConceptCallout>
        </div>

        <Prose>
          <h3>When to Use Each Pattern</h3>
        </Prose>

        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Shared State Access
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Use for: User authentication, app settings, global UI state,
              feature flags
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Cross-Bloc Access
            </h4>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Use for: Loading data based on auth state, reading user
              preferences, accessing configuration, permission checks
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Reactive Subscriptions
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Use for: Notifications, analytics events, logging, cache
              invalidation, syncing related features
            </p>
          </div>
        </div>
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Multiple Blocs in one component:</strong> Use{' '}
              <code>useBloc</code> multiple times to compose features
            </li>
            <li>
              <strong>Shared vs Isolated:</strong> Shared Blocs are global,
              isolated Blocs are per-consumer
            </li>
            <li>
              <strong>Cross-Bloc Access:</strong> Use{' '}
              <code>Blac.getBloc()</code> to read other Blocs' state
            </li>
            <li>
              <strong>Reactive Subscriptions:</strong> Use{' '}
              <code>bloc.subscribe()</code> for automatic reactions
            </li>
            <li>
              <strong>Memory Management:</strong> Always unsubscribe in{' '}
              <code>onDispose()</code>
            </li>
            <li>
              <strong>Architecture:</strong> Keep Blocs focused, avoid circular
              dependencies
            </li>
          </ul>
        </ConceptCallout>

        <Prose>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">
            Bloc composition enables powerful architectural patterns. By
            combining shared state, cross-bloc access, and reactive
            subscriptions, you can build complex applications with clean
            separation of concerns and maintainable code.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
};
