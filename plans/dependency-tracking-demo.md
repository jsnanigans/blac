# Dependency Tracking Interactive Demo Plan

## Overview
Replace `DependenciesInteractive` component with a rich, visual demonstration of BlaC's three dependency tracking modes with real-time re-render visualization.

## Demo Goals
1. **Teach**: Show how automatic, manual, and getter-based tracking work
2. **Visualize**: Make re-renders visible and understandable
3. **Compare**: Side-by-side comparison of optimization strategies
4. **Engage**: Interactive controls that let users experiment

---

## State Architecture

### ProfileState Interface
```typescript
interface ProfileState {
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
  lastUpdated: string; // timestamp
}
```

### ProfileCubit with Computed Getters
```typescript
class ProfileCubit extends Cubit<ProfileState> {
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

  // Computed getter - key for demonstrating getter tracking
  get fullName(): string {
    return `${this.state.user.firstName} ${this.state.user.lastName}`;
  }

  get followerRatio(): string {
    const ratio = this.state.stats.followers / this.state.stats.following;
    return ratio.toFixed(2);
  }

  // Update methods (all return new state objects)
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
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
      settings: {
        theme: 'dark',
        notifications: false,
      },
      stats: {
        posts: 100,
        followers: 2000,
        following: 500,
      },
      lastUpdated: new Date().toISOString(),
    });
  };
}
```

---

## Component Architecture

### 1. AutomaticTrackingCard 🤖
**Purpose**: Demonstrate automatic proxy-based dependency tracking

```typescript
function AutomaticTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit);
  // No dependencies - proxy automatically tracks accessed properties

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="🤖"
      title="Automatic Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="state.user.firstName (auto-detected)"
    >
      <div className="text-2xl font-bold">{state.user.firstName}</div>
      <div className="text-sm text-gray-500">
        Only re-renders when firstName is accessed and changed
      </div>
    </ComponentCard>
  );
}
```

**Expected Behavior**:
- ✅ Re-renders: When `firstName` changes
- ❌ Doesn't re-render: When lastName, email, settings, or stats change

### 2. ManualDependenciesCard 📝
**Purpose**: Demonstrate explicit dependency array control

```typescript
function ManualDependenciesCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [
      cubit.state.user.email,
      cubit.state.settings.theme,
    ],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="📝"
      title="Manual Dependencies"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[email, theme]"
    >
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-semibold">Email:</span> {state.user.email}
        </div>
        <div className="text-sm">
          <span className="font-semibold">Theme:</span>{' '}
          <span
            className={`px-2 py-1 rounded ${
              state.settings.theme === 'light'
                ? 'bg-yellow-100'
                : 'bg-gray-800 text-white'
            }`}
          >
            {state.settings.theme}
          </span>
        </div>
      </div>
    </ComponentCard>
  );
}
```

**Expected Behavior**:
- ✅ Re-renders: When `email` OR `theme` changes
- ❌ Doesn't re-render: When firstName, lastName, notifications, or stats change

### 3. GetterTrackingCard ⚡
**Purpose**: Demonstrate getter-based computed value tracking

```typescript
function GetterTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [, cubit] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.fullName, cubit.followerRatio],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="⚡"
      title="Getter Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[cubit.fullName, cubit.followerRatio]"
    >
      <div className="space-y-2">
        <div className="text-xl font-bold">{cubit.fullName}</div>
        <div className="text-sm text-gray-600">
          Follower Ratio: {cubit.followerRatio}
        </div>
        <div className="text-xs text-gray-400">
          Re-renders only when COMPUTED values change
        </div>
      </div>
    </ComponentCard>
  );
}
```

**Expected Behavior**:
- ✅ Re-renders: When firstName OR lastName changes (affects fullName)
- ✅ Re-renders: When followers OR following changes (affects followerRatio)
- ❌ Doesn't re-render: When email, theme, notifications, or posts change

### 4. BroadTrackingCard 🔄
**Purpose**: Show less optimized tracking (entire object)

```typescript
function BroadTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.state.stats],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="🔄"
      title="Broad Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[entire stats object]"
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-2xl font-bold">{state.stats.posts}</div>
          <div className="text-xs">Posts</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{state.stats.followers}</div>
          <div className="text-xs">Followers</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{state.stats.following}</div>
          <div className="text-xs">Following</div>
        </div>
      </div>
      <div className="text-xs text-orange-500 mt-2">
        ⚠️ Re-renders on ANY stats change
      </div>
    </ComponentCard>
  );
}
```

