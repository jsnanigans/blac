# Proxy Tracking Implementation Quick Reference

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Blac Global Config                       │
│  • proxyDependencyTracking: boolean (default: true)     │
│  • [TODO] proxyMaxDepth: number (default: 50)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            ProxyFactory (ProxyFactory.ts)               │
│                                                          │
│  Three-Level Cache:                                     │
│  1. Target Object (WeakMap)                             │
│  2. Consumer Reference (WeakMap)                        │
│  3. Path String (Map) → Cached Proxy                    │
│                                                          │
│  Functions:                                             │
│  • createStateProxy()  - Recursively proxies state      │
│  • createBlocProxy()   - Tracks bloc getter access      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           BlacAdapter (BlacAdapter.ts)                  │
│                                                          │
│  • getStateProxy()    - Returns cached state proxy      │
│  • getBlocProxy()     - Returns cached bloc proxy       │
│  • trackAccess()      - Records accessed paths          │
│  • commitTracking()   - Atomically updates subscriptions│
└─────────────────────────────────────────────────────────┘
```

## Key Files and Their Roles

| File | Lines | Purpose | Key Finding |
|------|-------|---------|------------|
| `Blac.ts` | 17-24 | Config interface definition | Missing `proxyMaxDepth` option |
| `Blac.ts` | 114-162 | Static config management | No depth limit validation |
| `ProxyFactory.ts` | 12-20 | Three-level cache structure | Uses WeakMap + Map for efficiency |
| `ProxyFactory.ts` | 47-133 | State proxy creation | **NO DEPTH LIMIT** - unlimited recursion |
| `ProxyFactory.ts` | 138-195 | Bloc proxy creation | No recursive proxying |
| `ProxyFactory.ts` | 200-217 | Property descriptor helper | Has `maxDepth = 10` for prototype chain |
| `BlacAdapter.ts` | 299-315 | State proxy caching | Respects config but no depth check |
| `BlacAdapter.ts` | 333-347 | Proxy creation wrappers | Delegates to ProxyFactory |

## Recursive Proxy Creation Flow

### State Access Example
```
User accesses: proxy.user.profile.settings.theme
                    ↓
            createStateProxy called
                 (depth: 0)
                    ↓
        Get handler: prop = "user"
        - Track: "user"
        - Recurse: createStateProxy(value, ..., path="user", depth=1)
                    ↓
        Get handler: prop = "profile"
        - Track: "user.profile"
        - Recurse: createStateProxy(value, ..., path="user.profile", depth=2)
                    ↓
        Get handler: prop = "settings"
        - Track: "user.profile.settings"
        - Recurse: createStateProxy(value, ..., path="user.profile.settings", depth=3)
                    ↓
        Get handler: prop = "theme"
        - Track: "user.profile.settings.theme"
        - Return primitive (no further recursion)
```

### Current Behavior: No Depth Limit
```typescript
// ProxyFactory.ts lines 104-113
if (value && typeof value === 'object') {
  const isPlainObject =
    Object.getPrototypeOf(value) === Object.prototype;
  const isArray = Array.isArray(value);

  if (isPlainObject || isArray) {
    // RECURSE WITHOUT DEPTH CHECK
    return createStateProxy(value, consumerRef, consumerTracker, fullPath);
  }
}
```

## Where Depth Limit Would Be Applied

### 1. Configuration Definition
**File:** `Blac.ts` lines 17-24

```typescript
// ADD THIS:
export interface BlacConfig {
  proxyDependencyTracking?: boolean;
  proxyMaxDepth?: number; // NEW
}
```

### 2. Configuration Defaults
**File:** `Blac.ts` lines 115

```typescript
// UPDATE THIS:
private static _config: BlacConfig = {
  proxyDependencyTracking: true,
  proxyMaxDepth: 50, // NEW
};
```

### 3. Configuration Validation
**File:** `Blac.ts` lines 138-162 (`setConfig` method)

Add validation before line 153:
```typescript
if (
  config.proxyMaxDepth !== undefined &&
  (typeof config.proxyMaxDepth !== 'number' || config.proxyMaxDepth < 1)
) {
  throw new BlacError(
    'BlacConfig.proxyMaxDepth must be a positive number',
    ErrorCategory.VALIDATION,
    ErrorSeverity.FATAL,
  );
}
```

### 4. Proxy Depth Tracking
**File:** `ProxyFactory.ts` lines 47-52 (function signature)

```typescript
// UPDATE THIS:
export const createStateProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
  path = '',
  currentDepth = 0, // NEW PARAMETER
): T => {
  // Add early return at depth limit
  const maxDepth = (Blac.config as any).proxyMaxDepth ?? 50;
  if (currentDepth >= maxDepth) {
    return target; // Return raw object
  }
  
  // ... rest of function
};
```

### 5. Recursive Calls
**File:** `ProxyFactory.ts` lines 111-112 (recursive call in get handler)

```typescript
// UPDATE THIS:
return createStateProxy(
  value,
  consumerRef,
  consumerTracker,
  fullPath,
  currentDepth + 1, // NEW: increment depth
);
```

## Current Test Cases Demonstrating No Depth Limit

### Test: Nested Object Proxying
**File:** `ProxyFactory.test.ts` lines 97-170

```typescript
const nestedObject = {
  user: {
    name: 'John',
    profile: {
      email: 'john@example.com',
      settings: {
        theme: 'dark',        // 4 levels deep
        notifications: true,
      },
    },
  },
  metadata: {
    created: new Date('2024-01-01'),
    tags: ['user', 'admin'],
  },
};

