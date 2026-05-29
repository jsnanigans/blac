# Gotchas & sharp edges

Things that will bite if you don't know them. All source-grounded.

## 1. `patch` doesn't diff — it wakes on shape, not value

`patch({ count: 5 })` when `count` is already `5` **still marks `count` dirty**
and wakes its consumers. Only `emit`/`update` compare values (and only with ≥2
consumers). If you need value-gated notification, use `emit` or pre-check
yourself. See `04-structural-internals.md`.

## 2. `emit` with ≤1 consumer never diffs

It marks `ALL_PATHS`. So micro-benchmarking emit with a single subscriber tells
you nothing about the many-consumer path — the optimization you're measuring is
literally skipped. Test the diff path with ≥2 registered consumers.

## 3. Arrays are atomic in patch semantics

`pathsFromPatch` and `deepMerge` treat arrays (and `Date`/`Map`/`Set`/class
instances) as **leaves**. `patch({ items })` replaces the whole array and marks
just `items` — never per-index paths. Likewise `trackRender` **coarsens
iteration**: `.map`/`for..of`/`.find` record the entry path (`items`), not
`items.0`, `items.1`, … So array consumers re-render on *any* array change, by
design. If you need per-element isolation, model elements as keyed child
containers, not array indices.

## 4. In-place mutation is invisible

There is no mutation primitive. All updates must go through `emit`/`patch`/
`update` (immutable replacement). Mutating `container.state` in place bypasses
change tracking **silently** — no error, no wakeup. `emit`'s very first line is
`Object.is(prev, next)` ref-equality short-circuit, so emitting the same mutated
object reference also no-ops.

## 5. Interest is a thunk evaluated at flush, not subscribe

If you subscribe to the raw channel manually, your interest function runs on
*every flush*. Don't snapshot interest at subscribe time (you'd miss updates),
and don't do expensive work in the thunk — it's on the hot path. A throwing
thunk is swallowed as "no interest this flush" and recorded as an error.

## 6. Subscribers added mid-flush wait one cycle

The flush snapshots the subscriber list at the start. A `subscribe()` from
inside a callback sees the *next* flush, not the current one. Symmetric for the
re-entrant `mark()`: it defers to the next flush. Don't expect within-tick
convergence across a dependency chain — there's **no glitch-free graph** at this
layer.

## 7. Errors don't abort the flush, but they do throw afterward

One bad callback won't starve the others — all run, then errors surface (single
re-thrown as-is, multiple wrapped in `AggregateError`). But they *do* throw out
of the flush, which under `MicrotaskScheduler` means an unhandled rejection-ish
path. Wrap risky callback bodies if you can't tolerate that.

## 8. React: never register paths during render

Covered in `05-react-adapter.md` but worth repeating — registering interest in
the render body stores an empty set (proxy hasn't recorded yet) and silently
drops future wakeups. Registration must be post-commit (`useLayoutEffect`).
This is the failure mode behind the repo's "register after render commits"
fixes.

## 9. Interner IDs are per-class and never reclaimed within a class's life

The `PathInterner` only grows (`intern` pushes, never removes). Paths are keyed
per container *class* via a `WeakMap<ctor, PathInterner>`. Fine in practice —
the path *vocabulary* of a class is bounded — but a class that generates
unbounded dynamic path strings (e.g. interning user-supplied keys forever) will
grow the interner without bound for that class's lifetime.

## 10. Scheduler choice changes timing semantics

`MicrotaskScheduler` (blac default) flushes at end of microtask — async, marks
within a tick coalesce. `SyncScheduler` flushes inline on every mark — use in
tests/SSR for deterministic, synchronous assertions. `RAFScheduler` ties flushes
to frames (16ms `setTimeout` fallback in Node). Pick per context; the container
takes it via `options.scheduler`.
