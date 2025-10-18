# BlaC Proxy Tracking Implementation Exploration

## Executive Summary

The BlaC library implements sophisticated proxy-based dependency tracking for automatic React component re-render optimization. Currently, there is **no depth limit enforcement** in the proxy tracking system—proxies are created recursively for arbitrarily deep object hierarchies. This exploration documents the current implementation and identifies where a depth limit feature should be added.

## 1. Global Configuration Architecture

### 1.1 Configuration Definition
**File:** `/Users/brendanmullins/Projects/blac/packages/blac/src/Blac.ts`

The global `BlacConfig` interface is defined at lines 17-24:

```typescript
export interface BlacConfig {
  /**
   * Whether to enable proxy dependency tracking for automatic re-render optimization.
   * When false, state changes always cause re-renders unless dependencies are manually specified.
   * Default: true
   */
  proxyDependencyTracking?: boolean;
}
```

**Current Configuration Options:**
- `proxyDependencyTracking: boolean` (default: `true`)

### 1.2 Configuration Management
**Location:** `Blac.ts` lines 114-162

The configuration is managed statically with the following methods:

| Method | Purpose | Lines |
|--------|---------|-------|
| `static _config: BlacConfig` | Private static config object | 115 |
| `static get config()` | Returns readonly copy of config | 120-122 |
| `static resetConfig()` | Reset to defaults | 127-131 |
| `static setConfig(config: Partial<BlacConfig>)` | Update configuration with validation | 138-162 |

**Key Implementation Details:**
- Configuration is stored privately and accessed via getter
- `setConfig()` performs type validation on `proxyDependencyTracking` (must be boolean)
- Config updates are merged with existing config (partial updates supported)
- Returns readonly copy to prevent external mutations
- Logs config updates if `Blac.enableLog` is true

**Usage Example:**
```typescript
Blac.setConfig({
  proxyDependencyTracking: true, // Enable proxy tracking
});
```

## 2. ProxyFactory Implementation

### 2.1 File Location & Structure
**File:** `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/ProxyFactory.ts`

The ProxyFactory is the core component responsible for creating and managing proxies with dependency tracking.

### 2.2 Three-Level Cache Structure
**Lines 12-20:**

```typescript
const proxyCache = new WeakMap<
  object, // target object
  WeakMap<
    object, // consumerRef
    Map<string, any> // path -> proxy
  >
>();
```

**Cache Hierarchy:**
1. **Level 1:** Target object (WeakMap) → Level 2 cache
2. **Level 2:** Consumer reference (WeakMap) → Level 3 cache
3. **Level 3:** Path string (Map) → Cached proxy

This design enables:
- Efficient garbage collection (WeakMap for objects)
- Consumer-specific proxy tracking
- Path-based proxy lookup for nested objects

### 2.3 Proxy Statistics
**Lines 22-30:**

The system tracks comprehensive proxy statistics:

```typescript
const stats = {
  stateProxiesCreated: 0,
  classProxiesCreated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProxiesCreated: 0,
  nestedProxiesCreated: 0,
};
```

### 2.4 State Proxy Creation (`createStateProxy`)
**Lines 47-133:**

This function creates proxies for state objects with recursive nested proxy support:

**Key Parameters:**
- `target: T` - The object to proxy
- `consumerRef: object` - Reference to consuming component
- `consumerTracker: ConsumerTracker` - Tracker for recording access
- `path: string` - Current path (for nested proxies, default: `''`)

**Recursive Depth Behavior (Lines 104-113):**

```typescript
// Recursively proxy nested objects and arrays
if (value && typeof value === 'object') {
  const isPlainObject =
    Object.getPrototypeOf(value) === Object.prototype;
  const isArray = Array.isArray(value);

  if (isPlainObject || isArray) {
    // Recursive call with full path
    return createStateProxy(value, consumerRef, consumerTracker, fullPath);
  }
}
```

