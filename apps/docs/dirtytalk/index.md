# DirtyTalk

DirtyTalk is a family of small, framework-agnostic libraries built around one question: **after a mutation, what changed, who cares, and when do we tell them?** Each package answers that question in a different domain, but they all share a single move — compute "what changed" once at the source, in a format every subscriber can intersect cheaply. This page is the entry point to the whole section; it explains the shared thesis and points you to the package you actually need.

## The shared thesis

Two unrelated problems turn out to be the same problem. A WebGPU renderer mutates a scene and must repaint; a state container mutates state and must notify subscribers. Both face the same three sub-questions after every mutation:

1. **What changed?** — a region of the world the mutation touched.
2. **Who cares?** — the subscribers whose interest overlaps that region.
3. **When do we tell them?** — the scheduling window in which we batch and deliver.

The naive answer pushes all the work down to each consumer. A renderer with a single dirty bit repaints the whole canvas because the bit lost the information about *where* the change was. A state container re-walks the entire state tree once per subscriber — N consumers means N separate tree walks doing the same equality checks. Both approaches throw away the structure of the change and pay for it on every read.

DirtyTalk's answer is to compute "what changed" **once, at the source**, and express it as a **Region** — a value in an algebra with `empty`, `union`, and `intersects`. The source accumulates a single dirty region per scheduling window. Each subscriber declares an interest region. Deciding who to wake is then just one cheap `intersects` check per subscriber against the one shared dirty region — work proportional to the number of subscribers, not to the size of the state or the scene multiplied by the number of subscribers.

::: info Why "Region" is the right abstraction
A single dirty bit is a Region too — but a degenerate one that only answers "did *anything* change?" By keeping the Region rich (damage rectangles, or a set of changed paths), the source preserves exactly the information each subscriber needs to do less work: skip an undamaged screen area, or skip a re-render when an unread field changed.
:::

## The layering

DirtyTalk separates the **abstract algebra** from its **concrete instantiations**. The engine defines the shape of the problem; the two domain packages fill in what a `Region` actually is.

