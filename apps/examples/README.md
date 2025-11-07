# Blac Examples

Interactive examples showcasing Blac's modern state management features.

## Features

- **Custom Blac-based Router** - No external routing library, demonstrates Blac for general state
- **3 Progressive Examples** - From simple counter to advanced shopping cart
- **Zero External Libraries** - Only React + Blac, custom CSS styling
- **Educational Focus** - Well-commented code with console logging to show behavior

## Examples

### 1. Counter (Simple)

Introduction to Blac fundamentals.

**Showcases:**

- Basic Cubit state container
- Lifecycle hooks (onMount/onUnmount)
- Instance management (shared vs isolated)
- Automatic dependency tracking

**Key Learning:** Components automatically re-render only when their accessed properties change.

### 2. Todo List (Intermediate)

Granular dependency tracking and persistence.

**Showcases:**

- Fine-grained dependency tracking with filters
- Named instances for multiple independent lists
- Computed properties pattern
- LocalStorage persistence via lifecycle

**Key Learning:** TodoList re-renders on todos/filter changes, TodoFilters only on filter, TodoStats only on todos - all automatic!

### 3. Shopping Cart (Advanced)

Event-driven architecture with complex state.

**Showcases:**

- Event-driven Vertex pattern
- Complex nested state (array of objects)
- Multiple coordinated Blocs
- Async operations with loading states
- Error handling

**Key Learning:** Event-driven architecture keeps business logic clean and testable. Deep object tracking works automatically.

### 4. Real-time Dashboard (Power Demo)

**THE KILLER FEATURE** - Demonstrates the true power of automatic dependency tracking.

**Showcases:**

- Multiple widgets accessing different parts of shared state
- Visual render counters (green badges) showing which widgets re-render
- Each widget ONLY re-renders when its accessed properties change
- Auto-updating metrics showing real-time selective rendering
- Zero manual optimization needed

**Key Learning:** Traditional React would require React.memo on every widget, useMemo for every value, and useCallback for every function. With Blac, it just works - zero boilerplate, perfect optimization by default.

**Why This Matters:**

- Update user metrics → Only 3 user widgets re-render
- Update order metrics → Only 3 order widgets re-render
- Update revenue → Only 3 revenue widgets re-render
- 12 total widgets, but only 3 re-render on each update!
- This is automatic - no manual optimization needed!

## Running the Examples

```bash
# From the repository root
pnpm install

# Run the examples app
cd apps/examples
pnpm dev
```

Then open http://localhost:3002

## Project Structure

```
src/
├── router/              # Custom Blac-based router
│   ├── RouterBloc.ts    # Router state management
│   ├── Link.tsx         # Navigation component
│   └── Route.tsx        # Route matching
├── examples/
│   ├── 01-counter/      # Simple Cubit example
│   ├── 02-todos/        # Intermediate with filtering
│   ├── 03-shopping-cart/ # Advanced Vertex example
│   └── 04-dashboard/    # Power demo - automatic optimization
├── shared/
│   └── ExampleLayout.tsx # Shared layout component
├── App.tsx              # Main app with routing
├── Home.tsx             # Landing page
└── styles.css           # Global styles
```

## Key Concepts Demonstrated

### Automatic Dependency Tracking

Components only re-render when properties they access change. No manual optimization needed.

### Instance Management

- Default instances are shared across all uses
- Use `instanceKey` for isolated instances
- Named instances for multiple independent state containers

### Lifecycle Hooks

- `onMount` - Called when first component mounts
- `onUnmount` - Called when last component unmounts
- `onDispose` - Called when instance is disposed
- Perfect for subscriptions, timers, persistence

### Event-Driven Architecture (Vertex)

- All state changes go through typed events
- Handlers are pure functions
- Easy to test and reason about
- Great for complex workflows

## Browser Console

Open your browser console while using the examples to see:

- Lifecycle events (mount/unmount)
- Component re-render logs showing granular updates
- Event processing in the shopping cart
- Router navigation events

This helps understand how Blac's automatic dependency tracking works!

## BlaC DevTools

The examples app has BlaC DevTools enabled in development mode. Inspect and debug state in two ways:

### 1. In-App Floating Overlay (Recommended)

Press **Alt+D** to toggle a floating DevTools window:

- 🔍 **Search & filter** instances by className or ID
- 🎨 **Color-coded grouping** - same class = same color
- 📊 **State diff view** - see previous vs current state side-by-side
- 🪟 **Draggable & resizable** window
- ⌨️ Close with **Escape** or click **×**

### 2. Chrome DevTools Panel

1. Install the [BlaC DevTools Extension](../../apps/devtools-extension) (load as unpacked extension)
2. Open Chrome DevTools (F12)
3. Navigate to "BlaC DevTools" tab

Both modes show the same data and work simultaneously!

**What You Can See:**
- All Cubit/Vertex instances (RouterBloc, CounterCubit, etc.)
- Current state for each instance
- State changes with diff highlighting
- Instance lifecycle (disposed instances marked in red)

## Learn More

- [Blac Documentation](../../packages/blac/README.md)
- [React Integration](../../packages/blac-react/README.md)
