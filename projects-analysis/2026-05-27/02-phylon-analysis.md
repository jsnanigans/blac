# Phylon — v2 BlaC Usage Analysis

App: `@insomni/phylon` at `/Users/brendanmullins/Projects/cells/insomni/apps/phylon`
Libraries: `@blac/core ^2.0.12`, `@blac/react ^2.0.12` (used directly, no compat shim).
Date: 2026-05-27

---

## Overview

### Architecture & scale

Phylon is a WebGPU phylogenetic-tree viewer. It is a **medium-large, bloc-heavy** app: 21 `Cubit` classes under `src/state/cubits/`, plus 4 non-bloc "controller" classes under `src/state/controllers/` that own imperative GPU/canvas resources. ~16 React components consume blocs via `useBloc`.

There is **no `BlocProvider`, no `instanceId`, no scoped/per-instance bloc anywhere** — every cubit is a process-global singleton resolved by class. The whole app is a single implicit global graph. `main.tsx` (`src/main.tsx:8`) just renders `<App/>` in StrictMode; nothing configures blac (`configureBlacReact`, plugins, devtools) at all.

The cubits form a clear **layered dependency DAG**, wired with `this.depend(...)` + `watch(...)`:

- **Leaf/source state:** `LogCubit`, `TreeSourceCubit`, `MetadataCubit`, `LayoutCubit`, `HoverCubit`, `SelectCubit`, and pure UI cubits (`ConsoleUiCubit`, `ExplorerUiCubit`, `StructureUiCubit`, `StylePanelUiCubit`, `HoverTooltipUiCubit`).
- **Derived state cubits:** `AnnotationsCubit` (merges TreeSource + Metadata + user overrides), `StyleCubit` (derives from TreeSource), `MissingAttrsCubit` (derived from TreeSource + Style + Annotations), `SearchCubit` (resets on TreeSource), `PlaybackCubit` (autoplay timer keyed off TreeSource).
- **Orchestrator:** `SceneCubit` depends on 7 upstream cubits and pushes their state imperatively into the GPU controllers; `ExportPngCubit` depends on 5.

Two distinct mutation idioms coexist cleanly: `this.patch({...})` for partial updates and `this.emit({...})` for full replacement. Derived getters are used sparingly (`MetadataCubit.files` at `MetadataCubit.ts:21`, `PlaybackCubit.speed` at `PlaybackCubit.ts:60`).

### How React binds to state

Components call `useBloc(SomeCubit)` and overwhelmingly pass `{ autoTrack: false }` (see Workarounds). State and the bloc instance are destructured from the tuple; the third ref slot is never used. Side-effects that touch the DOM/canvas are bound in `useEffect`/`useLayoutEffect` and delegate to bloc methods (`Viewport.tsx:144-149` attach/detach; `HoverTooltip.tsx:31-35` measure-and-write-back).

---

## Good patterns

1. **Derived-state-as-its-own-cubit, recomputed via `watch`.** `AnnotationsCubit` (`AnnotationsCubit.ts:96-104`), `MissingAttrsCubit` (`MissingAttrsCubit.ts:30-43`), and `StyleCubit` (`StyleCubit.ts:41-48`) subscribe to upstream cubits in their constructor and recompute on change. This keeps expensive merges out of React render and out of the consuming components. This is the cleanest expression of "computed bloc" the library supports today.

2. **Imperative resources fully owned by a bloc, React stays declarative.** `SceneCubit` owns `PhyloSceneController` + `CanvasInteractionController` and exposes only `attach(canvas)`/`detach()` (`SceneCubit.ts:73-118`). `ExportPngCubit` owns an `OffscreenExportController` plus a debounce timer (`ExportPngCubit.ts:231-274`). `PlaybackCubit` owns a `setInterval` (`PlaybackCubit.ts:76-94`). Components just call methods. This is exactly the "bloc as side-effect boundary" model and it works well.