**Current Behavior:**
- **No depth limit enforcement**
- Recursively creates nested proxies on every property access
- Appends path segments: `"user.profile.address.city"`
- Creates proxies for plain objects and arrays
- Skips Date objects, custom class instances, and primitives

**Path Tracking (Line 93):**

```typescript
const fullPath = path ? `${path}.${String(prop)}` : String(prop);
```

Builds full paths for every accessed property, enabling precise dependency tracking.

### 2.5 Bloc Proxy Creation (`createBlocProxy`)
**Lines 138-195:**

Creates proxies for bloc instances to track getter access:

**Key Differences from State Proxies:**
- Uses empty string `''` as cache key (no nested paths)
- Only tracks getter properties (not methods)
- Captures primitive values for tracking
- Does NOT recursively proxy nested objects

### 2.6 Property Descriptor Helper
**Lines 200-217:**

```typescript
const findPropertyDescriptor = (
  obj: any,
  prop: string | symbol,
  maxDepth = 10, // ← EXISTING DEPTH LIMIT
): PropertyDescriptor | undefined => {
  let current = obj;
  let depth = 0;

  while (current && depth < maxDepth) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) return descriptor;

    current = Object.getPrototypeOf(current);
    depth++;
  }

  return undefined;
};
```

**Important:** This helper has a `maxDepth = 10` limit for prototype chain traversal (protects against infinite prototype chains).

### 2.7 ProxyFactory Export Object
**Lines 220-293:**

Exports a compatibility interface with methods:
- `createStateProxy(options)` - Create state proxy
- `createClassProxy(options)` - Create bloc instance proxy
- `getProxyState(options)` - Helper for state proxies
- `getProxyBlocInstance(options)` - Helper for bloc proxies
- `getStats()` - Get proxy statistics with cache hit rate
- `resetStats()` - Reset statistics

## 3. BlacAdapter Integration

### 3.1 Proxy Usage in BlacAdapter
**File:** `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts`

The `BlacAdapter` orchestrates proxy creation within the React component lifecycle.

### 3.2 State Proxy Caching
**Lines 299-315:**

```typescript
getStateProxy = (): BlocState<InstanceType<B>> => {
  // If using manual dependencies or proxy tracking is disabled, return raw state
  if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
    return this.blocInstance.state;
  }

  // Return cached proxy if state hasn't changed
  const currentState = this.blocInstance.state;
  if (this.cachedStateProxy && this.lastProxiedState === currentState) {
    return this.cachedStateProxy;
  }

  // Create new proxy for new state
  this.lastProxiedState = currentState;
  this.cachedStateProxy = this.createStateProxy({ target: currentState });
  return this.cachedStateProxy!;
};
```

**Key Points:**
- Respects `Blac.config.proxyDependencyTracking` setting (line 301)
- Caches proxy as long as state object reference hasn't changed
- Returns raw state when:
  - Using manual dependencies (`this.isUsingDependencies`)
  - Proxy tracking disabled in config

### 3.3 Proxy Creation Methods
**Lines 333-347:**

```typescript
createStateProxy = <T extends object>(props: { target: T }): T => {
  return ProxyFactory.createStateProxy({
    target: props.target,
    consumerRef: this.componentRef.current,
    consumerTracker: this as any,
  });
};

createClassProxy = <T extends object>(props: { target: T }): T => {
  return ProxyFactory.createClassProxy({
    target: props.target,
    consumerRef: this.componentRef.current,
    consumerTracker: this as any,
  });
};
```

These methods pass the adapter instance as the `consumerTracker`, implementing the tracking interface.

## 4. Dependency Tracking Flow

### 4.1 Access Tracking
**File:** `BlacAdapter.ts` lines 162-190

