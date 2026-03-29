# Investigation: Consumer Registration Not Working in Examples App

## Bottom Line

**Root Cause**: `registerConsumer()` silently fails when called with an `instanceId` that doesn't exist in `DevToolsBrowserPlugin.instanceCache`. The IDs should match in normal operation, but the plugin has no logging/error reporting when they don't.

**Issue**: Line 313 in `DevToolsBrowserPlugin.ts` has an early return with no warning: `if (!this.instanceCache.has(instanceId)) return;`

**Fix Location**: `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts:313` and surrounding consumer registration logic

**Confidence**: High - confirmed by examining test at `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.consumers.test.ts:67-75`

## What's Happening

When a component mounts and uses `useBloc()`, it should register as a consumer:

1. Component renders with `useBloc(SomeBloc)`
2. `useBloc` hook calls `useEffect` which calls `window.__BLAC_DEVTOOLS__.registerConsumer(instanceId, consumerId, componentName)`
3. `DevToolsBrowserPlugin.registerConsumer()` is invoked
4. **The problem**: If `instanceId` isn't in `instanceCache`, the entire registration silently fails with no error, log, or event

## Why It Happens

**The ID should exist** because the flow is:

1. `acquire(BlocClass, instanceKey)` creates instance and calls `initConfig(config)` (StateContainerRegistry.ts:168)
2. `initConfig()` triggers `getRegistry().emit('created', this)` (StateContainer.ts:93)
3. This calls `DevToolsBrowserPlugin.onInstanceCreated()` which adds to `instanceCache` with key `metadata.id` (line 111)
4. Then `useEffect` in hook runs and calls `registerConsumer()`

**But if something goes wrong**: The component doesn't know. It silently fails because:

- Line 313 in `DevToolsBrowserPlugin.ts` has `if (!this.instanceCache.has(instanceId)) return;` with no error/warning
- No event is emitted on failure
- No console error is logged

## Evidence

**Key code path**:

- Setup: `main.tsx` lines 15-19 - DevToolsBrowserPlugin installed before app renders
- Global API exposed: `DevToolsBrowserPlugin.ts:627-653` - `exposeGlobalAPI()` creates `window.__BLAC_DEVTOOLS__`
- Registration call: `useBloc.ts:212-216` - calls `devtools.registerConsumer()`
- Silent failure point: `DevToolsBrowserPlugin.ts:313` - early return with no logging

**Test evidence**: `DevToolsBrowserPlugin.consumers.test.ts:67-75` explicitly tests that non-existent instance IDs are silently ignored.

## Next Steps

1. **Add defensive logging** to `registerConsumer()` (line 313 area) to console.warn when instance doesn't exist in cache
2. **Investigate actual failure mode** by adding console logs to track what instanceIds are being passed vs what exists in cache
3. **Consider emitting diagnostic event** when registration fails, so UI can display warning
4. **Check if instances are being created before plugin installs** - ensure plugin is installed before any components mount
5. **Verify instanceId matches exactly** - confirm the affix parameter in StateContainer.ts line 89 matches what's passed from useBloc

## Risks

- Consumers not being tracked means DevTools UI shows no component consumers
- Silent failure makes debugging difficult
- No way to know if registration succeeded or failed
- Could mask timing issues or plugin installation problems
