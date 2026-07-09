# @dirtytalk/structural

Path-based dirty-tracking instantiation of @dirtytalk/engine, for state containers and structural data.

> [!WARNING]
> **BlaC v2 is in pre-release (beta).** While in beta, **breaking API changes may
> ship in patch releases** without a major version bump. Pin an exact version and
> check the changelog before upgrading. Strict semver resumes once v2 is officially
> out of beta.

## Why this exists

Both state containers and UI renderers ask the same question after a mutation: _what changed, who
cares, and when do we tell them?_ The shared answer in `@dirtytalk/engine` is to compute "what
changed" once at the source, in a format every subscriber can intersect cheaply. For structural
data — objects and arrays whose consumers track named paths through them — that format is a set of
interned path IDs. This package supplies that format plus the container and adapter that make it
work end-to-end.

The problem with per-consumer diffing is cost: N consumers × per-emit walks of the state tree →
N separate traversals doing the same equality checks over and over. This package replaces that
pattern with one walk per emit (bounded to the observed skeleton of paths any live consumer
actually reads) plus N cheap set-intersections to decide which consumers care. With few consumers
the absolute cost is similar; with many consumers sharing the same container the win is
proportional to N.

## What's in the box

- `StructuralContainer<S>` — the base class. Holds state, owns a `DirtyChannel<PathSet>`, maintains
  the observed skeleton across consumers, and exposes `emit`, `patch`, and `update`.
- `PathInterner` — per-class string-to-ID interning. Stable across all instances of the same
  container class.
- `PathSet` — a compact set of `PathId` numbers with `ALL_PATHS` sentinel and `PathSetSpace` — the
  `Space<PathSet>` implementation consumed by the engine. `ALL_PATHS` is used when the
  single-consumer-skip fires (or for opt-in blanket interest), making `intersects` unconditionally
  true without enumerating paths.