```typescript
trackAccess(
  _consumerRef: object,
  type: 'state' | 'class',
  path: string,
  value?: any,
): void {
  // V2: Only track if tracking is active (during render)
  if (!this.isTrackingActive) {
    return;
  }

  const fullPath = type === 'class' ? `_class.${path}` : path;

  // V2: Collect in pending dependencies during render
  this.pendingDependencies.add(fullPath);
  this.trackedPaths.add(fullPath);

  if (!this.subscriptionId) {
    // No subscription ID yet - store for later
    this.pendingTrackedPaths.add(fullPath);
    if ((Blac.config as any).logLevel === 'debug') {
      Blac.log(`[BlacAdapter] trackAccess storing pending path: ${path}`);
    }
  } else {
    // V2: Immediately apply to subscription for backwards compatibility
    this.blocInstance.trackAccess(this.subscriptionId, fullPath, value);
  }
}
```

Every property access during render is tracked with its full path.

### 4.2 Leaf Path Filtering
**Lines 470-530:**

The adapter filters intermediate paths, keeping only the most specific (leaf) paths:

```typescript
private filterLeafPaths(paths: Set<string>): Set<string> {
  // Array/Object methods and properties...
  const metaProperties = new Set([
    'map', 'filter', 'reduce', 'forEach', 'some', 'every', 'find', 'findIndex',
    'includes', 'indexOf', 'lastIndexOf', 'join', 'slice', 'concat', 'flat', 'flatMap',
    'length',
    'toString', 'valueOf', 'hasOwnProperty', 'propertyIsEnumerable',
  ]);

  // Normalize paths (replace meta-property paths with parent paths)
  // Filter out intermediate paths, keeping only leaf paths
  // ...
}
```

## 5. Current Test Coverage

### 5.1 Nested Object Handling Test
**File:** `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/__tests__/ProxyFactory.test.ts` lines 97-170

Tests demonstrate nested proxy behavior:

```typescript
it('should handle nested object proxying', () => {
  const proxy = ProxyFactory.createStateProxy({
    target: nestedObject,
    consumerRef,
    consumerTracker: tracker,
  });

  // Access nested properties
  const email = proxy.user.profile.email;
  const theme = proxy.user.profile.settings.theme;

  expect(email).toBe('john@example.com');
  expect(theme).toBe('dark');

  // V3 change: Full path tracking - should track ALL accessed paths
  expect(tracker.trackAccess).toHaveBeenCalledTimes(7);
  // Verifies all paths: user, user.profile, user.profile.email, etc.
});
```

The test object has 4 levels of nesting:
```
user
  └── profile
      └── email
      └── settings
          └── theme
```

No depth restriction prevents creating proxies for arbitrary levels.

### 5.2 Performance Test
**File:** `/Users/brendanmullins/Projects/blac/packages/blac/src/__tests__/performance/proxy-behavior.test.ts` lines 37-68

Tests caching effectiveness with deep nesting:

```typescript
it('should create nested proxies with effective caching (V3)', () => {
  const cubit = new NestedStateCubit();
  // ... state has 3 nested levels

  // First access: creates proxies for each level
  const value1 = proxy.level1.level2.level3.value;
  const stats1 = ProxyFactory.getStats();

  expect(stats1.totalProxiesCreated).toBeGreaterThan(1);
  expect(stats1.stateProxiesCreated).toBeGreaterThan(1);

  // Second access: uses cached proxies
  const value2 = proxy.level1.level2.level3.value;
  const stats2 = ProxyFactory.getStats();

  expect(stats2.cacheHits).toBeGreaterThan(0);
  expect(stats2.totalProxiesCreated).toBe(0);
});
```

## 6. Potential Performance Concerns

### 6.1 Unbounded Recursion Risk

**Current Implementation Issues:**
1. **No depth limit** in `createStateProxy` recursive calls
2. **Unlimited proxy creation** for deeply nested objects
3. **Memory overhead** from nested proxy cache entries
4. **Stack risk** if objects are extremely deep (though JS engines handle this)

### 6.2 Cache Growth

The three-level cache structure can grow large with:
- Many different state objects
- Multiple consumers accessing same object
- Deep object hierarchies
- Frequent component mounting/unmounting

