# Review 884 — @blac/core + @blac/react

Full-depth review of `packages/blac-core/src` and `packages/blac-react/src` (all non-test source read line-by-line, ~5.0k LOC), plus the parts of `@dirtytalk/structural` / `@dirtytalk/engine` needed to verify channel/diff semantics. Focus: reliability, performance, architecture, API design.

Files:

- [01-reliability-bugs.md](01-reliability-bugs.md) — correctness bugs, leaks, races (R1–R22)
- [02-performance.md](02-performance.md) — hot-path and memory issues (P1–P10)
- [03-architecture.md](03-architecture.md) — structural/design observations (A1–A9)
- [04-api-design.md](04-api-design.md) — API surface issues, missing features, simplification/removal candidates (D1–D11, F1–F11, S1–S12)

## Top findings (by severity)

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| R1 | **critical** | `emit()` with ≥2 auto-track consumers silently drops changes to un-tracked fields — starves `watch()`, select-mode `useBloc`, plugins (persist/devtools), and `onSystemEvent('stateChanged')` | `dirtytalk-structural/container.ts:141` via `StateContainer.applyState` |
| R2 | **high** | `useBloc` subscribes in a passive effect with no post-subscribe recheck → emits in the mount window are missed; component stays stale until the next emit | `blac-react/useBloc.ts:249` |
| R3 | **high** | Ref-count leak: `useMemo` re-acquires under the same refId when `JSON.stringify(args)` changes but the resolved instance key doesn't (`static key` ignoring fields; key-order instability) — unmount releases only one count | `blac-react/useBloc.ts:170-224` |
| R4 | **high** | `acquire()` during render (memo + dep `.track()`) leaks refs on abandoned renders (concurrent React); StrictMode balances only by accident | `blac-react/useBloc.ts:184,597` |
| R5 | **high** | `watch()` creates instances without forwarding `args` (`BlocRef` discards them) → `init(undefined)`; watched instances are never disposed and go permanently silent if disposed elsewhere | `blac-core/watch/watch.ts:103-112` |
| R6 | **high** | `BlacPlugin.onHydrationChange` is documented (README + web-docs) but never dispatched anywhere — dead hook | `blac-core/plugin/PluginManager.ts` |
| R7 | medium | Registry `stateChanged` listener count can permanently over-count (same fn added twice) → gate stuck open | `StateContainerRegistry.ts:701-713` |
| R8 | medium | `hydration.begin()` while already hydrating orphans prior `wait()` promises (hang forever); `finish()` silently converts `error` → `hydrated` | `StateContainer.ts:599-641` |
| R9 | medium | Orphan-dep cleanup misses: one key per dep Type, per-call-args dep instances never recorded, cleanup is depth-1 only | `StateContainer.ts:303`, `StateContainerRegistry.ts:500` |

Recurring themes:

1. **Two sources of truth for "did state change"** — the channel's path-diff vs the registry's direct notification vs system events. R1, R7, R14 all fall out of this (see A3).
2. **Ref-counting by string convention** — acquire/release pairing depends on callers resolving identical keys and refIds at different times; R3/R4/R5 are all pairing drift (see A2).
3. **Side effects in React render phase** — acquisition in `useMemo` / getter tracking is the root of R3/R4 and is the main obstacle to concurrent-React safety (see D8/F2).

Scope note: `@dirtytalk/structural` and `@dirtytalk/engine` were read only to verify contracts blac relies on (`DirtyChannel.subscribe` does not replay; flush early-returns on empty dirty; `diffAlongSkeleton` is skeleton-bounded). R1's root cause lives in structural's `emit`, but the broken contract is owned by blac-core's public API.