// Test creates proxies for all 4 levels of nesting
const proxy = ProxyFactory.createStateProxy({
  target: nestedObject,
  consumerRef,
  consumerTracker: tracker,
});

const theme = proxy.user.profile.settings.theme; // NO LIMIT STOPS THIS
```

### Test: Deep Nesting Performance
**File:** `proxy-behavior.test.ts` lines 37-68

```typescript
interface NestedState {
  level1: {
    level2: {
      level3: {
        value: number;  // 3 levels deep, still no limit
      };
    };
  };
}
```

## Cache Statistics Tracking

**File:** `ProxyFactory.ts` lines 22-30

Current stats object:
```typescript
const stats = {
  stateProxiesCreated: 0,          // Count of state proxies
  classProxiesCreated: 0,          // Count of bloc proxies
  cacheHits: 0,                    // Cache hits at L3
  cacheMisses: 0,                  // Cache misses at L3
  totalProxiesCreated: 0,          // Total = state + class
  nestedProxiesCreated: 0,         // Non-root proxies
};
```

**Proposed addition for depth limit feature:**
```typescript
depthLimitHits: 0,        // Times depth limit prevented proxy creation
maxDepthReached: 0,       // Maximum depth actually reached
```

## Configuration Usage Example

After implementation, users could:

```typescript
// Limit proxy depth to 10 levels
Blac.setConfig({
  proxyDependencyTracking: true,
  proxyMaxDepth: 10,
});

// Or use default (50)
Blac.setConfig({
  proxyDependencyTracking: true,
});

// Disable proxies entirely (high depth limit equivalent)
Blac.setConfig({
  proxyDependencyTracking: false, // Overrides depth limit
});
```

## Performance Implications

### Memory Impact
- **Current:** Unlimited proxies for all nested levels
- **With limit:** Only proxies up to configured depth
- **Cache growth:** Limited by depth + consumers + paths

### Stack Impact  
- **Current:** Could theoretically overflow with extremely deep objects
- **With limit:** Guaranteed maximum stack depth during proxy creation

### Initialization Time
- **Current:** Proportional to access depth
- **With limit:** Bounded by configured depth

## Backward Compatibility Strategy

1. **Default value:** 50 (much higher than typical needs)
2. **Graceful degradation:** Return raw object at limit
3. **No breaking changes:** Feature is purely additive
4. **Opt-in:** Users explicitly set `proxyMaxDepth`

## Testing Strategy for Depth Limit Feature

1. **Basic depth enforcement**
   - Set `proxyMaxDepth: 3`
   - Access deeply nested object
   - Verify raw objects returned beyond depth 3

2. **Configuration validation**
   - Test `proxyMaxDepth: -1` (should throw)
   - Test `proxyMaxDepth: 0` (should throw)
   - Test `proxyMaxDepth: "invalid"` (should throw)

3. **Statistics tracking**
   - Verify `depthLimitHits` incremented correctly
   - Verify `maxDepthReached` recorded accurately

4. **Backward compatibility**
   - Default depth (50) allows all existing tests to pass
   - High depth limit (1000) behaves like no limit

5. **Interaction with other features**
   - Works with `proxyDependencyTracking: false`
   - Works with manual dependencies
   - Works with isolated and non-isolated blocs

## References

- Full exploration report: `PROXY_TRACKING_EXPLORATION.md`
- Global config: `/packages/blac/src/Blac.ts`
- Proxy creation: `/packages/blac/src/adapter/ProxyFactory.ts`
- React integration: `/packages/blac/src/adapter/BlacAdapter.ts`
- Tests: `/packages/blac/src/adapter/__tests__/ProxyFactory.test.ts`