**Expected Behavior**:
- ✅ Re-renders: When posts, followers, OR following changes
- ❌ Doesn't re-render: When user or settings properties change

### 5. UnoptimizedCard ⚠️
**Purpose**: Show worst-case scenario (for comparison)

```typescript
function UnoptimizedCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  // Simulate no optimization by tracking a property that always changes
  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.state.lastUpdated],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="⚠️"
      title="Unoptimized"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[lastUpdated] - changes every time"
      variant="warning"
    >
      <div className="space-y-1">
        <div className="text-sm font-mono text-xs">
          {new Date(state.lastUpdated).toLocaleTimeString()}
        </div>
        <div className="text-xs text-red-600">
          ❌ Re-renders on EVERY state change
        </div>
      </div>
    </ComponentCard>
  );
}
```

**Expected Behavior**:
- ✅ Re-renders: On EVERY state change (because lastUpdated always updates)

---

## Shared UI Components

### ComponentCard
Reusable card component for displaying tracking components:

```typescript
interface ComponentCardProps {
  icon: string;
  title: string;
  renderCount: number;
  justRendered: boolean;
  trackedProperties: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}

function ComponentCard({
  icon,
  title,
  renderCount,
  justRendered,
  trackedProperties,
  children,
  variant = 'default',
}: ComponentCardProps) {
  const badgeColor =
    renderCount <= 3
      ? 'bg-green-500'
      : renderCount <= 10
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg transition-all duration-300
        ${justRendered ? 'border-blue-500 animate-flash' : 'border-gray-200'}
        ${variant === 'warning' ? 'bg-orange-50' : 'bg-white'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-white text-xs font-bold ${badgeColor}`}
        >
          {renderCount}
        </span>
      </div>

      {/* Tracked Properties */}
      <div className="mb-3 p-2 bg-gray-100 rounded text-xs font-mono">
        <span className="text-gray-600">Tracks:</span>{' '}
        <span className="text-gray-800">{trackedProperties}</span>
      </div>

      {/* Content */}
      <div className="mt-2">{children}</div>
    </div>
  );
}
```

### ControlPanel
Interactive controls for triggering state changes:

```typescript
function ControlPanel() {
  const [, cubit] = useBloc(ProfileCubit);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
      <h3 className="text-lg font-bold mb-4 text-gray-800">
        🎮 Control Panel
      </h3>

      {/* User Properties */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          👤 User Properties
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              cubit.updateFirstName(
                cubit.state.user.firstName === 'John' ? 'Jane' : 'John'
              )
            }
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Automatic + Getter components"
          >
            Toggle First Name
          </button>
          <button
            onClick={() =>
              cubit.updateLastName(
                cubit.state.user.lastName === 'Doe' ? 'Smith' : 'Doe'
              )
            }
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Getter component only"
          >
            Toggle Last Name
          </button>
          <button
            onClick={() =>
              cubit.updateEmail(
                cubit.state.user.email === 'john@example.com'
                  ? 'jane@example.com'
                  : 'john@example.com'
              )
            }
            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Manual Dependencies component"
          >
            Toggle Email
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          ⚙️ Settings
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cubit.toggleTheme}
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Manual Dependencies component"
          >
            Toggle Theme
          </button>
          <button
            onClick={cubit.toggleNotifications}
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: No components (not tracked)"
          >
            Toggle Notifications
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Stats</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cubit.incrementPosts}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking component"
          >
            + Posts
          </button>
          <button
            onClick={cubit.incrementFollowers}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking + Getter components"
          >
            + Followers
          </button>
          <button
            onClick={cubit.incrementFollowing}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking + Getter components"
          >
            + Following
          </button>
        </div>
      </div>

      {/* Special Actions */}
      <div className="mt-6 pt-4 border-t border-blue-300">
        <button
          onClick={cubit.updateEverything}
          className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-bold transition-all transform hover:scale-105"
          title="Updates ALL components"
        >
          💥 Update Everything
        </button>
      </div>
    </div>
  );
}
```

---

## Main Demo Component

```typescript
export function DependenciesInteractive() {
  return (
    <div className="my-8 space-y-6">
      {/* Introduction */}
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <p className="text-sm text-gray-700">
          <strong>Interactive Demo:</strong> Click the buttons below to update
          different parts of the state. Watch the render counters to see which
          components re-render based on their dependency tracking strategy.
        </p>
      </div>

      {/* Control Panel */}
      <ControlPanel />

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AutomaticTrackingCard />
        <ManualDependenciesCard />
        <GetterTrackingCard />
        <BroadTrackingCard />
        <UnoptimizedCard />
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">📚 Legend</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Green badge (1-3 renders): Highly optimized
          </li>
          <li>
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Yellow badge (4-10 renders): Moderately optimized
          </li>
          <li>
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Red badge (10+ renders): Not optimized
          </li>
          <li>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Blue border flash: Component just re-rendered
          </li>
        </ul>
      </div>
    </div>
  );
}
```

---

## CSS Animations

```css
@keyframes flash {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(59, 130, 246, 0.1);
  }
}

