# Research: Real-World State Management Benchmark Scenarios

## Executive Summary

Current state management benchmarks (js-framework-benchmark) focus on DOM rendering performance with large lists. Production applications stress state managers in different ways: fine-grained reactivity, selector overhead, change detection cost, high-frequency updates, and derived state computation. This research identifies critical gaps and proposes scenario categories that test what actually matters.

## What js-framework-benchmark Tests (and Doesn't)

**What It Tests Well**:

- Large list rendering performance (1k-10k items)
- DOM manipulation operations (create, remove, update, swap)
- Keyed vs. non-keyed reconciliation strategies
- Component mount/unmount cost
- Memory efficiency at scale

**Critical Gaps**:

1. **Change detection overhead** - No tests for redundant updates or partial object mutations
2. **Selector performance** - No memoization cost testing
3. **Derived state** - No computed/filtered/mapped state scenarios
4. **High-frequency updates** - No streaming data or animation-loop updates
5. **Cross-slice dependencies** - No multi-source state composition
6. **Shallow equality checks** - No tests where object identity vs. value matters
7. **Unsubscribe/resubscribe cost** - No dynamic subscription changes
8. **Async state interactions** - No promise/async/await state patterns
9. **Cold start performance** - Store setup/initialization cost
10. **Memory churn** - GC pressure from frequent allocations

---

## Benchmark Scenarios by Category

### Category 1: Change Detection & Redundant Updates

**Why This Matters**: Most bugs and performance issues come from "invisible" updates—state changes that trigger unnecessary renders despite no visible changes.

#### Scenario 1.1: Redundant Update to Same Value

**Pattern**: State change contains same value (e.g., `selected: 5 → 5`)

```ts
for (let i = 0; i < 100; i++) {
  store.setSelected(5); // same value each time
}
```

**Measures**: How many re-renders occur? Does library skip renders when value hasn't changed?
**Production Case**: Form validation setting errors that haven't changed, or API responses returning identical state.

#### Scenario 1.2: Deep Equality on Large Objects

**Pattern**: Update nested property in object with 100+ fields

```ts
state.user = { ...state.user, lastLogin: Date.now() };
```

**Measures**: Time to detect "did anything change?" for object with many unchanged properties.
**Production Case**: Updating one field in a large entity (user profile, settings).

#### Scenario 1.3: Array Spread with Mostly Unchanged Items

**Pattern**: Create new array where 99% of items are same reference

```ts
const newData = [...data.slice(0, 1000), updatedItem, ...data.slice(1001)];
```

**Measures**: Render count vs. actual UI changes.
**Production Case**: Updating one item in a large list (list updates are common).

#### Scenario 1.4: Selector Thrashing

**Pattern**: Create new selector function on every render

```ts
const items = useSelector((state) => state.items.filter((x) => x.active));
```

**Measures**: Overhead of recomputing selector when parent re-renders.
**Production Case**: Derived state that changes on parent prop changes, forcing reselection.

---

### Category 2: Derived & Computed State

**Why This Matters**: Modern apps rely heavily on filtered, mapped, aggregated state. The performance cost of deriving state varies dramatically between libraries.

#### Scenario 2.1: Expensive Selector Computation

**Pattern**: Filter/map large dataset with expensive predicate

```ts
const visibleItems = items.filter((item) => expensiveCheck(item));
```

**Measures**: Time to recompute when underlying data changes vs. when selector is accessed unchanged.
**Production Case**: Filtered views, search results, permission-based visibility.

#### Scenario 2.2: Transitive Selectors (Selector of Selector)

**Pattern**: Selector depends on output of another selector

```ts
const selectedItem = useSelector((state) => {
  const filtered = filterItems(state.items);
  return filtered.find((x) => x.id === state.selected);
});
```

**Measures**: Caching effectiveness, re-computation frequency.
**Production Case**: Multi-level filtering (e.g., category → subcategory → item).

#### Scenario 2.3: Aggregate/Reduce Operations

**Pattern**: Sum, count, or aggregate entire state

```ts
const total = useSelector((state) =>
  state.items.reduce((sum, item) => sum + item.price, 0),
);
```

**Measures**: Cost of re-aggregating vs. maintaining computed value.
**Production Case**: Cart totals, dashboard KPIs, progress tracking.

#### Scenario 2.4: Date/Time-Based Computed State

**Pattern**: State that derives based on current time (relative dates)

