# Using Rerender Logging in the Demo App

The rerender logging feature has been added to the demo app! Here's how to use it:

## Quick Start

1. Open the demo app in your browser
2. Open the browser's developer console (F12)
3. Navigate to the "Rerender Logging" demo
4. Enable rerender logging using the checkbox
5. Interact with the components and watch the console for logs

## What You'll See

### Minimal Level

Shows only component name and render count:

```
🚀 TodoList #1
📊 TodoList #2
```

### Normal Level (Default)

Shows the reason for rerenders and which properties changed:

```
📊 TodoList rerender #2 (TodoCubit)
Reason: State changed: (entire state) | Time since last: 16ms | Changed: (entire state)
```

### Detailed Level

Shows comprehensive information including old/new values:

```
📊 TodoList rerender #2 (TodoCubit)
  Reason: State changed: (entire state) | Time since last: 16ms
  ┌─────────────────┬───────────┬───────────┐
  │ (index)         │    old    │    new    │
  ├─────────────────┼───────────┼───────────┤
  │ (entire state)  │ {...}     │ {...}     │
  └─────────────────┴───────────┴───────────┘
```

## Understanding the Demo

The demo includes three components:

1. **TodoList** - Uses the entire state, so it rerenders on any change
2. **TodoCount** - Only tracks `todos.length`, so it only rerenders when the number of todos changes
3. **FilterControls** - Only tracks the `filter` property, so it only rerenders when the filter changes

Try these actions:

- **Add Todo**: TodoList ✅ and TodoCount ✅ rerender, but FilterControls ❌ doesn't
- **Toggle Todo**: Only TodoList ✅ rerenders
- **Change Filter**: TodoList ✅ and FilterControls ✅ rerender, but TodoCount ❌ doesn't

## Enabling Globally

To enable rerender logging for your entire app:

```javascript
import { Blac } from '@blac/core';

// Enable in development only
if (process.env.NODE_ENV === 'development') {
  Blac.setConfig({
    rerenderLogging: 'normal', // or 'minimal', 'detailed', true, or config object
  });
}
```

## Advanced Configuration

```javascript
Blac.setConfig({
  rerenderLogging: {
    enabled: true,
    level: 'detailed',
    filter: ({ componentName, blocName }) => {
      // Only log specific components
      return componentName.includes('Dashboard');
    },
    includeStackTrace: true, // Only in detailed mode
    groupRerenders: true, // Group rapid rerenders
  },
});
```

## Tips

- Start with 'normal' level for a good balance of information
- Use 'detailed' level when debugging specific issues
- Enable `groupRerenders` when dealing with rapid state changes
- Use the filter function to focus on specific components in large apps
