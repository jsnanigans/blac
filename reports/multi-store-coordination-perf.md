# Investigation: Multi-Store Coordination Performance (3x slower than Zustand)

## Bottom Line

**Root Cause**: Registry lifecycle event emission on every state change across 3 independent stores, compounded by additional change detection logic in Blac's `patch()` method.

**Key Overhead**:

1. Registry emit chain: StateContainer → registry.emit() → plugin notification callbacks (even with no plugins)
2. Change detection in `patch()`: O(n) field iteration before state merge
3. System event emission overhead

**Fix Location**: `packages/blac-core/src/core/StateContainer.ts:239-270` (applyState method)

**Confidence**: High

## What's Happening

The benchmark runs 1,000 iterations updating three independent counters (counterA, counterB, counterC):

```javascript
for (let i = 0; i < 1000; i++) {
  counterA.patch({ count: i });
  counterB.patch({ count: i * 2 });
  counterC.patch({ count: i * 3 });
}
```

Zustand completes this in ~100µs; Blac takes ~300µs (3x slower). That's approximately 0.3µs per individual update vs 0.1µs in Zustand — 200 nanoseconds extra per operation.

## Why It Happens

### Primary Cause: Registry Lifecycle Events on Every State Change

**Location**: `packages/blac-core/src/core/StateContainer.ts:253-269` (applyState method)

When `patch()` → `emit()` → `applyState()` executes, BlaC emits lifecycle events at multiple levels:

1. **System event emission** (line 253-256):

   ```typescript
   this.emitSystemEvent('stateChanged', {
     state: newState,
     previousState,
   });
   ```

2. **Registry event emission** (line 269):

   ```typescript
   getRegistry().emit('stateChanged', this, previousState, newState);
   ```

3. **Listener notification** (line 258-267):
   ```typescript
   if (this._listeners.size > 0) {
     const listeners = Array.from(this._listeners);
     for (const listener of listeners) {
       listener(newState);
     }
   }
   ```

Even with zero listeners and zero plugins, the `registry.emit()` call at line 269 still creates overhead:

- Calls `StateContainerRegistry.emit()` (`packages/blac-core/src/core/StateContainerRegistry.ts:517`)
- Checks if listeners exist: `if (!listeners || listeners.size === 0) return`
- This is a Map lookup + Set size check on **every state change**

### Secondary Cause: Change Detection in patch()

**Location**: `packages/blac-core/src/core/Cubit.ts:17-32`

The `patch()` method performs O(n) field iteration to detect changes:

```typescript
let hasChanges = false;
for (const key in partial) {
  if (!Object.is((current as any)[key], (partial as any)[key])) {
    hasChanges = true;
    break;
  }
}
if (hasChanges) {
  this[EMIT]({ ...current, ...partial } as S);
}
```

For a single-field object like `{ count: i }`, this still iterates at least once. Zustand's `setState()` doesn't do this pre-check — it merges immediately and relies on object identity comparison at the state level.

### Architecture Difference: Event-Driven vs Direct

**Zustand** (fast path):

```typescript
demo.setState({ count: i });
// Internal: Shallow merge, trigger listeners synchronously, done
```

**Blac** (slower path):

```typescript
counter.patch({ count: i });
// → emit() [symbol call]
// → applyState() [State Container lifecycle]
// → emitSystemEvent('stateChanged') [system events]
// → listeners notification [direct listeners]
// → registry.emit('stateChanged', ...) [registry lifecycle]
//   → plugin notification callbacks [plugin hooks]
```

Blac has 4 event dispatch points vs Zustand's 1.

## Evidence

### Benchmark Code (apps/perf/src/libraries/blac/pure-state.ts:200-207)

```typescript
'multi-store coordination': (h) => {
  const { counterA, counterB, counterC } = h as BlacHandle;
  for (let i = 0; i < 1000; i++) {
    counterA.patch({ count: i });
    counterB.patch({ count: i * 2 });
    counterC.patch({ count: i * 3 });
  }
},
```

### Zustand Equivalent (apps/perf/src/libraries/zustand/pure-state.ts:156-163)

```typescript
'multi-store coordination': (h) => {
  const { counterA, counterB, counterC } = h as ZustandHandle;
  for (let i = 0; i < 1000; i++) {
    counterA.setState({ count: i });
    counterB.setState({ count: i * 2 });
    counterC.setState({ count: i * 3 });
  }
},
```

### StateContainer Event Chain (packages/blac-core/src/core/StateContainer.ts:239-270)

Key findings:

- Line 244: Identity check `if (this._state === newState) return` — **only early exit**
- Line 253-256: System event emission (empty by default, but still called)
- Line 258-267: Listener notification (skipped if no listeners)
- Line 269: **Registry emit called on every state change** — this is the hot path

### Registry Emit (packages/blac-core/src/core/StateContainerRegistry.ts:517-531)

Even with no listeners, overhead includes:

- Map lookup: `this.listeners.get(event)`
- Set size check: `listeners.size === 0`
- Only then early returns

---

## Next Steps

1. **Profile the actual bottleneck**: Use Chrome DevTools Performance tab on the benchmark to confirm which lifecycle step dominates (likely registry.emit or listener notification)

2. **Consider lazy plugin initialization**: Currently PluginManager is initialized on first registry creation even if no plugins are installed. Defer PluginManager setup until first plugin.install() call.

3. **Optimize registry emit**: Skip event listeners registration entirely if no listeners are ever registered (zero-cost abstraction when not used)

4. **Profile change detection cost**: Measure if the patch() field iteration dominates. If not significant (<10% of total), leave as-is for safety.

5. **Consider async plugin events**: Currently synchronous plugin hooks run on every state change. Consider batching or async notification for dev-only plugins.

## Risks

- **Plugin ecosystem dependency**: Any optimization that defers plugin initialization must maintain backward compatibility for code that expects plugins to initialize eagerly
- **System event users**: If anything depends on synchronous 'stateChanged' system events, removing that emission would break it
- **Change detection assumptions**: The patch() pre-check prevents emitting identical state twice. Some code may rely on always getting a notification