### 6.3 Property Descriptor Chain

The existing `maxDepth = 10` in `findPropertyDescriptor` (line 203) limits prototype chain traversal but doesn't affect state object depth.

## 7. Where to Add Depth Limit Feature

### 7.1 Configuration Extension

**File to modify:** `/Users/brendanmullins/Projects/blac/packages/blac/src/Blac.ts`

Current `BlacConfig` (lines 17-24) should be extended:

```typescript
export interface BlacConfig {
  proxyDependencyTracking?: boolean;
  proxyMaxDepth?: number; // NEW: Add this
}
```

Add to defaults (line 115):
```typescript
private static _config: BlacConfig = {
  proxyDependencyTracking: true,
  proxyMaxDepth: 50, // NEW: Default to reasonable limit
};
```

Add validation in `setConfig()` (line 138):
```typescript
if (
  config.proxyMaxDepth !== undefined &&
  (typeof config.proxyMaxDepth !== 'number' || config.proxyMaxDepth < 1)
) {
  // Throw validation error
}
```

### 7.2 ProxyFactory Implementation

**File to modify:** `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/ProxyFactory.ts`

Modify `createStateProxy` function (line 47):

```typescript
export const createStateProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
  path = '',
  currentDepth = 0, // NEW: Track depth
): T => {
  // Add depth check before recursing
  const maxDepth = (Blac.config as any).proxyMaxDepth ?? 50;
  if (currentDepth >= maxDepth) {
    return target; // Return raw object at depth limit
  }

  // ... existing cache logic ...

  const proxy = new Proxy(target, {
    get(obj: T, prop: string | symbol): any {
      // ... existing get logic ...
      
      if (value && typeof value === 'object') {
        const isPlainObject = /* ... */;
        const isArray = /* ... */;

        if (isPlainObject || isArray) {
          // Pass incremented depth
          return createStateProxy(
            value,
            consumerRef,
            consumerTracker,
            fullPath,
            currentDepth + 1, // NEW: Increment depth
          );
        }
      }

      return value;
    },
    // ... existing set/deleteProperty ...
  });

  return proxy;
};
```

## 8. Test Coverage Needed

Tests should be added to verify:

1. **Depth limit enforcement**
   - Proxies stop being created at configured depth
   - Raw objects returned beyond depth limit
   - Statistics reflect depth stops

2. **Configuration integration**
   - `Blac.setConfig({ proxyMaxDepth: 10 })`
   - Validation of non-numeric or negative values
   - Default value application

3. **Performance characteristics**
   - Cache size growth limited by depth
   - Memory usage improvements
   - Statistics reporting

4. **Backward compatibility**
   - Default depth allows existing tests to pass
   - Disabled proxy tracking still works
   - High depth limits behave like no limit

## 9. Key Files Summary

| File | Purpose | Key Sections |
|------|---------|--------------|
| `/packages/blac/src/Blac.ts` | Global config management | Lines 17-24, 114-162 |
| `/packages/blac/src/adapter/ProxyFactory.ts` | Proxy creation with caching | Lines 47-133 (createStateProxy) |
| `/packages/blac/src/adapter/BlacAdapter.ts` | Integration with React | Lines 299-347 |
| `/packages/blac/src/adapter/__tests__/ProxyFactory.test.ts` | Proxy tests | Lines 97-170 (nested) |
| `/packages/blac/src/__tests__/performance/proxy-behavior.test.ts` | Performance tests | Lines 37-68 |

## 10. Implementation Notes

**Considerations for depth limit feature:**

1. **Default value:** Should be high enough (50-100) to not break existing code
2. **Graceful degradation:** Return raw object at limit rather than throwing error
3. **Statistics:** Track when depth limit is hit in `ProxyFactory.getStats()`
4. **Documentation:** Update CLAUDE.md with new config option
5. **Backward compatibility:** Feature should be opt-in via configuration

