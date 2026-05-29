# dirtytalk notes

Working notes on the `dirtytalk` reactive engine, grounded in the source at
`packages/dirtytalk-engine` and `packages/dirtytalk-structural`.

## Read in order

1. **[01-overview.md](./01-overview.md)** — the one problem, the two layers,
   the motivating pair (blac + insomni).
2. **[02-when-to-use.md](./02-when-to-use.md)** — fit signature, when it's
   overkill, real-world shapes, decision shortcut.
3. **[03-engine-internals.md](./03-engine-internals.md)** — `Space`,
   `DirtyChannel` flush algorithm, schedulers, `Signal`.
4. **[04-structural-internals.md](./04-structural-internals.md)** — `PathSet`,
   interner, `trackRender`, diff helpers, `patch` vs `emit`, the skeleton.
5. **[05-react-adapter.md](./05-react-adapter.md)** — `useStructural` and the
   load-bearing registration-timing rule.
6. **[06-gotchas.md](./06-gotchas.md)** — ten sharp edges.
7. **[07-recipes.md](./07-recipes.md)** — copy-paste code for the common cases.

## TL;DR

> Compute "what changed" once at the source as a `Region`; let each subscriber
> cheaply intersect it against its own interest. One walk + N intersections
> instead of N walks. Wins scale with consumer count.

- **Engine** = abstract algebra (`Space` + `DirtyChannel` + `Scheduler`),
  region-agnostic.
- **Structural** = engine instantiated with `Region = PathSet` for objects;
  ships `StructuralContainer` + the `useStructural` React hook.
- `patch` marks by *shape* (no diff); `emit`/`update` diff along the *skeleton*
  (≥2 consumers) or skip to `ALL_PATHS` (≤1 consumer).
