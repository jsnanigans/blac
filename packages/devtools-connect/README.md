# @blac/devtools-connect

DevTools connection plugin for [BlaC](https://github.com/jsnanigans/blac) state management library.

## Installation

```bash
npm install @blac/devtools-connect
# or
pnpm add @blac/devtools-connect
# or
yarn add @blac/devtools-connect
```

## Quick Start

### Option 1: Redux DevTools (Recommended - 2 Minutes Setup)

The fastest way to get DevTools support. Use the existing Redux DevTools extension!

**Step 1:** Install [Redux DevTools Extension](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)

**Step 2:** Add the adapter to your app:

```typescript
import { Blac } from '@blac/core';
import { ReduxDevToolsAdapter } from '@blac/devtools-connect';

// Add Redux DevTools integration
Blac.instance.plugins.add(
  new ReduxDevToolsAdapter({
    enabled: import.meta.env.DEV, // Only in development
    name: 'My App State',
  }),
);
```

**Step 3:** Open Redux DevTools and start debugging!

✅ **Benefits:**

- ⚡ Works immediately - no custom extension needed
- 🔄 Time-travel debugging built-in
- 📊 State inspection with JSON tree
- 📝 Action logging
- 🎯 Proven UX from Redux ecosystem

### Option 2: Custom BlaC DevTools Extension

For advanced BlaC-specific features (coming soon).

```typescript
import { Blac } from '@blac/core';
import { DevToolsPlugin } from '@blac/devtools-connect';

Blac.instance.plugins.add(
  new DevToolsPlugin({
    enabled: import.meta.env.DEV,
    maxEvents: 500,
  }),
);
```

Install the **BlaC DevTools** extension from Chrome Web Store (coming soon).

## Features

### Redux DevTools Integration

- ✅ **Time-Travel Debugging** - Step through state changes
- ✅ **State Inspector** - JSON tree viewer
- ✅ **Action Log** - See all Bloc events
- ✅ **Export/Import** - Save debugging sessions
- ✅ **Zero Setup** - Works with existing extension

### Custom BlaC DevTools (Coming Soon)

- 📝 **Enhanced Event Log** - BlaC-specific event details
- 🔍 **Bloc Inspector** - Lifecycle and status tracking
- ⚛️ **React Integration** - Component re-render tracking
- 📊 **Performance Profiling** - Identify slow operations
- 🎛️ **Proxy Tracking** - See actual property access vs subscriptions

## Configuration

### ReduxDevToolsAdapter

```typescript
new ReduxDevToolsAdapter({
  // Enable/disable the adapter (default: true)
  enabled: import.meta.env.DEV,

  // DevTools instance name (default: "BlaC State")
  name: 'My App State',

  // Maximum actions to keep in history (default: 50)
  maxAge: 50,

  // Enable action stack traces (default: false)
  trace: false,

  // Customize Redux DevTools features
  features: {
    pause: true,
    lock: true,
    persist: true,
    export: true,
    import: 'custom',
    jump: true,
    skip: true,
    reorder: true,
    dispatch: true,
  },
});
```

### DevToolsPlugin (Custom Extension)

```typescript
new DevToolsPlugin({
  // Enable/disable the plugin (default: true)
  enabled: import.meta.env.DEV,

  // Maximum events to keep in history (default: 500)
  maxEvents: 500,

  // Maximum message size in bytes (default: 10MB)
  maxMessageSize: 10_000_000,

  // Maximum messages per second (default: 100)
  maxMessagesPerSecond: 100,
});
```

## API

### ReduxDevToolsAdapter

```typescript
const adapter = new ReduxDevToolsAdapter(config);

// Check if connected to Redux DevTools
const connected = adapter.isConnected();

// Disconnect from Redux DevTools
adapter.disconnect();
```

### DevToolsPlugin

```typescript
const plugin = new DevToolsPlugin(config);

// Get event history
const history = plugin.getEventHistory();

// Clear event history
plugin.clearEventHistory();

// Disable plugin at runtime
plugin.disable();

// Re-enable plugin
plugin.enable();
```

## How It Works

### Redux DevTools Integration

The `ReduxDevToolsAdapter` maps BlaC lifecycle events to Redux DevTools actions:

```
Bloc Event                → Redux DevTools Action
─────────────────────────────────────────────────
BlocCreated              → [CounterBloc] CREATED
EventAdded (increment)   → [CounterBloc] IncrementEvent
StateChanged (0 → 1)     → [CounterBloc] STATE_CHANGED
BlocDisposed             → [CounterBloc] DISPOSED
```

Redux DevTools shows a unified state tree of all active Blocs:

```json
{
  "CounterBloc": { "count": 5 },
  "UserBloc": { "name": "Alice", "isLoggedIn": true },
  "CartBloc": { "items": [...], "total": 99.99 }
}
```

## Time-Travel Debugging

**✅ Fully Working!** Time-travel debugging now automatically restores Bloc states when you navigate through Redux DevTools history.

### How It Works

1. Navigate to any point in the Redux DevTools timeline
2. The adapter automatically restores all Bloc states to that point
3. Your app re-renders with the historical state
4. Components react as if the state changes happened naturally
5. **Important:** State changes during time-travel don't create new Redux DevTools actions (prevents timeline pollution)

### Usage

Simply use Redux DevTools' time-travel controls:

- **Slider:** Drag to any point in history
- **Jump:** Click any action in the list
- **Skip/Revert:** Use the action buttons

The adapter will:

- ✅ Restore all Bloc states automatically
- ✅ Trigger re-renders in connected components
- ✅ Maintain state consistency across all Blocs
- ✅ Log restoration results to console
- ✅ Suppress Redux DevTools updates during restoration (prevents recursive timeline pollution)

### Monitoring Time-Travel

Listen for time-travel events if you need custom handling:

```typescript
window.addEventListener('blac-devtools-time-travel', (event) => {
  const { targetState, restoredCount, failedCount } = event.detail;
  console.log(`Restored ${restoredCount} blocs to historical state`);

  if (failedCount > 0) {
    console.warn(`${failedCount} blocs failed to restore`);
  }
});
```

### Limitations

- **Event replay not supported:** Time-travel restores state directly, bypassing event handlers
- **Side effects:** Any side effects in event handlers won't re-execute
- **External state:** State outside of Blocs (e.g., localStorage, API calls) won't be restored
- **Disposed Blocs:** Blocs that were disposed won't be recreated

### Best Practices

1. Keep business logic in Blocs (not in event handlers) for accurate time-travel
2. Avoid side effects during state updates for predictable restoration
3. Use time-travel for debugging state flow, not for undo/redo features (build those separately)

## Security

- ✅ Same-origin message validation
- ✅ Rate limiting (100 messages/sec)
- ✅ Size limits (10MB per message)
- ✅ Safe serialization with circular reference handling
- ✅ Depth limits to prevent infinite recursion
- ⚠️ **Only enable in development** - Never ship DevTools to production

## Browser Support

- Chrome/Edge 90+ (Redux DevTools)
- Firefox 90+ (Redux DevTools)
- Safari (use Redux DevTools standalone app)

## Troubleshooting

### Redux DevTools not appearing?

1. Install the extension: [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
2. Open DevTools (F12) and look for the "Redux" tab
3. Check browser console for connection messages

### Actions not showing up?

1. Verify `enabled: true` in config (or use `import.meta.env.DEV`)
2. Check that Blocs are being created/used
3. Ensure events are being dispatched (not just direct `emit()` calls)

### State shows "error" instead of data?

This means serialization failed (likely circular reference or very deep object).
Check browser console for serialization warnings.

## Examples

See the [playground app](../../apps/playground) for a complete example.

## License

MIT
