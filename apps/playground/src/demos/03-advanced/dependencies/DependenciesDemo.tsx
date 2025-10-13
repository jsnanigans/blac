import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { Workflow, Zap, Target, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

// Complex state for demonstrating dependencies
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

// RenderCounter utility component
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

// 1. No dependencies - re-renders on ANY state change
const AllStateComponent: React.FC = () => {
  const [state] = useBloc(UserCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-red-900">
          ❌ No Dependencies (Re-renders on ALL changes)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-red-800 space-y-1">
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
      className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-green-900 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Single Dependency (name only)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-green-800">
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
      className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          Multiple Dependencies (name + email)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-blue-800 space-y-1">
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
      className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Computed Dependency (engagement rate)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-purple-800">
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

// 5. Complex dependency - only when deep value changes
const NotificationsComponent: React.FC = () => {
  const [state] = useBloc(UserCubit, {
    dependencies: (cubit) => [cubit.state.settings.notifications],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-amber-900">
          Deep Property Dependency (settings.notifications)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-amber-800">
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

// Control panel for testing
const ControlPanel: React.FC = () => {
  const [, cubit] = useBloc(UserCubit);

  return (
    <div className="p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Test Controls - Watch which components re-render
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-slate-700 mb-2">
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
          <h5 className="text-sm font-medium text-slate-700 mb-2">
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
          <h5 className="text-sm font-medium text-slate-700 mb-2">
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
            <p className="text-xs text-slate-600 mb-2">
              Watch the render counters above!
            </p>
            <p className="text-xs text-slate-500">
              Only components with matching dependencies will re-render
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DependenciesDemo: React.FC = () => {
  return (
    <DemoArticle
      metadata={{
        id: 'dependencies',
        title: 'Dependency Tracking',
        description:
          'Master fine-grained subscriptions to optimize re-renders by tracking specific state properties',
        category: '03-advanced',
        difficulty: 'advanced',
        tags: ['dependencies', 'performance', 'optimization', 'subscriptions'],
        estimatedTime: 20,
      }}
    >
      {/* Introduction Section */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Understanding Dependency Tracking</h2>
          <p>
            Dependency tracking is the foundation of fine-grained reactivity in
            BlaC. By specifying exactly which parts of the state your component
            depends on, you can dramatically reduce unnecessary re-renders and
            improve application performance.
          </p>
          <p>
            While <strong>selectors</strong> let you derive and compare values,{' '}
            <strong>dependencies</strong> let you subscribe to specific state
            properties at a granular level. This is especially powerful for
            large state objects where most components only care about a small
            subset of the data.
          </p>
        </Prose>

        <ConceptCallout type="info" title="Dependencies vs Selectors">
          <p className="text-sm">
            <strong>Dependencies:</strong> Track specific state properties or
            computed values. Component re-renders only when those exact values
            change.
          </p>
          <p className="text-sm mt-2">
            <strong>Selectors:</strong> Derive new values from state and use
            shallow comparison. Component re-renders only when the derived value
            changes.
          </p>
          <p className="text-sm mt-2">
            Both techniques complement each other. Dependencies are simpler and
            more explicit, while selectors offer more flexibility for complex
            transformations.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Interactive Demo Section */}
      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Dependency Demo</h2>
          <p>
            Below are five components, each subscribed to different parts of a
            complex user state. Notice how only components with matching
            dependencies re-render when you modify the state:
          </p>
        </Prose>

        <div className="space-y-4 not-prose">
          <AllStateComponent />
          <NameOnlyComponent />
          <ProfileComponent />
          <EngagementComponent />
          <NotificationsComponent />
          <ControlPanel />
        </div>

        <ConceptCallout type="success" title="Performance Impact">
          <p className="text-sm">
            Notice how the red "No Dependencies" component re-renders on{' '}
            <strong>every</strong> state change, while the others only re-render
            when their specific dependencies change. In a real application with
            hundreds of components, this optimization is crucial.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation Section */}
      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementing Dependencies</h2>
          <p>
            Dependencies are specified in the <code>useBloc</code> hook options.
            The <code>dependencies</code> function receives the Cubit/Bloc
            instance and returns an array of values to track.
          </p>
        </Prose>

        <CodePanel
          code={`// No dependencies - re-renders on ANY state change
const [state] = useBloc(UserCubit);
// ❌ Component re-renders whenever ANY part of state changes

// Single property dependency
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [cubit.state.profile.name]
});
// ✅ Only re-renders when profile.name changes

// Multiple dependencies
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [
    cubit.state.profile.name,
    cubit.state.profile.email
  ]
});
// ✅ Re-renders when name OR email changes

// Computed property dependency
const [, cubit] = useBloc(UserCubit, {
  dependencies: (cubit) => [cubit.engagementRate]
});
// ✅ Only re-renders when computed value changes`}
          language="typescript"
          lineLabels={{
            1: 'No optimization',
            2: 'Re-renders on all changes',
            4: 'Single dependency',
            5: 'Track one property',
            7: 'Only this property',
            9: 'Multiple dependencies',
            10: 'Track array of properties',
            12: 'Name changes',
            13: 'OR email changes',
            15: 'Computed dependencies',
            16: 'Track getter/computed value',
            18: 'Smart re-rendering',
          }}
        />

        <ConceptCallout type="tip" title="How It Works">
          <p className="text-sm">
            BlaC compares the dependency array from the previous render with the
            current render using <strong>shallow equality</strong>. If any value
            in the array has changed (using <code>Object.is</code> comparison),
            the component re-renders.
          </p>
          <p className="text-sm mt-2">
            This is similar to React's <code>useMemo</code> or{' '}
            <code>useEffect</code> dependency arrays, but applied to state
            subscriptions.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Advanced Patterns Section */}
      <ArticleSection theme="cubit" id="advanced">
        <Prose>
          <h2>Advanced Dependency Patterns</h2>
        </Prose>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              1. Deep Property Access
            </h3>
            <CodePanel
              code={`// Track nested properties
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [
    cubit.state.settings.theme,
    cubit.state.settings.notifications
  ]
});
// ✅ Only re-renders when theme or notifications change
// ✅ Ignores changes to settings.language or other properties`}
              language="typescript"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              2. Computed Dependencies
            </h3>
            <CodePanel
              code={`class UserCubit extends Cubit<UserState> {
  // Computed property (getter)
  get engagementRate(): number {
    return this.state.stats.followers / this.state.stats.posts;
  }
}

// Track computed value
const [, cubit] = useBloc(UserCubit, {
  dependencies: (cubit) => [cubit.engagementRate]
});
// ✅ Re-renders only when the RESULT of the computation changes
// ✅ Smart: if posts go from 10→11 and followers from 100→110,
//    the rate stays 10 and component doesn't re-render!`}
              language="typescript"
              lineLabels={{
                2: 'Define getter',
                3: 'Derives value from state',
                9: 'Track computed value',
                11: 'Value-based tracking',
                12: 'Not property-based',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              3. Conditional Dependencies
            </h3>
            <CodePanel
              code={`// Only track certain properties based on conditions
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => {
    const deps = [cubit.state.profile.name];

    // Add email to dependencies only if notifications enabled
    if (cubit.state.settings.notifications) {
      deps.push(cubit.state.profile.email);
    }

    return deps;
  }
});
// ⚠️ Advanced: dependency array changes dynamically`}
              language="typescript"
              lineLabels={{
                3: 'Start with base deps',
                6: 'Conditional logic',
                7: 'Add email conditionally',
                11: 'Return dynamic array',
              }}
            />
            <ConceptCallout type="warning" title="Use Sparingly">
              <p className="text-sm">
                Dynamic dependency arrays can be confusing and hard to debug.
                Prefer static dependency arrays when possible. If you need
                conditional logic, consider using multiple components or
                selectors instead.
              </p>
            </ConceptCallout>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              4. Array and Object Dependencies
            </h3>
            <CodePanel
              code={`// ❌ Common Mistake: Tracking entire objects
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [cubit.state.profile]
});
// Problem: Entire profile object in dependency array
// Re-renders on ANY profile property change (name, email, avatar)

// ✅ Better: Track specific properties
const [state] = useBloc(UserCubit, {
  dependencies: (cubit) => [
    cubit.state.profile.name,
    cubit.state.profile.email
  ]
});
// Solution: Explicitly list properties you care about

// ✅ Alternative: Use a selector for complex logic
const [state] = useBloc(UserCubit, {
  selector: (state) => ({
    name: state.profile.name,
    email: state.profile.email
  })
});
// Selector returns new object, compared by shallow equality`}
              language="typescript"
              lineLabels={{
                1: 'Anti-pattern',
                4: 'Tracks whole object',
                7: 'Recommended',
                9: 'Granular tracking',
                15: 'Alternative approach',
                16: 'Derive specific shape',
              }}
            />
          </div>
        </div>

        <ConceptCallout type="tip" title="Performance Best Practice">
          <p className="text-sm">
            <strong>Rule of thumb:</strong> Track primitives (strings, numbers,
            booleans) and computed values in your dependency array. Avoid
            tracking entire objects or arrays unless you truly need to re-render
            on any change to that structure.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConceptCallout type="success" title="Do">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Specify dependencies for fine-grained subscriptions</li>
              <li>Track primitive values and computed properties</li>
              <li>Use multiple dependencies when needed</li>
              <li>Combine with selectors for complex cases</li>
              <li>Test re-render behavior with render counters</li>
            </ul>
          </ConceptCallout>

          <ConceptCallout type="warning" title="Don't">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Track entire objects/arrays unless necessary</li>
              <li>Create overly dynamic dependency arrays</li>
              <li>Forget to specify dependencies (re-renders on all changes)</li>
              <li>Assume dependencies work like React's useEffect deps</li>
              <li>Mix dependencies and selectors in confusing ways</li>
            </ul>
          </ConceptCallout>
        </div>

        <ConceptCallout type="info" title="When to Use Dependencies">
          <p className="text-sm">
            <strong>Use dependencies when:</strong>
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside mt-2">
            <li>You have large state objects with many properties</li>
            <li>Components only care about specific state slices</li>
            <li>You want explicit, easy-to-read subscription logic</li>
            <li>You're tracking computed properties from getters</li>
          </ul>
          <p className="text-sm mt-3">
            <strong>Use selectors when:</strong>
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside mt-2">
            <li>You need to derive or transform state values</li>
            <li>You want to compare complex objects by value</li>
            <li>You need custom equality comparison logic</li>
            <li>The derived value is expensive to compute</li>
          </ul>
        </ConceptCallout>

        <Prose>
          <p className="text-lg font-medium text-slate-900 mt-6">
            Master dependency tracking to build highly performant React
            applications. Combined with selectors and proper state
            architecture, you can create applications that scale to thousands
            of components without performance degradation.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
};
