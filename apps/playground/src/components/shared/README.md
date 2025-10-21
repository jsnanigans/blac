# Shared Demo Components

Reusable interactive components for BlaC playground demos.

## Overview

These components provide interactive functionality that can be used across all demos. They automatically subscribe to Bloc/Cubit instances and provide real-time visual feedback.

## Components

### StateViewer

Displays live state from a Bloc/Cubit instance with color-coded values.

**Features:**

- Auto-subscribes to Bloc/Cubit state changes
- Color-codes values by type (string=green, number=blue, boolean=purple, object=yellow)
- Expandable/collapsible for nested objects
- Pulse animation on state changes
- Copy state to clipboard
- Configurable max depth for nested structures
- Custom render prop support

**Example:**

```tsx
import { StateViewer } from './components/shared';
import { CounterCubit } from './CounterCubit';

function Demo() {
  return (
    <StateViewer
      bloc={CounterCubit}
      title="Counter State"
      maxDepth={3}
      showCopy
    />
  );
}
```

**With Custom Render:**

```tsx
<StateViewer
  bloc={CounterCubit}
  title="Counter"
  render={(state) => (
    <div className="text-4xl font-bold text-center">{state.count}</div>
  )}
/>
```

**Props:**

| Prop               | Type                   | Default      | Description                         |
| ------------------ | ---------------------- | ------------ | ----------------------------------- |
| `bloc`             | `BlocClass`            | **required** | Bloc or Cubit class to subscribe to |
| `title`            | `string`               | `'State'`    | Display title                       |
| `maxDepth`         | `number`               | `5`          | Max depth for nested objects        |
| `render`           | `(state) => ReactNode` | -            | Custom render function              |
| `defaultCollapsed` | `boolean`              | `false`      | Start collapsed                     |
| `showCopy`         | `boolean`              | `true`       | Show copy button                    |
| `className`        | `string`               | -            | Additional CSS classes              |

**Type Color Coding:**

The StateViewer automatically color-codes values based on their JavaScript type:

| Type        | Color  | Example     |
| ----------- | ------ | ----------- |
| `string`    | Green  | `"hello"`   |
| `number`    | Blue   | `42`        |
| `boolean`   | Purple | `true`      |
| `object`    | Yellow | `{ ... }`   |
| `function`  | Pink   | `() => {}`  |
| `null`      | Gray   | `null`      |
| `undefined` | Gray   | `undefined` |

**Nested Object Handling:**

For nested objects and arrays, the component provides expand/collapse functionality:

```tsx
// State with nested structure
interface AppState {
  user: {
    name: string;
    age: number;
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
  items: string[];
}

// StateViewer will render with collapsible sections
<StateViewer bloc={AppCubit} maxDepth={3} />;
```

Objects deeper than `maxDepth` will be displayed as `[Object]` or `[Array(n)]` without expansion.

---

## Usage Patterns

### Pattern 1: Sticky State Viewer (Scrollytelling)

Keep the state viewer visible while the user scrolls through content:

```tsx
<div className="grid lg:grid-cols-2 gap-8">
  {/* Scrollable content */}
  <div className="space-y-8">
    <ArticleSection>
      <Prose>
        <p>As you interact with the demo...</p>
      </Prose>
    </ArticleSection>

    <ArticleSection>
      <MyInteractiveDemo />
    </ArticleSection>
  </div>

  {/* Sticky state viewer */}
  <div className="lg:sticky lg:top-24 lg:self-start">
    <StateViewer bloc={DemoCubit} title="Live State" />
  </div>
</div>
```

### Pattern 2: Inline State Display

Show state inline with the demo:

```tsx
<ArticleSection>
  <div className="space-y-4">
    <MyInteractiveDemo />
    <StateViewer bloc={DemoCubit} defaultCollapsed={false} />
  </div>
</ArticleSection>
```

### Pattern 3: Custom State Rendering

For simple state, use a custom render function:

```tsx
<StateViewer
  bloc={CounterCubit}
  title="Current Count"
  render={(state) => (
    <div className="flex items-center justify-center">
      <span className="text-6xl font-bold text-concept-cubit">{state}</span>
    </div>
  )}
/>
```

### Pattern 4: Comparison View

Show multiple state viewers side by side:

```tsx
<div className="grid md:grid-cols-2 gap-4">
  <StateViewer bloc={SharedCounterCubit} title="Shared Instance" />
  <StateViewer bloc={IsolatedCounterCubit} title="Isolated Instance" />
</div>
```

---

## Design Tokens Integration

The StateViewer component automatically uses design tokens for consistent styling:

```tsx
// Type colors are pulled from Tailwind config
import { getTypeText, getTypeBg } from '../../utils/design-tokens';

// Example usage in component
<span className={getTypeText('string')}>"hello"</span>;
```

---

## Accessibility

- **Keyboard Navigation**: Expand/collapse with Enter/Space
- **Screen Readers**: Proper ARIA labels for all interactive elements
- **Focus Management**: Clear focus indicators on all buttons
- **Reduced Motion**: Pulse animations respect `prefers-reduced-motion`

---

## Animation

The StateViewer uses subtle animations to draw attention to state changes:

- **Pulse Animation**: Brief scale pulse when state updates
- **Expand/Collapse**: Smooth height transitions
- **Copy Feedback**: Color change on successful copy

All animations respect the user's `prefers-reduced-motion` setting.

---

## Performance Considerations

### Subscription Management

The component automatically handles subscription lifecycle:

```tsx
// No manual cleanup required - handled automatically
<StateViewer bloc={MyCubit} />
```

### Rendering Optimization

For complex state with many nested objects, consider:

1. **Limit max depth**: Use `maxDepth={2}` or `maxDepth={3}` for deeply nested structures
2. **Custom render**: Use `render` prop for simple state to avoid overhead
3. **Default collapsed**: Start collapsed for demos where state is supplementary

```tsx
// Optimized for complex state
<StateViewer bloc={ComplexCubit} maxDepth={2} defaultCollapsed />
```

---

## Common Mistakes

❌ **Don't** try to pass an instance - pass the class

```tsx
// Wrong
const cubit = new CounterCubit();
<StateViewer bloc={cubit} />

// Correct
<StateViewer bloc={CounterCubit} />
```

❌ **Don't** forget max depth for deeply nested state

```tsx
// May cause performance issues
<StateViewer bloc={DeepStateCubit} />

// Better
<StateViewer bloc={DeepStateCubit} maxDepth={3} />
```

❌ **Don't** use custom render for complex state

```tsx
// Loses expandable functionality
<StateViewer
  bloc={ComplexCubit}
  render={(state) => JSON.stringify(state)}
/>

// Better - let component handle it
<StateViewer bloc={ComplexCubit} />
```

✅ **Do** use appropriate titles

```tsx
<StateViewer
  bloc={UserCubit}
  title="Current User" // Clear, descriptive
/>
```

---

## Examples

### Basic Counter

```tsx
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

// In demo
<StateViewer bloc={CounterCubit} title="Count" />;
```

### Todo List

```tsx
interface TodoState {
  items: Array<{ id: string; text: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
  }
}

// In demo
<StateViewer bloc={TodoCubit} title="Todo State" maxDepth={3} />;
```

### User Profile

```tsx
interface User {
  name: string;
  email: string;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

// Custom render for focused display
<StateViewer
  bloc={UserCubit}
  title="User Profile"
  render={(user) => (
    <div className="space-y-2">
      <div>
        <span className="text-muted-foreground">Name:</span>
        <span className="ml-2 font-medium">{user.name}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Email:</span>
        <span className="ml-2 font-medium">{user.email}</span>
      </div>
    </div>
  )}
/>;
```

---

## Future Components

Components planned for Phase 2-3:

- **BlocGraphVisualizer** - Real-time graph visualization of Bloc/Cubit instances
- **ConceptCallout** - Highlighted tips, warnings, and info boxes
- **ComparisonPanel** - Side-by-side comparison with synchronized interaction
- **InteractionFeedback** - Celebration animations (confetti, sparkles)
- **EventViewer** - Timeline display of Bloc events
- **StateTransition** - Visual display of state changes over time

See the implementation plan for details on these components.

---

## Related Documentation

- `/components/demo-article/README.md` - Article layout components
- `/utils/animations.ts` - Animation utilities
- `/utils/design-tokens.ts` - Design token helpers
- `spec/playground-demos-improvement/plan.md` - Full implementation plan
