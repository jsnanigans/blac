---
title: How BlaC Works Internally
description: Rebuild BlaC's reactivity engine from the ground up in four stages — the dirty channel, the path interner, the recording proxy, the observed skeleton, and cross-bloc dependencies.
---

This chapter rebuilds BlaC's reactivity engine from the ground up, one stage at a
time. By the end you will be able to point at every moving part — the dirty
channel, the path interner, the recording proxy, the observed skeleton, and the
cross-bloc dependency layer — and say exactly what it does and why it has to.

If you only want the rules for writing components, read
[Tracking](/core/tracked) and [Dependency Tracking](/react/dependency-tracking).
This page is for when you want the _machine_. It is grounded directly in the
source: the engine lives in `@dirtytalk/engine`, the path machinery in
`@dirtytalk/structural`, and BlaC's lifecycle layer in `@blac/core`'s
`StateContainer`. The companion design narrative is the
[Mental Model](/guide/mental-model); the distilled standalone version is
[`@dirtytalk/structural` Concepts](/dirtytalk/structural/concepts).

We build in four stages, each strictly on top of the last:

```
Stage 1   state + listeners        "something changed — wake everyone"
   │                                (DirtyChannel, coalesced flush)
   ▼
Stage 2   paths                     "what changed — as interned integers"
   │                                (PathInterner, PathSet, intersection)
   ▼
Stage 3   the skeleton             "who reads what — diff once, fan out cheap"
   │                                (trackRender proxy + observed skeleton)
   ▼
Stage 4   cross-bloc deps          "one bloc leans on another"
                                    (StateContainer.depend / registry)
```

---

## Stage 1 — State and listeners

Start with the smallest honest model: a value, a set of listeners, and a way to
say "I changed." Every reactive store has this core. The naive version notifies
every listener synchronously on every change.

BlaC's real notification core is `DirtyChannel<Region>` from `@dirtytalk/engine`,
but we approach it from the outside in. From the outside, that contract is what
`Cubit` exposes: a value behind
`state`, mutated by `emit` / `update`, with `subscribe(listener)` firing on
every coalesced flush. This block type-checks against the real `@blac/core`
surface:

```ts twoslash
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    // Immutable replacement. Several synchronous emits coalesce into ONE flush.
    this.emit({ count: this.state.count + 1 });
  }
}

const c = new CounterCubit();
// Legacy listener-style subscribe: wakes on every flush, sees the latest state.
const unsubscribe = c.subscribe((state) => console.log('woke at', state.count));
c.increment();
c.increment(); // two emits, same tick → listener fires once with count: 2
unsubscribe();
```

Underneath, that `subscribe` is a thin bridge over the real notification core:
`DirtyChannel<Region>` from `@dirtytalk/engine`. It is generic over a `Region` —
an opaque "what changed" value governed by a `Space<Region>` algebra
(`empty`, `isEmpty`, `union`, `intersects`). Two properties make it more than a
plain `EventEmitter`. Modeled with a trivial boolean `Region` where "dirty" is
just `true` (illustrative — `@dirtytalk/engine` is the engine package, not a
docs dependency, so this block is shown rather than type-checked):

```ts
import { DirtyChannel, SyncScheduler, type Space } from '@dirtytalk/engine';

// The simplest possible Region: a boolean. `true` = "something changed".
const BoolSpace: Space<boolean> = {
  empty: () => false,
  isEmpty: (r) => r === false,
  union: (a, b) => a || b,
  // Any non-empty dirty wakes any interested subscriber.
  intersects: (interest, dirty) => interest && dirty,
};

class Counter {
  private _state = 0;
  // SyncScheduler flushes inline (production uses MicrotaskScheduler).
  private channel = new DirtyChannel<boolean>(BoolSpace, new SyncScheduler());

  get state() {
    return this._state;
  }
  listen(cb: () => void) {
    return this.channel.subscribe(
      () => true, // interest: "I care about everything"
      () => cb(),
    );
  }
  increment() {
    this._state += 1;
    this.channel.mark(true); // "something changed"
  }
}
```

The two load-bearing properties of `DirtyChannel`:

1. **Marks accumulate, flushes coalesce.** `mark(region)` unions the region into
   an accumulator and asks the scheduler to flush once. Several synchronous
   `mark`s collapse into a single flush — so three `emit`s in one tick wake each
   listener at most once.