- `trackRender` — Proxy-based per-consumer path recorder. Wraps state, records every field access
  as an interned `PathId`, and returns the access set alongside the proxied value. Optionally
  accepts a `ProxyCache` to reuse proxies across renders — see
  [Cross-render proxy reuse](#cross-render-proxy-reuse-proxycache) below.
- `ProxyCache` — opt-in, caller-owned cache that lets `trackRender` skip re-allocating a `Proxy`
  for array items (or any nested value) that didn't change between renders.
- `diffAlongSkeleton`, `pathsFromPatch`, `getAt` — diffing helpers. `pathsFromPatch` extracts
  dotted paths from a partial object; `diffAlongSkeleton` walks only the observed skeleton to find
  changed paths; `getAt` reads a value at a dotted path string.
- React adapter at `@dirtytalk/structural/react`: `useStructural` — subscribes a component to a
  container's dirty channel and records paths per render.

## Install

```bash
pnpm add @dirtytalk/structural @dirtytalk/engine
```

`@dirtytalk/engine` is a runtime dependency. Both packages are versioned together in this
monorepo; installing structural without engine would produce a missing peer at runtime.

## Quick example — core (no React)

```ts
import { StructuralContainer, SyncScheduler } from '@dirtytalk/structural';
import { MicrotaskScheduler } from '@dirtytalk/engine';

interface CounterState {
  count: number;
  label: string;
}

class CounterContainer extends StructuralContainer<CounterState> {
  constructor() {
    super({ count: 0, label: 'counter' }, new MicrotaskScheduler());
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }
}

const counter = new CounterContainer();

// Subscribe via the underlying dirty channel.
// Interest thunk returns the path set of paths this subscriber cares about.
// For a simple subscriber that wants everything, use ALL_PATHS.
import { ALL_PATHS } from '@dirtytalk/structural';

const unsub = counter.channel.subscribe(
  () => ALL_PATHS,
  (dirty) => {
    console.log('state:', counter.state, 'dirty:', dirty);
  },
);

counter.increment();
// After the microtask flushes:
// => state: { count: 1, label: 'counter' }  dirty: PathSet { count }

unsub();
```

`patch` produces a `PathSet` directly from the keys of the partial object — no diff needed.
`emit` and `update` walk `diffAlongSkeleton` against the observed skeleton so only paths that
actually changed are marked.

## Quick example — React

```tsx
import { useStructural } from '@dirtytalk/structural/react';

const counter = new CounterContainer();

function CounterDisplay() {
  const [state, container] = useStructural(counter);

  // Only the paths read inside this render are recorded.
  // Accessing state.count registers "count" in this consumer's PathSet.
  // A patch to "label" will not re-render this component.
  return <button onClick={() => container.increment()}>{state.count}</button>;
}
```

On each render, `useStructural` wraps `state` in a recording Proxy, collects the accessed paths,
and stores them as the subscription interest for the next flush. If props or context change what
fields are read, the interest updates automatically on the next render — no selector declaration
required.

## API surface — public exports

| Export                            | Role                                                            |
| --------------------------------- | --------------------------------------------------------------- |
| `StructuralContainer<S>`          | Base class: state, channel, skeleton, `emit`/`patch`/`update`   |
| `PathInterner`                    | Interning: `intern(path): PathId`, `lookup(id): string`, `size` |
| `PathSet`                         | Type alias for the compact path-set value                       |
| `PathSetSpace`                    | `Space<PathSet>` implementation for the engine                  |
| `ALL_PATHS`                       | Sentinel `PathSet` — `intersects` always returns true           |
| `pathSetUnion`                    | Pure union of two `PathSet` values                              |
| `pathSetEquals`                   | Equality check for two `PathSet` values                         |
| `trackRender`                     | `(state, interner, proxyCache?) => { value: S, paths: PathSet }` |
| `ProxyCache`                      | Opt-in cache: reuses proxies across `trackRender` calls          |
| `raw`                             | `(v) => v` — unwrap a tracked proxy to its raw target           |
| `diffAlongSkeleton`               | `(prev, next, skeleton, interner) => PathSet`                   |
| `getAt`                           | `(obj, dottedPath) => unknown`                                  |
| `useStructural` _(react subpath)_ | `(container, options?) => [state, container]`                   |

## Tracking hazards

`trackRender` returns a recording proxy; values read off it are themselves
proxies. Two situations need `raw()` to unwrap them:

1. **Identity `===` callbacks.** Comparing a value read from the proxy against a
   raw object reference (directly, or via an identity-search like
   `Array.prototype.includes`) fails because the value is wrapped. Compare
   `raw(value) === rawRef`.
2. **Derived-array / escaped proxy.** A proxy (or a sub-proxy inside a derived
   array such as a `.filter` result) that escapes the render frame keeps
   recording into a stale `paths` set and breaks reference identity against the
   underlying state. Call `raw()` on anything stored or handed to code that
   expects the raw object.

## Cross-render proxy reuse (ProxyCache)

By default, `trackRender` allocates a brand-new `Proxy` for every object it touches, every single
call. For a component that maps over a large array (`items.map(item => <Row key={item.id} .../>)`),
that means a full re-render pays O(array length) proxy allocations even when almost every item is
the exact same object reference as last render — e.g. reordering two rows in a 1000-row list still
allocates ~1000 proxies for a change that only touched 2. `ProxyCache`, passed as `trackRender`'s
optional third argument, fixes this: a `(target, prefix)` pair unchanged since the caller's last
`trackRender` call reuses the same `Proxy` object instead of allocating a new one.

```ts
import { trackRender, ProxyCache } from '@dirtytalk/structural';

// Scoped per call-site — e.g. one per component instance, created once and
// reused across that component's renders (a React `useRef(new ProxyCache())`
// is the typical home for it; see @blac/react's `useBloc` for a worked
// example of wiring this into a hook).
const proxyCache = new ProxyCache();

function renderList(state: { items: Item[] }) {
  const { value, paths, disarm } = trackRender(state, interner, proxyCache);
  // ...read value.items, etc...
  disarm();
}
```

Key properties:

- **Keyed by `(target, prefix)`, not target alone.** The same object read at two different paths in
  one render (aliasing) still gets two independent proxies, exactly as the no-cache behavior
  guarantees — only a genuine repeat read at the *same* path across calls is reused. This is also
  why reordering an item to a brand-new index it has never occupied before still allocates a fresh
  proxy for it: the `(target, prefix)` pair is new, so there's nothing to reuse. The win is
  proportional to how many items keep their index across a render, which is exactly the common case
  (a two-item swap in a 1000-item list reuses 998 proxies and allocates 2).
- **Scope one `ProxyCache` per call-site, never globally or per-container.** An entry holds exactly
  one live "session" (the render's `paths`/`armed` state) at a time; sharing a cache across two
  independently-timed callers would let one caller's render silently repoint an entry the other
  caller is still reading from. If a consumer tracks more than one independent thing per render
  (e.g. a primary state plus a separate dependency), give each its own `ProxyCache`.
- **No explicit eviction needed.** The cache is `WeakMap`-keyed by the target object, so entries for
  objects no longer referenced anywhere else are collected normally.
- **`disarm()`, `raw()`/`untracked()`, and removal all keep working unchanged.** A reused proxy still
  unwraps to the same raw target via `raw()` regardless of how many renders old it is, and `disarm()`
  still freezes exactly the entries touched by the render that called it.

## What it is not

- **No auto-tracked computed values.** There is no `computed(() => a + b)` with a hidden
  dependency graph. Build derived values above this layer.
- **No effect system with cleanups.** The channel's `subscribe` returns an unsubscribe function;
  that is the cleanup primitive.
- **No scheduler opinions.** The scheduler is injected into `StructuralContainer`. The engine
  provides `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, and `RAFScheduler`; choose
  what fits your context. This package does not force one.
- **No mutation primitive.** All updates go through `emit`, `patch`, or `update` — immutable
  replacement only. In-place mutation of `state` bypasses change tracking silently.
- **No virtual DOM.** The React adapter triggers re-renders via `useReducer`; the actual
  reconciliation is React's job.

## License

MIT — see LICENSE.
