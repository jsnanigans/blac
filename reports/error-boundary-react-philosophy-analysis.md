# Error Boundary Behavior: React Philosophy Analysis

## The Core Question

**When a component fails to render due to an error caught by an error boundary, should it remain subscribed to the bloc's state, or should it be treated as if it unmounted?**

## React's Philosophy

### React's Behavior on Error

When an error boundary catches an error during component render:

1. React **unmounts the entire component tree** below the error boundary
2. All cleanup effects (`useEffect` return functions) are called
3. The component is treated **as if it unmounted**
4. The error boundary renders its fallback UI

From React's perspective: **The component has unmounted. Period.**

### useSyncExternalStore Contract

React's `useSyncExternalStore` expects:

- `subscribe(callback)` is called when the component mounts
- `unsubscribe()` is called when the component unmounts
- After unmount, the store should stop notifying that component

**When an error boundary catches an error:**

- The component's cleanup runs
- `useEffect` cleanup calls `adapter.unmount()`
- This SHOULD disconnect from the store

## Current BlaC Behavior

### What Happens Now

1. Component renders, calls `useBloc()`, subscribes to bloc
2. Component throws error → error boundary catches
3. React unmounts component → `adapter.unmount()` is called
4. For **shared blocs** (default), `unmount()` doesn't dispose the bloc immediately
5. The bloc may transition to `DISPOSAL_REQUESTED` or remain `ACTIVE` depending on consumer count
6. Error recovery code tries to `emit()` new state
7. If bloc is not `ACTIVE`, emit is silently ignored

### The Problem

The current behavior is **inconsistent**:

- The component unmounted (React's perspective)
- But the bloc's lifecycle state may change in ways that prevent state updates
- This breaks error recovery patterns

## Comparison with Other Libraries

### Redux

```typescript
// Redux + Error Boundary
function Component() {
  const dispatch = useDispatch();  // Never unmounts the store
  const state = useSelector(selectUser);

  if (state.error) throw new Error('Failed');
}

// Recovery:
function ErrorFallback() {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(resetError())}>Retry</button>;  // ✅ Works
}
```

**Redux behavior:** Global store stays active, any component can dispatch at any time.

### Zustand

```typescript
// Zustand + Error Boundary
const useStore = create((set) => ({
  value: 0,
  reset: () => set({ value: 0 })
}));

function Component() {
  const value = useStore(state => state.value);
  if (value > 10) throw new Error('Too high');
}

// Recovery:
function ErrorFallback() {
  const reset = useStore(state => state.reset);
  return <button onClick={reset}>Reset</button>;  // ✅ Works
}
```

**Zustand behavior:** Store is always active, subscriptions are per-component but store persists.

### Jotai

```typescript
// Jotai + Error Boundary
const countAtom = atom(0);

function Component() {
  const [count] = useAtom(countAtom);
  if (count > 10) throw new Error('Too high');
}

// Recovery:
function ErrorFallback() {
  const [, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount(0)}>Reset</button>;  // ✅ Works
}
```

**Jotai behavior:** Atoms are always accessible, component subscription is independent of atom lifecycle.

### Recoil

Similar to Jotai - atoms are always active and accessible.

## The Pattern All Libraries Follow

**Universal pattern:**

1. **Store/Atom/State** lifecycle is independent of component lifecycle
2. Components subscribe/unsubscribe, but this doesn't affect the store's ability to change state
3. Any component (including error boundaries) can access and modify the store at any time
4. Error recovery "just works" because stores are always active

## BlaC's Current Design Issue

BlaC tries to be smart about lifecycle:

- Shared blocs don't immediately dispose when components unmount
- But they may transition to non-`ACTIVE` states
- This breaks the "always accessible" pattern that users expect

**The issue:** BlaC's lifecycle management is **too coupled** to component mounting/unmounting.

## What Should BlaC Do?

### Option 1: Follow React's Philosophy Strictly (Current Approach)

**Treating error as unmount:**

- Component unmounts → subscription ends
- Bloc may become inactive
- Error recovery requires `reactivate()` or similar

**Pros:**

- Respects React's component lifecycle semantics
- Clear boundary between mounted and unmounted

**Cons:**

- Breaks user expectations (error recovery should "just work")
- Inconsistent with other state management libraries
- Requires manual intervention for a common pattern

### Option 2: Align with State Management Philosophy (Recommended)

**Separate bloc lifecycle from component lifecycle:**

- Component unmounts → subscription ends (respect React)
- **But bloc remains ACTIVE** (respect state management patterns)
- Bloc only becomes inactive when explicitly disposed or no longer needed

**Implementation:**

```typescript
// In BlacAdapter.unmount():
unmount() {
  // Unsubscribe from bloc (respect React unmount)
  this.unsubscribe?.();

  // For shared blocs, DON'T change lifecycle state
  // Let the bloc's instance management handle disposal
  // Only request disposal for isolated blocs
  if (this.blocInstance._isolated) {
    this.blocInstance.requestDisposal();
  }
}
```

**Pros:**

- ✅ Error recovery "just works" like other libraries
- ✅ Matches user expectations
- ✅ Still respects React's unmount semantics (unsubscribe happens)
- ✅ Shared blocs behave like Redux stores / Zustand stores
- ✅ No new public API needed

**Cons:**

- Slightly changes internal lifecycle behavior
- Need to ensure blocs eventually dispose when truly unused

### Option 3: Add Explicit Error Recovery API

Keep current behavior but add `bloc.reset()` or `bloc.recover()`:

```typescript
// In error boundary:
function ErrorFallback({ error }: { error: Error }) {
  const cubit = Blac.getInstance().getBloc(UserCubit);

  return (
    <button onClick={() => {
      cubit.recover();  // or cubit.reactivate()
      cubit.emit(initialState);
      // remount component
    }}>
      Retry
    </button>
  );
}
```

**Pros:**

- Explicit, clear intent
- Maintains strict lifecycle guarantees

**Cons:**

- Requires users to learn BlaC-specific patterns
- Doesn't "just work" like other libraries
- More boilerplate

## Recommendation

**Implement Option 2: Align with State Management Philosophy**

### Rationale

1. **User Expectations:** When users choose BlaC over Redux/Zustand/Jotai, they still expect shared state to behave like... shared state. It should always be accessible.

2. **React's Unmount ≠ Store Disposal:** React unmounting a component should end that component's subscription, but shouldn't affect the store's ability to change state.

3. **Error Boundaries are Common:** Error recovery is a standard pattern. It shouldn't require special BlaC-specific APIs.

4. **Principle of Least Surprise:** If every other major state library allows state changes during error recovery, BlaC should too.

### Implementation

**Change shared bloc behavior:**

- Component unmount (even from error) ends subscription but keeps bloc `ACTIVE`
- Only transition to `DISPOSAL_REQUESTED` when ALL of:
  - No active subscribers
  - No keepAlive flag
  - Not within a recent unmount grace period

**Specifically for error boundaries:**

- Shared blocs stay `ACTIVE` even when all components unmount
- This allows error recovery code to `emit()` freely
- When component remounts, it gets the updated state

### Code Changes Needed

1. **BlacAdapter.unmount():**
   - Only unsubscribe, don't request disposal for shared blocs
   - Let the bloc's consumer tracking handle disposal naturally

2. **BlocBase lifecycle:**
   - Shared blocs default to staying `ACTIVE`
   - Only transition to `DISPOSAL_REQUESTED` after a grace period with no consumers

3. **Tests:**
   - Error boundary tests should pass without modification
   - Add tests confirming shared blocs stay active during error recovery

## Conclusion

**BlaC should align with the universal state management philosophy:**

- Respect React's component lifecycle (unmount = unsubscribe) ✓
- But keep shared state always accessible (like Redux/Zustand/Jotai) ✓
- Error recovery should "just work" without special APIs ✓

This provides the **best developer experience** while remaining **philosophically consistent** with both React and modern state management practices.