2. **Interests are thunks evaluated at flush time.** A subscriber registers
   `subscribe(() => interest, cb)`. On flush the channel evaluates the interest
   thunk, tests `space.intersects(interest, dirty)`, and calls `cb` only on a
   hit. (This is the seam Stage 2 and 3 exploit; here the region is just
   "everything.")

```
Stage 1: mark → flush → wake everyone

  increment()  increment()        (same tick)
       │            │
       ▼            ▼
   mark(true)   mark(true)         union → still `true`
       └─────┬──────┘
             ▼
        scheduler.request(flush)   coalesced: scheduled once
             │
             ▼
   flush: dirty = true ───────────► every subscriber whose
                                     interest intersects → cb()
```

This is everything a `Cubit` does at the listener level. `StateContainer`'s
back-compat `subscribe(listener)` is exactly this: it bridges every channel
flush to `(state) => void` callbacks, regardless of what changed. The
`watch(BlocClass, cb)` helper is the same "wake on any change" subscription
applied from outside React. The flush is microtask-coalesced, which is why
several synchronous `emit`s produce a single notification.

What's missing: "wake everyone" is wasteful. A container with twenty fields
wakes a listener that reads one of them on all twenty kinds of change. Stage 2
makes "what changed" precise.

---

## Stage 2 — Paths

Replace the boolean region with a **set of changed paths**. A path is a dotted
route to a leaf in the state tree: `user.name`, `items`, `user.address.city`. A
mutation marks the paths it touched; a listener declares the paths it reads; the
channel wakes a listener only when those two sets intersect.

Comparing and unioning dotted strings on every mutation would be wasteful, so
every path is **interned** into a small integer `PathId` once. `PathInterner`
(in `@dirtytalk/structural`, used internally by every BlaC container) is a
bidirectional `string ↔ PathId` table: `intern(path)` returns a stable id (the
next sequential integer, starting at `0`), idempotently; `lookup(id)` reverses
it.

```ts
import { PathInterner } from '@dirtytalk/structural';

const interner = new PathInterner();
interner.intern('user.name'); // 0
interner.intern('user.email'); // 1
interner.intern('user.name'); // 0 again — idempotent
interner.lookup(0); // 'user.name'
interner.size; // 2
```

Ids are only comparable inside one interner's namespace, so BlaC keeps **one
interner per container subclass**, keyed by constructor in a `WeakMap`
(`StructuralContainer.getInternerFor`). Every instance of one `Cubit` subclass
shares an interner, so their ids line up and can be unioned/intersected freely;
distinct subclasses get distinct interners even if their state shapes match. The
`WeakMap` lets the interner be collected once the class is gone.

A `PathSet` is the unit of both "interest" and "dirtiness." It is either a
concrete `Set<PathId>` or the `ALL_PATHS` sentinel (`"every possible path"`).
The set algebra is a `Space<PathSet>` — `PathSetSpace` — the same `Space`
contract from Stage 1, now over path sets instead of booleans:

```ts
import {
  PathInterner,
  PathSetSpace,
  ALL_PATHS,
  type PathSet,
} from '@dirtytalk/structural';

const interner = new PathInterner();
const name = interner.intern('user.name'); // 0
const email = interner.intern('user.email'); // 1

// A listener that reads user.name; a mutation that changed user.email.
const interest: PathSet = new Set([name]);
const dirty: PathSet = new Set([email]);

PathSetSpace.intersects(interest, dirty); // false → stays asleep
PathSetSpace.intersects(new Set([name]), new Set([name])); // true → wakes

// ALL_PATHS intersects any non-empty set (used for "wake everyone" signalling).
PathSetSpace.intersects(ALL_PATHS, dirty); // true
PathSetSpace.intersects(interest, ALL_PATHS); // true
// ...but an empty interest never wakes — "I care about nothing".
PathSetSpace.intersects(PathSetSpace.empty(), ALL_PATHS); // false
```

`ALL_PATHS` and the `PathSet` type are the only path primitives BlaC re-exports
from `@blac/core` (for plugins composing channel subscriptions); this
type-checked block uses them directly:

```ts twoslash
import { ALL_PATHS, type PathSet } from '@blac/core';

// A plugin or devtools panel can declare blanket interest in every change.
const blanketInterest: () => PathSet = () => ALL_PATHS;
void blanketInterest;
```

The channel is identical to Stage 1; only the `Region` changed from `boolean` to
`PathSet`. `intersects` does the discrimination: iterate the smaller set, look
up in the larger, return on the first hit. That is the entire per-listener cost
of a change — no tree walk.