| Package | Role | What a `Region` is | Built for |
| --- | --- | --- | --- |
| `@dirtytalk/engine` | The abstract algebra + scheduling glue. Defines the `Space<Region>` interface (`empty` / `isEmpty` / `union` / `intersects`), the `Scheduler` interface (with `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, `RAFScheduler`), and `DirtyChannel<Region>` — the core that accumulates marks within a window and fans out to interested subscribers in one flush. Ships **no** concrete `Region`. | abstract — you supply one | The shared core both domains depend on |
| `@dirtytalk/spatial` | The concrete instantiation for 2D rendering. `RectSpace` implements `Space<DirtyRegion>` where a `Region` is a list of damage rects (`Damage` entries carrying a `Rect` and a `kind`). Adds a `SceneNode` / `SceneRoot` tree, a three-stage `data → layout → paint` pipeline, and a `PointerRouter`. | a list of damage rects | canvas / GPU renderers |
| `@dirtytalk/structural` | The concrete instantiation for state containers. `PathSetSpace` implements `Space<PathSet>` where a `Region` is a set of interned path IDs. Adds a `PathInterner`, a `trackRender` proxy recorder, diff helpers, and an abstract `StructuralContainer`. | a set of interned path IDs | observable state / data stores |

Each domain package answers the *same* algebra in its own terms. "Union two dirty regions" means "bounding-box-concatenate two damage lists" in spatial and "set-union two path-ID sets" in structural. "Does this interest intersect the dirty region?" means "do any rects overlap?" in spatial and "do the sets share an ID?" in structural. The `DirtyChannel` machinery — coalescing, selective fan-out, lazy interest thunks, re-entrancy handling, error isolation — is written once in the engine and reused by both.

::: details The engine ships zero `Region` implementations — on purpose
`@dirtytalk/engine` never references React, the DOM, or a GPU, and it ships no concrete `Space`. `RectSpace` lives in spatial; `PathSetSpace` lives in structural. The engine only `union`s and `intersects` whatever Regions you hand it — producing a Region from a mutation is the consumer's job. There is no dependency graph, no auto-tracking, and no diffing at the engine layer.
:::

## Relationship to BlaC

If you arrived here from the BlaC documentation: **BlaC is the headline product of these docs.** It is a state-container library with per-consumer path tracking, and it is a motivating consumer of the structural model — `@dirtytalk/structural` is the lower-level lineage of BlaC's per-consumer path tracking.

These DirtyTalk packages are **standalone and framework-agnostic**. You can use `@dirtytalk/engine`, `@dirtytalk/spatial`, or `@dirtytalk/structural` entirely on their own, with no React and no BlaC. This section documents that lower-level engine family directly. If you want a batteries-included state library for React, start with [the BlaC introduction](/guide/introduction); if you want the underlying machinery, read on.

## Install

::: code-group

```bash [pnpm]
# The abstract core (always available; the domain packages depend on it)
pnpm add @dirtytalk/engine

# 2D rendering domain
pnpm add @dirtytalk/spatial

# State-container domain
pnpm add @dirtytalk/structural
```

```bash [npm]
npm install @dirtytalk/engine
npm install @dirtytalk/spatial
npm install @dirtytalk/structural
```

```bash [yarn]
yarn add @dirtytalk/engine
yarn add @dirtytalk/spatial
yarn add @dirtytalk/structural
```

:::

Both `@dirtytalk/spatial` and `@dirtytalk/structural` depend on `@dirtytalk/engine`, so installing either one pulls the engine in transitively. Install the engine on its own only when you are wiring up a brand-new domain with your own `Space`.

## Which package do I want?

| If you want to… | Use | Start at |
| --- | --- | --- |
| Track changes to a 2D scene and repaint only what moved (canvas / WebGPU) | `@dirtytalk/spatial` | [Spatial getting started](/dirtytalk/spatial/getting-started) |
| Observe a state container and wake only the consumers that read the changed fields | `@dirtytalk/structural` | [Structural getting started](/dirtytalk/structural/getting-started) |
| Use BlaC's state management in a React app | `@blac/core` + `@blac/react` | [BlaC introduction](/guide/introduction) |
| Apply the "compute changes once, fan out cheaply" pattern to a **new** domain with your own `Region` | `@dirtytalk/engine` | [Engine getting started](/dirtytalk/engine/getting-started) |
| Understand the algebra and scheduling model before picking a domain | `@dirtytalk/engine` | [Engine concepts](/dirtytalk/engine/concepts) |

::: tip Not sure?
If your changes have a position on screen, you want **spatial**. If your changes are fields in an object graph, you want **structural**. If you are building neither but recognize the "what changed / who cares / when" pattern, you want the **engine** plus a `Space` of your own.
:::

## Next steps

Pick a package and dive in:

- **Engine** — the abstract core. [Getting started](/dirtytalk/engine/getting-started) builds your first `DirtyChannel`; [concepts](/dirtytalk/engine/concepts) covers the `Space` algebra, schedulers, and the `DirtyChannel` flush model.
- **Spatial** — the 2D rendering domain. [Getting started](/dirtytalk/spatial/getting-started) builds your first scene; [concepts](/dirtytalk/spatial/concepts) covers the damage model, the render pipeline, and pointer routing.
- **Structural** — the state-container domain. [Getting started](/dirtytalk/structural/getting-started) builds your first container; [concepts](/dirtytalk/structural/concepts) covers path sets, the observed skeleton, and read tracking.

## See also

- [Engine: concepts](/dirtytalk/engine/concepts) — the `Space` algebra, schedulers, and `DirtyChannel` in depth.
- [Spatial: concepts](/dirtytalk/spatial/concepts) — how damage rects drive the `data → layout → paint` pipeline.
- [Structural: concepts](/dirtytalk/structural/concepts) — interned path IDs, the skeleton, and per-consumer tracking.
- [BlaC: introduction](/guide/introduction) — the headline state library that motivated the structural model.
