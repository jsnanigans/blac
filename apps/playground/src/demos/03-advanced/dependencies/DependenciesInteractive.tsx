import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { Workflow, Target, Zap, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

// ============================================================================
// State and Cubit
// ============================================================================

interface UserState {
  profile: {
    name: string;
    email: string;
    avatar: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  lastUpdated: number;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      profile: {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '👤',
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
      stats: {
        posts: 42,
        followers: 1337,
        following: 256,
      },
      lastUpdated: Date.now(),
    });
  }

  updateName = (name: string) => {
    this.emit({
      ...this.state,
      profile: { ...this.state.profile, name },
      lastUpdated: Date.now(),
    });
  };

  updateEmail = (email: string) => {
    this.emit({
      ...this.state,
      profile: { ...this.state.profile, email },
      lastUpdated: Date.now(),
    });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light',
      },
      lastUpdated: Date.now(),
    });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        notifications: !this.state.settings.notifications,
      },
      lastUpdated: Date.now(),
    });
  };

  incrementFollowers = () => {
    this.emit({
      ...this.state,
      stats: { ...this.state.stats, followers: this.state.stats.followers + 1 },
      lastUpdated: Date.now(),
    });
  };

  incrementPosts = () => {
    this.emit({
      ...this.state,
      stats: { ...this.state.stats, posts: this.state.stats.posts + 1 },
      lastUpdated: Date.now(),
    });
  };

  // Computed property for engagement rate
  get engagementRate(): number {
    const { posts, followers } = this.state.stats;
    if (posts === 0) return 0;
    return Math.round((followers / posts) * 100) / 100;
  }
}

// ============================================================================
// RenderCounter Component
// ============================================================================

const RenderCounter: React.FC<{ label: string }> = ({ label }) => {
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-mono">
      {label}: {renderCount.current} renders
    </span>
  );
};

// ============================================================================
// Component Examples
// ============================================================================

// 1. No dependencies - re-renders on ANY state change
const AllStateComponent: React.FC = () => {
  const [state] = useBloc(UserCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-red-900 dark:text-red-100">
          ❌ No Dependencies (Re-renders on ALL changes)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-red-800 dark:text-red-200 space-y-1">
        <p>Name: {state.profile.name}</p>
        <p>Theme: {state.settings.theme}</p>
        <p>Posts: {state.stats.posts}</p>
      </div>
    </motion.div>
  );
};

// 2. Single property dependency - only re-renders when name changes
const NameOnlyComponent: React.FC = () => {
  const [state] = useBloc(UserCubit, {
    dependencies: (cubit) => [cubit.state.profile.name],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Single Dependency (name only)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-green-800 dark:text-green-200">
        <p className="font-medium">Welcome, {state.profile.name}!</p>
      </div>
    </motion.div>
  );
};

// 3. Multiple dependencies - re-renders on multiple specific changes
const ProfileComponent: React.FC = () => {
  const [state] = useBloc(UserCubit, {
    dependencies: (cubit) => [
      cubit.state.profile.name,
      cubit.state.profile.email,
    ],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          Multiple Dependencies (name + email)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
        <p>Name: {state.profile.name}</p>
        <p>Email: {state.profile.email}</p>
      </div>
    </motion.div>
  );
};

// 4. Computed property dependency - re-renders when derived value changes
const EngagementComponent: React.FC = () => {
  const [, cubit] = useBloc(UserCubit, {
    dependencies: (cubit) => [cubit.engagementRate],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Computed Dependency (engagement rate)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-purple-800 dark:text-purple-200">
        <p className="font-medium">
          Engagement Rate: {cubit.engagementRate} followers/post
        </p>
        <p className="text-xs mt-1 opacity-75">
          Only re-renders when this computed value changes
        </p>
      </div>
    </motion.div>
  );
};

// 5. Deep property dependency
const NotificationsComponent: React.FC = () => {
  const [state] = useBloc(UserCubit, {
    dependencies: (cubit) => [cubit.state.settings.notifications],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-2 border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
          Deep Property Dependency (settings.notifications)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-amber-800 dark:text-amber-200">
        <p>
          Notifications:{' '}
          {state.settings.notifications ? (
            <span className="text-green-600 font-medium">✓ Enabled</span>
          ) : (
            <span className="text-red-600 font-medium">✗ Disabled</span>
          )}
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Control Panel
// ============================================================================

const ControlPanel: React.FC = () => {
  const [, cubit] = useBloc(UserCubit);

  return (
    <div className="p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700">
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Test Controls - Watch which components re-render
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Profile Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={() =>
                cubit.updateName(`User ${Math.floor(Math.random() * 1000)}`)
              }
              className="w-full px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              Change Name
            </button>
            <button
              onClick={() =>
                cubit.updateEmail(
                  `user${Math.floor(Math.random() * 1000)}@example.com`
                )
              }
              className="w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              Change Email
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Settings Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={cubit.toggleTheme}
              className="w-full px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
            >
              Toggle Theme
            </button>
            <button
              onClick={cubit.toggleNotifications}
              className="w-full px-3 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
            >
              Toggle Notifications
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Stats Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={cubit.incrementPosts}
              className="w-full px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
            >
              +1 Post
            </button>
            <button
              onClick={cubit.incrementFollowers}
              className="w-full px-3 py-2 text-sm bg-pink-500 hover:bg-pink-600 text-white rounded-md transition-colors"
            >
              +1 Follower
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Watch the render counters above!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Only components with matching dependencies will re-render
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Interactive Demo Export
// ============================================================================

export function DependenciesInteractive() {
  return (
    <div className="my-8 space-y-4 not-prose">
      <AllStateComponent />
      <NameOnlyComponent />
      <ProfileComponent />
      <EngagementComponent />
      <NotificationsComponent />
      <ControlPanel />

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Performance Impact
          </p>
          <p className="text-sm text-muted-foreground">
            Notice how the red "No Dependencies" component re-renders on{' '}
            <strong>every</strong> state change, while the others only re-render
            when their specific dependencies change. In a real application with
            hundreds of components, this optimization is crucial.
          </p>
        </div>
      </div>
    </div>
  );
}