Where do the changed paths come from? The mutators compute them:

- **`emit(next)`** installs a new immutable state, then diffs to find which
  observed paths changed value (Stage 3 covers the skeleton bound on that diff).
- **`patch(partial)`** deep-merges a `DeepPartial<S>` and marks paths via
  `changedPathsFromPatch`: it walks the patch shape, pulses each touched branch
  up (`{ user: { email } }` marks both `user` and `user.email`), but
  **value-filters** — a path is marked only if its value actually changed, and
  recursion prunes into unchanged branches (an unchanged subtree keeps its
  reference). So an over-spread patch that re-sets a whole parent when one field
  changed does not over-wake the siblings.
- **`update(fn)`** is sugar for `emit(fn(state))`.

From the public surface, the three mutators look like this — and all type-check:

```ts twoslash
import { Cubit } from '@blac/core';

interface UserState {
  user: { name: string; email: string };
  items: string[];
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ user: { name: 'Ada', email: 'ada@x.io' }, items: [] });
  }

  // patch: deep-merges; marks only paths whose value actually changed.
  // Here only `user.email` moves → `user.name` consumers stay asleep.
  setEmail(email: string) {
    this.patch({ user: { email } });
  }

  // update: sugar for emit(fn(state)); replace immutably.
  addItem(item: string) {
    this.update((s) => ({ ...s, items: [...s.items, item] }));
  }

  // emit: replace the whole state.
  reset() {
    this.emit({ user: { name: '', email: '' }, items: [] });
  }
}

void UserCubit;
```

```
Stage 2: paths as interned ids

  state = { user: { name, email }, items }

  intern:  user.name → 0   user.email → 1   items → 2

  emit changes user.email   ──►  dirty = { 1 }
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                ▼                 ▼
            interest {0}      interest {1}      interest {2}
            (reads name)      (reads email)     (reads items)
            ∩ {1} = ∅         ∩ {1} = {1}       ∩ {1} = ∅
            asleep            WAKE              asleep
```

:::caution[In-place mutation is invisible]
Change detection rests on reference comparison (`Object.is`) and on unchanged
subtrees keeping their references. Mutating state in place —
`state.items.push(x)` — marks nothing and wakes nobody. Always replace
immutably: `patch({ ... })` or `update(s => ({ ...s, items: [...s.items, x] }))`.
:::

What's still missing: a listener must somehow _declare_ its path set. Writing it
by hand is a selector — the exact thing BlaC avoids. Stage 3 makes the read
itself the declaration.

---

## Stage 3 — The recording proxy and the observed skeleton

A consumer declares which paths it reads by _reading them_. `trackRender(state,
interner)` wraps state in a recording `Proxy` and returns
`{ value, paths }`: `value` is the proxy you read during render, `paths` is a
**live** `Set<PathId>` that grows as you touch properties off `value`.
`trackRender` is internal (`@dirtytalk/structural`); the React adapter calls it
for you on every render, so you never import it directly. Shown here to make the
mechanism concrete:

```ts
import { PathInterner, trackRender, type PathId } from '@dirtytalk/structural';

interface State {
  user: { name: string; email: string };
  items: number[];
}

const state: State = {
  user: { name: 'Ada', email: 'ada@x.io' },
  items: [1, 2, 3],
};
const interner = new PathInterner();

const { value, paths } = trackRender(state, interner);

// Simulate what a component's render does: read the fields it displays.
void value.user.name; // records `user.name`
void value.items; // records `items`

// `paths` now holds exactly the interned ids of what was read.
const read: PathId[] = [...(paths as Set<PathId>)].sort();
read.map((id) => interner.lookup(id)); // ['items', 'user.name']
```

The recording rules are deliberate, and each one earns its keep:

- **Leaf-only (maximal) recording.** Reading `user.name` records `user.name` and
  _drops_ the intermediate `user` from the set. So when an immutable update
  replaces the whole `user` object because a _sibling_ (`user.email`) changed, a
  consumer that only read `user.name` does **not** wake — its recorded leaf
  still resolves to the same value. Read the whole `user` object (no deeper key)
  and `user` stays your leaf, so any change inside it wakes you.