```ts
const relativeDate = computed(() => formatRelative(item.createdAt, now));
```

**Measures**: When does recomputation happen? Can it be deferred?
**Production Case**: "2 minutes ago", countdown timers, expiry calculations.

---

### Category 3: High-Frequency Updates

**Why This Matters**: Some interactions (animations, drag/drop, pointer tracking, form input) fire updates 60+ times per second. Batching and debouncing matter here.

#### Scenario 3.1: Pointer/Mouse Tracking

**Pattern**: Update position on every mousemove (60fps)

```ts
onMouseMove((e) => store.setPointer({ x: e.clientX, y: e.clientY }));
```

**Measures**: Render cost per update, ability to batch or defer rendering.
**Production Case**: Drag/drop interfaces, interactive canvases, hover states.

#### Scenario 3.2: Scroll Position Tracking

**Pattern**: Update scroll state on every scroll event

```ts
window.addEventListener('scroll', () => store.setScrollPos(window.scrollY));
```

**Measures**: Does batching prevent cascading renders? Memory pressure?
**Production Case**: Infinite scroll, sticky headers, scroll-to-top buttons.

#### Scenario 3.3: Form Input Changes (Real-Time Validation)

**Pattern**: Update field state on every keystroke + run validations

```ts
const onChange = (value) => {
  store.setField(field, value);
  store.validate();
};
```

**Measures**: Render cost × character count. Can validation be deferred?
**Production Case**: Real-time search, auto-save forms.

#### Scenario 3.4: Polling/Streaming Updates

**Pattern**: Rapid sequential updates to same slice of state

```ts
setInterval(() => store.addDataPoint(latestValue), 100);
```

**Measures**: Update batching, old value cleanup, memory growth.
**Production Case**: Live dashboards, real-time metrics, streaming data.

#### Scenario 3.5: Animation Loop Updates

**Pattern**: Update state every frame for 2+ seconds

```ts
const animate = () => {
  store.setProgress(progress + 1);
  requestAnimationFrame(animate);
};
```

**Measures**: Total time for 120+ frame loop. Memory pressure.
**Production Case**: Progress bars, loading spinners, animated transitions.

---

### Category 4: Selector Memoization & Subscription Efficiency

**Why This Matters**: Libraries with fine-grained reactivity (Jotai, Zustand selectors) depend critically on memoization. Mismemoization is a silent performance killer.

#### Scenario 4.1: Selector with Unstable Object Literal

**Pattern**: Create new filter object on each access

```ts
const filtered = useSelector((state) =>
  state.items.filter((x) => x.tags.includes(searchTerm)),
);
```

Where `searchTerm` changes but library doesn't recognize it.
**Measures**: Number of re-renders when selector should be stable.
**Production Case**: Parameterized selectors with closure dependencies.

#### Scenario 4.2: Dynamic Subscription Graph

**Pattern**: Subscribe to different atoms/slices based on parent state

```ts
const item = items[selectedId]; // changes which atom we read
```

**Measures**: Subscription change cost. GC churn from old subscriptions.
**Production Case**: Conditional state access (e.g., expand/collapse details).

#### Scenario 4.3: Factory Selectors (Selector Per Item)

**Pattern**: Create new selector for each list item

```ts
items.map((item) => useSelector((state) => state.itemsMap[item.id]));
```

**Measures**: Selector creation overhead × item count.
**Production Case**: Per-row state access in large lists.

#### Scenario 4.4: Selector Equality Checking

**Pattern**: Return new object that's equal by value but different by reference

```ts
const data = useSelector((state) => ({
  name: state.user.name,
  email: state.user.email,
}));
```

**Measures**: How often does library re-render when object content is identical but reference changed?
**Production Case**: Combining multiple selectors.

---

### Category 5: Multi-Slice / Cross-Dependency State

**Why This Matters**: Real apps have interdependent state slices. The cost of coordination varies wildly between libraries.

#### Scenario 5.1: One Slice Depends on Another (Cascade)

**Pattern**: Update A, which triggers computed update to B

```ts
setItems(newItems); // also updates itemsMap and summaries
```

**Measures**: Total time for cascading updates. Batching effectiveness.
**Production Case**: Normalized state + denormalized caches.

#### Scenario 5.2: Circular Dependency

**Pattern**: A reads B, B reads A (via computed)

```ts
const isValid = computed(
  () => items.every((i) => i.parentId !== self.id) && canCreate(),
);
```