3. **`onSystemEvent("dispose", ...)` for resource cleanup.** Every cubit that owns a timer, subscription, or GPU controller registers a dispose handler (`SceneCubit.ts:66`, `ExportPngCubit.ts:79-83`, `PlaybackCubit.ts:38-42`, `AnnotationsCubit.ts:100-103`, etc.). Correct and consistent.

4. **`isDisposed` guards in every async/watch callback.** e.g. `SceneCubit.ts:130`, `MissingAttrsCubit.ts:46`, `AnnotationsCubit.ts:107`, `PlaybackCubit.ts:27`. They clearly hit the "watch fires after dispose" hazard and defend against it everywhere (see Pain Points — this is defensive boilerplate).

5. **Identity-based change-gating to avoid redundant work.** `SceneCubit` tracks `lastPushedAnalysis`/`lastPushedAnnotations`/`lastAppliedStyle` (`SceneCubit.ts:50-60`, guards at `:132,:144,:152`) so a `watch` firing on an unrelated field doesn't re-push to the GPU. `StyleCubit.lastAppliedAnalysis` (`StyleCubit.ts:38,:74`) and `SearchCubit.lastAnalysis` (`SearchCubit.ts:23,:32`) do the same. Effective, but it's hand-rolled memoization the library could help with.

6. **Async data loading lives in bloc methods, not effects.** `TreeSourceCubit.loadFile` (`TreeSourceCubit.ts:26`) and `MetadataCubit.loadFile` (`MetadataCubit.ts:25`) are `async` methods invoked from input handlers; they `await file.text()` then `emit`. Clean.

7. **Zero `useState` in panels by design.** UI-only cubits (`ConsoleUiCubit`, `StructureUiCubit`, `StylePanelUiCubit`, `ExplorerUiCubit`, `HoverTooltipUiCubit`) push transient UI state (open sections, expansion sets, input drafts, measured sizes) into blocs deliberately — comments say so (`ConsoleUiCubit.ts:8-10`, `StylePanelUiCubit.ts:24-28`). Whether that's over-engineering is debatable, but it's intentional and consistent.

---

## Workarounds & anti-patterns

### A. `{ autoTrack: false }` is the default, not the exception — the proxy tracker is largely opted out of

`autoTrack: false` appears on the **majority** of `useBloc` calls across every component:
`Viewport.tsx:10,11,13`, `TopBar.tsx:19,21,23,24,25,26`, `SidebarAnnotationsSection.tsx:97,102`, `StylePanel.tsx:380`, `LayoutPanel.tsx:357`, `SearchPanel.tsx:54`, `SearchResults.tsx:15,16`, `StructuralExplorer.tsx:25,57,92,124,126,305`, `AnnotationManager.tsx:95`, `HoverTooltip.tsx:23,25`.

Two sub-patterns, both telling:

- **Action-only access:** `const [, treeBloc] = useBloc(TreeSourceCubit, { autoTrack: false })` — they want the instance to call methods and explicitly do *not* want to subscribe (`TopBar.tsx:23-26`). For this case `autoTrack:false` is semantically wrong: it still subscribes to the *whole* state and re-renders on any change; they just don't read fields. The library has no "give me the instance, don't subscribe" mode, so they reach for the closest thing.
- **Reading nested/derived data the tracker can't see through:** `TreeSourceCubit`'s `analysis` is a deep parsed object; components read `tree.analysis?.parsed?.tree` etc. They turn off auto-track because the proxy either over-triggers on the giant object or they don't trust it through optional-chained deep reads (`StructuralExplorer.tsx:58-60`, `Viewport.tsx:156`, `HoverTooltip.tsx:40-45`).

**Why it matters for the library:** when a real-world app's dominant pattern is "turn the headline feature off," the headline feature isn't fitting the workload. The two missing affordances are (1) a subscribe-less "actions handle" and (2) confidence/ergonomics for deep/large objects. They never once use the `dependencies:` selector that exists for exactly the second case (see Unused Features) — which suggests they didn't know it was there, or tried auto-track, found it noisy, and bailed to the blunt instrument.

### B. The "watch + unsubs[] + dispose" boilerplate is copy-pasted into every derived cubit