- **Own, non-symbol reads only.** Symbol keys (`Symbol.iterator`) and inherited
  prototype props never record. Re-reads are idempotent (it's a `Set`).
- **Nested plain objects/arrays return child proxies** recording into the same
  set, cached per target so `value.user === value.user` within one render.
- **Iteration coarsens.** `.map` / `.find` / `for..of` on an array record the
  _entry_ path (`items`) but not per-index paths (`items.0`) or `items.length`.
  Array methods are bound to the raw target so their internal reads bypass the
  proxy. Direct index access still records the leaf: `value.items[2]` records
  `items.2`.
- **Leaf collection types are not recursed.** `Map`, `Set`, `Date`, and class
  instances are returned raw (wrapping them would rebind receiver-checked
  built-ins like `Map.prototype.get`). A reference change to the whole value
  still wakes you, but an in-place `.set()` does not.

Now the payoff. With `N` consumers sharing a container, the naive way to find
who to wake is per-consumer diffing: `N` tree walks. BlaC does **one walk plus N
intersections** instead.

The trick is the **observed skeleton**: the union of every registered consumer's
path set. On a mutation, `emit` diffs `prev` vs `next` **only along the
skeleton** — it reads each skeleton path in both states and includes it iff the
value moved (`diffAlongSkeleton`, default `Object.is`). That one walk produces
the dirty set; then each consumer wakes via a cheap set intersection (Stage 2).
Again the helpers are internal — this is the mechanism `emit` runs for you:

```ts
import {
  PathInterner,
  diffAlongSkeleton,
  pathSetUnion,
  type PathSet,
} from '@dirtytalk/structural';

interface State {
  user: { name: string; email: string };
}
const interner = new PathInterner();

// Two consumers: one reads user.name, the other reads user.email.
const consumerA: PathSet = new Set([interner.intern('user.name')]);
const consumerB: PathSet = new Set([interner.intern('user.email')]);

// The skeleton is the union of all registered consumers' interests.
const skeleton = pathSetUnion(consumerA, consumerB);

const prev: State = { user: { name: 'Ada', email: 'ada@x.io' } };
const next: State = { user: { name: 'Ada', email: 'ada@new.io' } };

// ONE diff walk, bounded to the skeleton, finds what actually moved.
const dirty = diffAlongSkeleton(prev, next, skeleton, interner);
// dirty = { user.email } — only consumerB will wake on intersection.
[...(dirty as Set<number>)].map((id) => interner.lookup(id)); // ['user.email']
```

The registry maintaining the skeleton is in `StructuralContainer`:
`registerConsumerPaths(id, paths)` stores one consumer's set and recomputes the
skeleton as the union of all of them (with a fast-path skip when the set is
unchanged); `unregisterConsumer(id)` drops one and recomputes.

```
Stage 3: one walk, then N cheap intersections

  consumerA reads {user.name}    consumerB reads {user.email}
            \                       /
             \                     /
              ▼   union           ▼
        skeleton = {user.name, user.email}
                       │
   emit(next) ─► diffAlongSkeleton(prev, next, skeleton)   ◄── the ONE walk
                       │
                       ▼
                  dirty = {user.email}
                  ┌────────────┴────────────┐
                  ▼                          ▼
          A ∩ dirty = ∅              B ∩ dirty = {user.email}
          asleep                     WAKE
```

:::note[The single-consumer skip]
The skeleton diff only pays off with 2+ consumers to share the walk across. With
0 or 1 registered consumers, `emit`/`update` skip the diff entirely and mark
`ALL_PATHS` — the sole consumer (if any) wakes regardless. Fine-grained
isolation begins at two consumers. `patch` never takes this shortcut; it always
value-diffs the patch shape, so raw `subscribe` callers wake correctly too.
:::

### How React ties in

`useBloc` (and the standalone `useStructural`) needs **no selector** because the
JSX _is_ the interest declaration. Per render it:

- derives a stable consumer id from `useId()` and forces re-renders with a
  `useReducer` tick (no virtual DOM — React reconciles);
- calls `trackRender(container.state, container.interner)`, renders against the
  proxy, and stashes the now-populated `paths` in a ref;
- registers that set in a layout effect **after** render (never in the render
  body — at that point `paths` is still empty and would freeze an empty
  skeleton, silently dropping wakeups);
- subscribes `() => pathRef.current` to the channel, so the channel re-evaluates
  the live interest on every flush and re-renders only on intersection.

Conditional reads therefore reshape the skeleton automatically, render to
render. To opt out and gate re-renders by a derived value array instead, pass
`select` to `useBloc`.

---

## Stage 4 — Cross-bloc dependencies

The final layer: one bloc leaning on another. This lives in `@blac/core`'s
`StateContainer` (the class `Cubit` extends), not in the structural engine —
deps are about _identity and lifecycle_, not path diffing.

`this.depend(OtherBloc)` declares a dependency and returns a **getter**. Calling
the getter resolves the dependency against the registry _on each call_, so the
declaring bloc never holds a stale instance reference across dep churn:

```ts twoslash
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ userId: string | null }> {
  constructor() {
    super({ userId: null });
  }
  login(userId: string) {
    this.emit({ userId });
  }
}

class DashboardCubit extends Cubit<{ ready: boolean }> {
  // `depend` returns a handle resolved against the registry per call.
  private auth = this.depend(AuthCubit);

  constructor() {
    super({ ready: false });
  }

  get currentUser(): string | null {
    return this.auth.untracked().state.userId; // resolve, then read
  }
}
```

Two design points fall out of the source:

- **`depend` does not auto-resubscribe.** It records the dependency (visible via
  the `dependencies` getter) and returns a handle. It deliberately does **not**
  bridge the dep's channel into this bloc — a naive auto-bridge would cycle on
  mutual deps. A consumer that needs reactive updates from a dep subscribes
  explicitly, which in React means a component `useBloc`s both blocs and the
  Stage-3 tracker handles each independently.
- **Per-consumer deps are a separate, owner-keyed mechanism.** The
  `APPLY_DEPS` / `REMOVE_DEPS_OWNER` symbols (internal, used by the React
  adapter) let each _consumer_ inject a slice of deps keyed by an owner id;
  `StateContainer` shallow-merges all live owners' slices, dev-warns on
  cross-owner key collisions (last write wins), and fires `onDepsChanged` only
  when the merged view actually changes. This is distinct from `depend`'s
  bloc-to-bloc resolution.

```
Stage 4: deps resolve through the registry (no auto-bridge)

   DashboardCubit                          registry
        │                                      │
        │  this.depend(AuthCubit)              │
        │  ── records dep, returns handle ──►  │
        │                                      │
        │ auth.untracked() ─ ensure(AuthCubit)►│ ── returns the live
        │                                      │    AuthCubit instance
        │  ◄──────────── instance ──────────── │
        ▼
   reads dep.state  (reactivity, if wanted, is the consumer's job
                     via Stages 1–3 on each bloc independently)
```

`StateContainer` adds the rest of the lifecycle around these four stages:
identity (`name`, `instanceId`), disposal, hydration, an
`onSystemEvent('stateChanged' | 'dispose' | 'hydrationChanged', cb)` surface,
and a dev-only emit-rate circuit breaker that warns once when a runaway loop
pushes too many changes through state in a second. But the reactivity itself is
the four stages above: a coalescing channel, interned paths, a recording proxy
feeding an observed skeleton, and a registry resolving cross-bloc deps.

---

## Putting it together: one update, end to end

A single `emit` flows through all four stages:

1. A method calls `emit` / `update` / `patch`. `StateContainer` runs its guards
   (disposed, equality short-circuit, emit-rate check), captures the
   `prev`/`next` change, and delegates change-detection to
   `StructuralContainer`. (Stage 1 + 4 wrapper.)
2. The container installs the new immutable state and computes the dirty
   `PathSet` — `diffAlongSkeleton` against the observed skeleton for `emit`,
   `changedPathsFromPatch` for `patch` — then `channel.mark(dirty)`.
   (Stage 2 + 3.)
3. The `DirtyChannel` coalesces marks and schedules one flush per tick. (Stage 1.)
4. On flush, each subscriber's interest thunk is evaluated and intersected with
   the dirty set; only consumers with a non-empty intersection have their
   callback fired (React re-render, `watch` callback, plugin sink). (Stage 1 + 2.)
5. On the next render, the proxy re-records each consumer's interest from
   scratch, so conditional reads reshape the skeleton automatically. (Stage 3.)

The practical takeaway is the same sentence the whole machine exists to make
true, cheaply: **read exactly the state you render, keep state immutable, and
BlaC re-renders the minimum.**

## See also

- [Mental Model](/guide/mental-model) — the design narrative behind these stages.
- [Tracking](/core/tracked) — the React-time recording rules in reference form.
- [Dependency Tracking](/react/dependency-tracking) — `select` and what does/doesn't register.
- [`@dirtytalk/structural` Concepts](/dirtytalk/structural/concepts) — the standalone, engine-backed distillation.
- [System Events](/core/system-events) — `stateChanged` / `dispose` lifecycle hooks.