**Measures**: Infinite loop detection, update ordering, deadlock potential.
**Production Case**: UI state (enable/disable buttons) based on data state.

#### Scenario 5.3: Many-to-One Aggregation

**Pattern**: 10+ sub-slices contribute to 1 aggregate

```ts
const total = useMemo(() =>
  cart.items.reduce(...) + cart.tax + cart.shipping
)
```

**Measures**: Number of subscribers, update batching.
**Production Case**: Multi-step forms, shopping carts, data aggregation.

#### Scenario 5.4: Synchronizing Related Lists

**Pattern**: Keep two lists in sync (e.g., selected items and data items)

```ts
setSelected([...selected, id]); // also update count in UI state
```

**Measures**: Ensuring both updates commit together. Partial update visibility.
**Production Case**: Multi-select UI, permissions management.

---

### Category 6: Cold Start & Initialization

**Why This Matters**: Apps cold-boot once per user session. High initialization cost impacts first paint, especially with hydration/SSR.

#### Scenario 6.1: Complex Store Initialization

**Pattern**: Set up store with 100+ initial state entries

```ts
const store = new Store({
  users: [...],
  settings: {...},
  cache: {...},
  ...
})
```

**Measures**: Time to fully initialize before first operation.
**Production Case**: Hydrating from SSR or localStorage.

#### Scenario 6.2: Lazy Initialization with Selectors

**Pattern**: Initialize selectors on-demand as they're accessed

```ts
useSelector((state) => state.expensiveComputed); // computed on first access
```

**Measures**: Cold vs. warm selector access time.
**Production Case**: Large apps that don't use all slices up front.

#### Scenario 6.3: Hydration from External Data

**Pattern**: Load state from API/localStorage then initialize store

```ts
const saved = await loadState();
store.hydrate(saved);
```

**Measures**: Deserialization + recomputation cost.
**Production Case**: Mobile apps restoring from cache, SSR hydration.

---

### Category 7: Memory Efficiency & GC Pressure

**Why This Matters**: Mobile devices and long-running apps are sensitive to memory leaks and GC pauses. Different libraries have different allocation patterns.

#### Scenario 7.1: Large Append (Memory Churn)

**Pattern**: Append 1000 items repeatedly (like infinite scroll)

```ts
for (let i = 0; i < 100; i++) {
  store.addItems(buildData(1000));
}
```

**Measures**: Heap growth, GC pause frequency, peak memory.
**Production Case**: Infinite scroll loading, real-time event streams.

#### Scenario 7.2: Rapid Object Creation (Alloc-Per-Update)

**Pattern**: Each update creates new wrapper objects

```ts
const update = { ...state, nested: { ...state.nested, field: value } };
```

**Measures**: Allocation rate, GC pressure, pause duration.
**Production Case**: Immutable update patterns in high-frequency updates.

#### Scenario 7.3: Subscription Leak

**Pattern**: Create/destroy subscriptions repeatedly without cleanup

```ts
for (let i = 0; i < 1000; i++) {
  const unsub = store.subscribe(() => {});
  unsub();
}
```

**Measures**: Whether old subscriptions are properly garbage collected.
**Production Case**: Dynamic React hooks, mounting/unmounting components.

#### Scenario 7.4: Selector Cache Bloat

**Pattern**: Create 1000 different selectors over time

```ts
for (let i = 0; i < 1000; i++) {
  useSelector((state) => state.items.filter((x) => x.id === i));
}
```

**Measures**: Cache size growth, memory pressure, cache eviction.
**Production Case**: Per-item selectors in large dynamic lists.

---

### Category 8: Update Batching & Scheduling

**Why This Matters**: React batching has changed over versions (React 18+ auto-batches), but state managers differ in how they batch updates and interact with React's scheduler.

#### Scenario 8.1: Multiple Synchronous Mutations

**Pattern**: Several operations before any UI update

```ts
store.setA(1);
store.setB(2);
store.setC(3);
// One render? Three renders?
```

**Measures**: Render count. Does library batch automatically?
**Production Case**: Multi-field updates, transactional operations.

#### Scenario 8.2: Interleaved Async Updates

**Pattern**: Updates interspersed with await/promise

```ts
await store.loadData();
store.setStatus('loaded');
await store.compute();
store.setDone(true);
```

**Measures**: Are updates properly flushed? Render batching preserved?
**Production Case**: Multi-step loading sequences.

#### Scenario 8.3: Updates During Render

**Pattern**: State change happens in useEffect triggered by state change