The identical block recurs verbatim:
```ts
private unsubs: Array<() => void> = [];
constructor() {
  super(INITIAL);
  this.unsubs.push(watch([...], () => this.recompute()));
  this.onSystemEvent("dispose", () => { for (const u of this.unsubs) u(); this.unsubs = []; });
}
```
See `AnnotationsCubit.ts:94-104`, `MissingAttrsCubit.ts:28-43`, `StyleCubit.ts:39-48`, `SearchCubit.ts:24-42`, `PlaybackCubit.ts:21-43`, `SceneCubit.ts:49,103-127`. The comment at `MissingAttrsCubit.ts:32-36` spells out *why* they must collect and detach: "without that, listeners outlive the cubit and the next upstream emit calls recompute() on a disposed instance and throws." That is a sharp edge of `watch()`: **a `watch()` registered inside a bloc is not auto-tied to that bloc's lifecycle.** The library should either auto-dispose watches created during a bloc's construction or provide `this.watch(...)` that's lifecycle-bound. Today every author must rediscover this and write the cleanup by hand (and remember the `isDisposed` guards in A4 above).

### C. `watch()` fires immediately + on every upstream emit, so derived cubits re-derive too often and must self-debounce

`SceneCubit` subscribes six upstreams (`SceneCubit.ts:121-126`); each fires on *any* field change of that upstream, so it hand-rolls identity guards (pattern in Good#5) to avoid pushing to the GPU on irrelevant changes. `AnnotationsCubit.recompute` is invoked from `watch` *and* manually re-invoked after every mutator (`AnnotationsCubit.ts:257,265,297,314,324`) — there's no notion of "this derived value depends on X, recompute when X changes" so they both subscribe and imperatively poke. The missing affordance: a **computed/selector primitive** (derive value from chosen slices of upstream blocs, recompute only when those slices change identity). Right now "derived cubit" = full manual subscription + manual change detection + manual recompute calls.

### D. Cross-component signaling via `window` CustomEvents instead of a bloc

UI coordination that crosses the component tree is done with DOM events, not state:
- `phylon:focus-search` — `LeftSidebar.tsx:45` dispatches, `SearchPanel.tsx:66` listens (focus the search input).
- `phylon:reveal-attribute` — `StylePanel.tsx:51` dispatches, `SidebarAnnotationsSection.tsx:135` listens.
- `phylon:reveal-style-section` — `SidebarAnnotationsSection.tsx:323` dispatches.

These are imperative one-shot "commands" (focus me, scroll to me, expand me). The app already routes all other coordination through cubits, so falling back to `window.dispatchEvent` signals a gap: **blac has no ergonomic one-shot event/command channel** (everything is retained state). Modeling "focus the search box" as cubit state is awkward (you'd have to flip a flag and reset it), so they bypassed the library. A transient event/signal emit on a bloc would have kept this in the architecture.

### E. Manual recompute calls after mutators (coupling that a dependency system would remove)

`AnnotationsCubit` mutators each call `this.patch(...)` then `this.recompute()` (`AnnotationsCubit.ts:257-258, 265-266, 297, 314, 324`). Easy to forget one; it's the symptom of C. The mutator changes an input field, then must manually trigger the derivation that also lives in the same cubit.

### F. `applyUserOverrides` rebuilds the whole annotation table on every toggle

Not a blac bug, but blac's lack of memoized derivation pushes them to recompute a full `AnnotationTable` copy on every tooltip-key toggle (`AnnotationsCubit.ts:52-81` called from `recompute` at `:203`). A computed-with-deps primitive would let only the affected slice recompute.

---

## Pain points / unmet needs

1. **No lifecycle-bound subscription.** `watch()` inside a bloc leaks unless manually collected + disposed, and fires on disposed instances. This is the single most-repeated piece of boilerplate and the one with an explicit "or it throws" comment (`MissingAttrsCubit.ts:32-36`). **Highest-impact fix:** `this.watch(...)` (auto-cleaned on dispose) and/or skip-emit-after-dispose semantics.

2. **No "actions-only / no-subscribe" handle from `useBloc`.** Components that only call methods still subscribe to full state (`TopBar.tsx:23-26` etc.). `autoTrack:false` is misused as a stand-in. Need something like `useBloc(X, { subscribe: false })` returning just the instance, or a `useBlocInstance(X)`.

3. **No computed/derived primitive.** "Derived cubit" is entirely hand-built: subscribe-all + per-field identity guards + manual `recompute()` calls + `isDisposed` checks (Workarounds B, C, E, F). A first-class `computed`/selector that recomputes only when chosen upstream slices change would delete a large fraction of this code.

4. **Auto-tracking doesn't fit large/deeply-nested state**, so it's disabled almost everywhere (Workaround A). Either the proxy needs to track through deep optional-chained reads convincingly, or the `dependencies:` selector needs to be discoverable enough that people reach for it instead of `autoTrack:false`.

5. **No transient event/command channel on blocs**, forcing `window` CustomEvents for one-shot UI commands (Workaround D).

6. **No testing story exercised.** Zero `.test.ts(x)` files import `@blac` (grep confirmed); the only tests are pure-function tests (`channels.test.ts`, `topology.test.ts`, `exportNexus.test.ts`). The cubits — including the gnarly `AnnotationsCubit.recompute` merge logic — are untested. `@blac/core` ships a `testing` entry (`dist/testing.d.ts`) and `@blac/react` ships one too, but neither is used. Either the testing helpers are undiscovered or too heavy to bother; worth investigating whether testing a cubit-with-`depend`+`watch` is ergonomic enough to encourage.

---

## Signs of unused / unknown library features

- **`dependencies:` selector (manual re-render deps) — never used.** Defined in `UseBlocOptions` (`@blac/react/dist/types.d.ts`) and documented in the `useBloc` JSDoc, it is the intended tool for "only re-render when these fields change." Every component instead uses `autoTrack:false` (full-state subscription) or default auto-track. Strong sign they don't know it exists or found it unattractive. This is the clearest "reinventing/avoiding a feature" finding.

- **`instanceId` / scoped instances — never used.** All blocs are global singletons. Fine for this single-document app, but means the entire scoped-instance surface (`instanceId` option, `instance(Bloc, id)` refs in `watch`) is untouched. The `MEMORY.md` note about `instanceId` for per-component instances never came up.

- **`watch(instance(Bloc, id), ...)` ref form — unused.** They only ever `watch(Class, ...)` / `watch([Class,...], ...)`.

- **Registry API (`acquire`, `borrow`, `ensure`, `release`, `getAll`, `register`) — unused.** Controllers never touch the registry directly; they receive bloc instances via `depend()` getters (e.g. `SceneCubit` passes `this.getHover()` into `CanvasInteractionController` at `SceneCubit.ts:86-87`). Good — but it means the "imperatively grab a bloc outside React" surface is exercised only through `depend` + module-level `watch`.

- **Plugins / devtools / `getPluginManager` — unused.** No `configureBlacReact`, no plugin registration, no devtools exclusion. App boots with zero blac configuration (`main.tsx`). Either they don't know devtools exist or didn't need them.

- **Hydration API (`beginHydration`/`applyHydratedState`/`waitForHydration`) — unused.** `LayoutCubit` persists `activeLeftTool` to `localStorage` by hand (`LayoutCubit.ts:34-52`) inside `loadActiveLeftTool()` at construction and a manual `saveActiveLeftTool` call in each mutator. This is precisely the use case a persistence/hydration plugin would cover; they rolled it manually, suggesting the hydration surface isn't discoverable as "persist this bloc to storage."

- **`update(updater)` — unused.** They use `emit` (full) and `patch` (partial) only; the functional `update(prev => next)` form is never used. Minor.

- **`onMount`/`onUnmount` useBloc callbacks — unused.** Mount-time work is done in component `useEffect`s (`Viewport.tsx:144`, `SearchPanel.tsx:59`) rather than the hook options. Possibly fine, possibly unknown.
