# Blac Performance Analysis

## Root Cause Analysis: Why Blac is Slow vs Zustand

### #1 — `captureStackTrace()` on Every Emit (~80-90% of the gap)

`StateContainer.ts:38`:

```ts
static enableStackTrace = true;  // ON BY DEFAULT
```

Every `applyState()` call (line 347) does:

```ts
const stackTrace = this.captureStackTrace();
```

This creates `new Error()`, parses the stack string with `.split('\n')`, runs multiple `.includes()` checks on every line, then runs a regex on each remaining line. Costs **~5-8µs per call** in V8.

The numbers prove it:

| Benchmark                | Emits per run   | Blac time | Time/emit | Zustand time |
| ------------------------ | --------------- | --------- | --------- | ------------ |
| rapid counter            | 1000            | 9.3ms     | ~9.3µs    | 0.1ms        |
| nested object update     | 1000            | 7.4ms     | ~7.4µs    | 0.1ms        |
| derived state read       | 2000 (2 stores) | 19.0ms    | ~9.5µs    | 0.1ms        |
| multi-store coordination | 3000 (3 stores) | 29.6ms    | ~9.9µs    | 0.2ms        |

Per-emit cost is consistent at ~7-10µs, matching expected stack trace overhead. Slowdown multiplier scales linearly with the number of emits per iteration.

The production guard at line 246 (`process.env?.NODE_ENV === 'production'`) doesn't help in the browser benchmark since Vite dev mode doesn't set that.

### #2 — `Array.from(this._listeners)` on Every Emit

Line 338 copies the entire listener Set to a new Array on every state change — even when there are zero listeners. For `notify 100 subscribers` (100 listeners × 100 emits), that's 10,000 unnecessary array copies.

### #3 — `patch()` Double Work

`patch()` in `Cubit.ts` does:

1. A `for...in` loop with `Object.is()` per key to detect changes
2. Creates a closure `(c) => ({ ...c, ...partial })`
3. The closure spreads the entire state object

Zustand's `setState()` just does `Object.assign({}, state, partial)` — one step.

This explains why `rapid counter` (9.3ms, uses `patch`) is slower than `nested object update` (7.4ms, uses `emit` directly).

### #4 — Per-emit Overhead Tax

Every emit also pays:

- `getRegistry()` function call + `Map.get('stateChanged')` lookup
- `emitSystemEvent()` with `Map.get()` lookup
- `Date.now()` call (line 356)

Small individually but compounds across 1000+ iterations.

---

## Recommended Fixes (by impact)

### Fix 1 — Disable/lazy-load stack traces (fixes ~80-90% of the gap)

**Option A** — Default to off:

```ts
static enableStackTrace = false;
```

**Option B** (better) — Lazy capture via thunk, only evaluate when a listener actually needs it:

```ts
// Instead of capturing eagerly:
const stackTrace = this.captureStackTrace();
getRegistry().emit('stateChanged', this, previousState, newState, stackTrace);

// Pass a lazy getter:
getRegistry().emit('stateChanged', this, previousState, newState, () =>
  this.captureStackTrace(),
);
```

Devtools only pay the cost when they're actually connected.

### Fix 2 — Iterate the Set directly instead of copying to Array

```diff
- const listeners = Array.from(this._listeners);
- for (const listener of listeners) {
+ for (const listener of this._listeners) {
```

### Fix 3 — Remove `Date.now()` from the hot path

Either drop `lastUpdateTimestamp` or only set it when devtools/debug is active.

### Fix 4 — Optimize `patch()` for single-key updates

Skip the intermediate closure — emit directly:

```ts
if (hasChanges) {
  this[EMIT]({ ...current, ...partial } as S);
}
```

---

## Expected Impact

Fix 1 alone would likely bring Blac from **4.51x geometric mean down to near ~1.0x** for pure-state benchmarks. The remaining fixes are incremental improvements on top of that.