```ts
useEffect(() => store.setDerived(compute(state)), [state]);
```

**Measures**: Infinite loop prevention, batching with React Concurrent.
**Production Case**: Reactive updates, auto-save on change.

---

### Category 9: Observer Pattern & Reactivity

**Why This Matters**: Different libraries have fundamentally different observation models (pull vs. push, coarse vs. fine-grained).

#### Scenario 9.1: Update Invisible to Observers

**Pattern**: Transient update that shouldn't trigger renders

```ts
store.setHoveredId(5); // UI shouldn't re-render
```

**Measures**: Can library support "silent" updates? Cost of preventing observation?
**Production Case**: Animation state, uncontrolled interactions, local UI state.

#### Scenario 9.2: Batch Update with Partial Visibility

**Pattern**: Update multiple fields, but only one triggers render

```ts
store.setInternal(value); // not observed
store.setUI(value); // observed, triggers render
```

**Measures**: Render cost, update ordering.
**Production Case**: Coordinating internal and UI state.

#### Scenario 9.3: Observer Recomputation Cost

**Pattern**: Change listener that does expensive work

```ts
store.subscribe((state) => {
  console.log(expensiveSerialize(state)); // called every update
});
```

**Measures**: Cost per notification. Can debouncing help?
**Production Case**: Logging, analytics, persistence.

---

### Category 10: Error Handling & Rollback

**Why This Matters**: Production failures need recovery. Different libraries handle partial state updates differently.

#### Scenario 10.1: Failed Transaction

**Pattern**: Multi-field update where one fails partway

```ts
try {
  store.updateUser({ name, email, avatar });
} catch {
  // Is state partial or rolled back?
}
```

**Measures**: Rollback speed, consistency check cost.
**Production Case**: API failures during multi-step operations.

#### Scenario 10.2: Revert to Previous State

**Pattern**: Undo/redo operation

```ts
store.setState(previousState);
```

**Measures**: Time to restore large previous state.
**Production Case**: Form undo, collaborative editing, timeline scrubbing.

---

## Performance Characteristics Summary

| Category         | Key Metric                    | Production Impact                | Gap in Framework Benchmark |
| ---------------- | ----------------------------- | -------------------------------- | -------------------------- |
| Change Detection | Re-renders prevented          | 10-50% render reduction possible | ✓ Complete gap             |
| Derived State    | Selector overhead per access  | 5-20% of render cost             | ✓ Complete gap             |
| High-Frequency   | Batching effectiveness        | Determines 60fps capability      | ✓ Complete gap             |
| Memoization      | Selector identity stability   | 10-30% render reduction          | ✓ Complete gap             |
| Cross-Slice      | Cascade update cost           | Multiplies with dependencies     | ✓ Complete gap             |
| Cold Start       | Init + first operation        | User-perceived latency           | ✓ Not tested               |
| Memory           | GC pause duration             | Mobile responsiveness            | ✓ Not measured             |
| Batching         | Render count per transaction  | Critical for form UX             | ✓ Not tested               |
| Reactivity       | Update batching effectiveness | UX smoothness                    | ✓ Not tested               |
| Error Handling   | Rollback/recovery time        | Data consistency                 | ✓ Not tested               |

---

## Recommended Next Steps for Blac

1. **Implement Scenario 1.1** (Redundant Updates) - Validates change detection
2. **Implement Scenario 2.1** (Expensive Selectors) - Core derived state test
3. **Implement Scenario 3.1** (Pointer Tracking) - Real-world high-frequency pattern
4. **Implement Scenario 4.1** (Unstable Selectors) - Fine-grained reactivity test
5. **Implement Scenario 5.1** (Cross-Slice Cascade) - Multi-slice coordination

These five scenarios target Blac's core value proposition: simple, predictable state management with minimal unexpected renders.

---

## Sources

- **js-framework-benchmark**: https://github.com/krausest/js-framework-benchmark (19 core operations, DOM-focused)
- **Zustand Docs**: Emphasis on selective re-rendering, transient updates
- **Jotai Docs**: Fine-grained reactivity, automatic dependency tracking
- **Redux Toolkit**: Entity adapters, normalized state patterns
- **Web.dev Core Web Vitals**: INP (Interaction to Next Paint) as key metric
- **Dan Abramov Articles** (overreacted.io): Render optimization patterns, React hooks design rationale
- **Kent C. Dodds**: React Context usage, performance pitfalls
