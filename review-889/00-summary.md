# Review 889 — @dirtytalk/engine · @dirtytalk/structural · @dirtytalk/spatial

Full-depth review of `packages/dirtytalk-engine`, `packages/dirtytalk-structural`, `packages/dirtytalk-spatial` (every non-test source file read line-by-line; ~1.6k LOC). Focus: reliability, performance, architecture, API design. Companion to [review-884](../review-884/00-summary.md) (blac-core/blac-react) — a few findings there are *owned* by these packages and are re-stated here from the owning side.

Files:

- [01-reliability-bugs.md](01-reliability-bugs.md) — E1–E4 (engine), T1–T9 (structural), S1–S9 (spatial)
- [02-performance.md](02-performance.md) — P1–P8
- [03-architecture.md](03-architecture.md) — A1–A8 (incl. one correction to review-884)
- [04-api-design.md](04-api-design.md) — API issues, missing features, simplify/remove

## Top findings

| # | Sev | Package | Finding |
|---|-----|---------|---------|
| T1 | **critical** | structural | `emit()` diffs only along the consumer skeleton — changes to untracked fields produce an empty dirty set and **no subscriber flush at all** (root cause of review-884 R1) |
| E1 | **high** | engine | Every non-Sync `Scheduler` has a single flush slot — sharing one scheduler across two channels **permanently deadlocks** the channel whose flush gets overwritten |
| T2 | **high** | structural | `trackRender` proxy cache is keyed by target object only; a subtree shared between two paths records the *first* path for reads via the *second* → missed wake-ups |
| T3 | **high** | structural | Tracked read of a frozen state object throws (`Proxy` invariant: non-writable non-configurable property must return the exact value, trap returns a sub-proxy) |
| S1 | high | spatial | `SceneRoot` with default (zero-area) bounds never renders anything — interest never intersects; zero-area damage is silently dropped, stalling data-first bootstraps |
| T4 | medium | structural | Object key enumeration is untracked: `Object.keys(state.dict)` records nothing; added/removed keys never wake any consumer |
| S2 | medium | spatial | Hit-testing ignores `clipsOverflow` — visually clipped content is still interactive at its unclipped position |
| T5 | medium | structural | Iteration callbacks receive sub-proxies → `items.find(x => x === raw)` never matches; `slice()`/`filter()` return proxy-containing arrays that escape the render |

Themes:

1. **The dirty-region algebra is sound; the sources aren't uniformly honest.** `patch()` marks changes independent of who's listening (its docstring states the invariant); `emit()` and zero-area spatial damage both under-mark, and the channel faithfully delivers nothing (T1, S1).
2. **Proxy tracking has a well-defined core and ragged edges** — aliased subtrees, frozen objects, enumeration, identity semantics (T2–T5). Each edge is silent: consumers render fine and just stop waking.
3. **Unused public surface**: `Signal`, `useStructural` + the whole `/react` subpath, `pathsFromPatch`, the `TRACK_ARRAY_ITERATION=false` branches, and (in-repo) the entire spatial package have zero non-doc consumers. See the S-list.
