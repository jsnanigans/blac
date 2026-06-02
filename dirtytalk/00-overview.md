# DirtyTalk — Design Notes

A reactive engine shared by two libraries that solve the same problem in different spaces:

- **insomni** — a WebGPU renderer + UI/plot library. The "what changed" space is **geometric** (rects on a canvas). Consumers (the renderer) want to know what region to repaint.
- **blac** — a state container library with React bindings. The "what changed" space is **structural** (paths through an object tree). Consumers (React components) want to know whether their tracked slice was touched.

Both libraries ask the same question — _"what changed, who cares, when do we tell them"_ — and both want the answer computed **once at the source** and consumed **cheaply by N subscribers**. The Space they operate over differs; the engine does not.

## Documents

- [01-engine.md](./01-engine.md) — the shared engine. `Observable`/`Signal` primitives, `DirtyChannel<Region>` generic over a `Space`, pluggable `Scheduler`. No domain knowledge.
- [02-insomni.md](./02-insomni.md) — insomni instantiation. `SceneNode`, damage rects, damage kinds (`paint`/`layout`/`data`), RAF-driven scheduler. Future-proof for tile/scissor partial redraw.
- [03-blac.md](./03-blac.md) — blac instantiation. Per-Bloc path interning, per-consumer path-set recording via Proxy (kept ~as-is), observed-skeleton-driven source-side diff, microtask-driven scheduler.

## The core insight

Today, both libraries do diffing **at the consumer**:

- insomni's `Invalidator` is a single dirty bit; each frame, the renderer asks "are you dirty?" — but there's no information about _what_ is dirty, so the entire canvas is repainted. Widgets that mutate fields outside pointer handlers don't dirty anything at all.
- blac's per-consumer Proxy tracker re-walks state on every emit, once per consumer. With N consumers, each emit does N traversals.

The shared move is: **compute "what changed" once at the source, in a format that subscribers can intersect against cheaply.** insomni's "format" is a rect (or union of rects). blac's is a `Set<PathId>`. Both are members of the same algebra: a set/region with `empty`, `union`, `intersects`.

## What this is not

- Not a virtual DOM, not a reactive-graph dependency tracker (no auto-computed values from this engine), not a state-management library. It is a **dirty-tracking and notification layer** that two different libraries use as their notification core.
- Not coupled to any framework. React adapters live in blac, not in the engine.
- Not a scheduler with opinions. The engine takes a `Scheduler` interface; insomni passes RAF, blac passes microtask, tests pass synchronous.

## Status

These docs are design notes — decisions captured from a long brainstorm, written down before any code exists. Treat them as a single coherent proposal, not as final spec. Each doc has an **Open questions** section at the bottom for things that need more thought before implementation.

## Migration posture

Neither library has to adopt this all at once.

- **insomni:** wrap today's `Invalidator` as a degenerate `RectSpace` consumer first (one rect = whole canvas), then port widgets to `SceneNode` incrementally, then turn on per-region damage in the renderer.
- **blac:** add path-tracking alongside today's autoTrack; gate the new diff path behind a feature flag; verify correctness against the existing path before flipping the default.

Both libraries should remain shippable at every commit.