.animate-flash {
  animation: flash 600ms ease-in-out;
}
```

---

## File Structure

```
apps/playground/src/demos/03-advanced/dependencies/
├── DependenciesInteractive.tsx       # Main demo component
├── ProfileCubit.ts                   # State management
├── components/
│   ├── ComponentCard.tsx             # Reusable card component
│   ├── ControlPanel.tsx              # Interactive controls
│   ├── AutomaticTrackingCard.tsx     # Demo component 1
│   ├── ManualDependenciesCard.tsx    # Demo component 2
│   ├── GetterTrackingCard.tsx        # Demo component 3
│   ├── BroadTrackingCard.tsx         # Demo component 4
│   └── UnoptimizedCard.tsx           # Demo component 5
└── styles.css                        # Animations
```

---

## Expected Learning Outcomes

After interacting with this demo, users will understand:

1. **Automatic Tracking**: Proxies track accessed properties automatically
2. **Manual Dependencies**: Explicit arrays provide fine-grained control
3. **Getter Tracking**: Computed values enable value-based optimization
4. **Optimization Trade-offs**: Broad tracking vs. specific tracking
5. **Visual Feedback**: See exactly when and why components re-render

---

## Testing Scenarios

### Scenario 1: Automatic Tracking
1. Click "Toggle First Name"
2. Observe: Automatic + Getter + Unoptimized re-render
3. Observe: Manual + Broad do NOT re-render

### Scenario 2: Manual Dependencies
1. Click "Toggle Email"
2. Observe: Manual + Unoptimized re-render
3. Observe: Automatic + Getter + Broad do NOT re-render

### Scenario 3: Getter Tracking
1. Click "Toggle Last Name"
2. Observe: Getter (fullName changed) + Unoptimized re-render
3. Observe: Automatic + Manual + Broad do NOT re-render

### Scenario 4: Follower Ratio
1. Click "+ Followers"
2. Observe: Getter (followerRatio changed) + Broad + Unoptimized re-render
3. Observe: Automatic + Manual do NOT re-render

### Scenario 5: Everything
1. Click "💥 Update Everything"
2. Observe: ALL components re-render
3. Render counts all increment

---

## Implementation Checklist

- [ ] Create `ProfileCubit` with state and methods
- [ ] Implement `ComponentCard` reusable component
- [ ] Implement `AutomaticTrackingCard`
- [ ] Implement `ManualDependenciesCard`
- [ ] Implement `GetterTrackingCard`
- [ ] Implement `BroadTrackingCard`
- [ ] Implement `UnoptimizedCard`
- [ ] Implement `ControlPanel`
- [ ] Create main `DependenciesInteractive` component
- [ ] Add CSS animations for flash effect
- [ ] Test all tracking scenarios
- [ ] Update imports in `dependencies.mdx`
- [ ] Verify responsive layout on mobile
- [ ] Add aria-labels for accessibility
- [ ] Test with React DevTools Profiler

---

## Next Steps

Ready to implement this plan! The demo will:
- ✅ Clearly demonstrate all three tracking modes
- ✅ Provide instant visual feedback on re-renders
- ✅ Allow hands-on experimentation
- ✅ Teach optimization trade-offs through interaction
