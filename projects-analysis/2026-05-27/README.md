# BlaC v2 — Real-World Usage Analysis (2026-05-27)

Analysis of how `@blac/core` and `@blac/react` v2 are used in two production codebases, what works, what's a workaround, and how to improve the libraries in [`packages/blac-core`](../../packages/blac-core) and [`packages/blac-react`](../../packages/blac-react).

## Documents

| File | What's in it |
|---|---|
| [`00-library-capabilities.md`](./00-library-capabilities.md) | Complete reference of the v2 public API — every exported capability, signature, intended use, and the library's own internal gaps. The baseline of "what's possible." |
| [`01-user-fe-reviews-analysis.md`](./01-user-fe-reviews-analysis.md) | `user-fe-reviews` — mid-migration (v1→v2 compat shim). Prop-driven, per-instance cubits. Render-time mutation anti-patterns. Leans on the team's own migration docs. |
| [`02-phylon-analysis.md`](./02-phylon-analysis.md) | `phylon` — clean-slate v2. 21 global-singleton cubits in a dependency DAG. `depend()` + `watch()` boilerplate, `autoTrack:false` as the default, `window` events as an escape hatch. |
| [`03-synthesis-and-recommendations.md`](./03-synthesis-and-recommendations.md) | **Start here for conclusions.** Cross-references the two projects against library capabilities; separates "didn't know it existed" from "doesn't exist"; prioritized roadmap. |

## TL;DR

The two projects use BlaC in opposite ways, so their agreements are strong signals. Both independently reinvent the same three things the library lacks:

1. **An inputs channel** — no first-class way to feed changing props/refs/config into a bloc, so devs mutate blocs during render (`bloc.props = props`, `setProps`, `setRefs`).
2. **A computed/derived primitive** — both hand-roll memoized derivation with manual identity guards and `recompute()` calls.
3. **Lifecycle-bound `this.watch`** — observing other blocs isn't tied to the observer's lifecycle, so every long-lived bloc copy-pastes subscription cleanup.

Separately, a lot of friction is **discoverability**: `this.depend()`, the `dependencies:` selector, the hydration API, and the testing utilities all exist and are barely or never used. See §2 and §4 of the synthesis.

**Build first:** inputs channel · computed primitive · lifecycle-bound `this.watch`.
