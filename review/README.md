# BlaC review — `@blac/core` + `@blac/react`

Date: 2026-09-04. Scope: `packages/blac-core`, `packages/blac-react`, and the
`@dirtytalk/structural` / `@dirtytalk/engine` layers they sit on. Repo state:
`main` @ `e595f185`, both packages at `2.0.20`.

Every finding below was traced in source. Items marked **reproduced** were
confirmed with a throwaway vitest probe that has since been deleted.

## Files

| File                                                       | Contents                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [01-correctness.md](./01-correctness.md)                   | Bugs and unsafe behaviour, with reproductions and fixes              |
| [02-performance.md](./02-performance.md)                   | Hot-path and allocation findings, with fixes                         |
| [03-bundle-and-packaging.md](./03-bundle-and-packaging.md) | Size budgets, tree-shaking, exports, build                           |
| [04-architecture.md](./04-architecture.md)                 | The structural changes that make the library fast, safe and scalable |
| [05-api-and-types.md](./05-api-and-types.md)               | API surface, type safety, dead code                                  |
| [06-dx-and-docs.md](./06-dx-and-docs.md)                   | Developer experience and documentation drift                         |
| [07-tests-and-tooling.md](./07-tests-and-tooling.md)       | Test suite, configs, CI gaps                                         |

## Verification snapshot

| Check                       | Result                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `@blac/core` `vp test run`  | 32 files, 461 tests pass                                            |
| `@blac/react` `vp test run` | 25 files pass, 1 file fails (`useBloc.proxy-prop-tracing.test.tsx`) |
| `tsc --noEmit` core         | clean                                                               |
| `tsc --noEmit` react        | clean                                                               |
| `size-limit` core           | 8.35 kB brotli, budget 7.8 kB, **over by 548 B**                    |
| `size-limit` react          | 5.4 kB brotli, budget 3.5 kB, **over by 1.9 kB**                    |

Raw dist sizes (brotli, `dist/*.js`):

| Chunk                                                | Raw     | Brotli |
| ---------------------------------------------------- | ------- | ------ |
| `blac-core/dist/index.js`                            | 3.6 kB  | 1.2 kB |
| `blac-core/dist/StateContainerRegistry-*.js`         | 39.1 kB | 9.6 kB |
| `blac-core/dist/ensure-*.js` (StateContainer, Cubit) | 20.0 kB | 5.7 kB |
| `blac-react/dist/index.js`                           | 19.5 kB | 5.5 kB |
| `dirtytalk-structural/dist/index.js`                 | 20.9 kB | 6.2 kB |
| `dirtytalk-engine/dist/index.js`                     | 5.5 kB  | 1.1 kB |

## Overall assessment

The engine is the asset. Interned path ids, a `DirtyChannel` with a pluggable
region algebra, a source-side skeleton diff, leaf-only proxy recording, and
cross-bloc tracking through getters is a genuinely differentiated design. Very
few libraries get per-leaf re-render isolation _and_ source-side change
detection at the same time.

The layers above the engine are where speed, safety and DX are lost:

- the lifecycle layer runs side effects in render and leaks under discarded
  renders and SSR,
- the React hook re-implements what `useSyncExternalStore` provides and is
  exposed to tearing,
- the getter-tracking mechanism is built on a `this`-Proxy and therefore
  forbids ES `#private` in user code,
- ownership is split between refs and dependents and the two disagree,
- the plugin/hydration ordering discards persisted state for the documented
  `init()` pattern,
- docs describe an API that is several versions behind.

## Prioritised roadmap

### Tier 1 — fix now (days)

1. Emit `created` after `init()` so hydration is not cancelled by seeding.
   → [01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init)
2. Make `release()` honour `dependents`. → [01 §2](./01-correctness.md#2-release-disposes-a-dependency-that-a-live-owner-still-uses)
3. Track dependent edges per resolved key, not per type. → [01 §3](./01-correctness.md#3-dependent-edges-for-per-call-args-are-never-released)
4. Make `emit`/`patch` after dispose a dev-warn no-op. → [01 §5](./01-correctness.md#5-emit-after-dispose-throws)
5. Delete or fix the tracing experiment test. → [07 §1](./07-tests-and-tooling.md#1-failing-test)
6. Lazy `stateChanged` bridge; store the key on the registry entry.
   → [02 §1](./02-performance.md#1-every-instance-subscribes-an-all_paths-bridge-at-construction), [02 §4](./02-performance.md#4-dispose-is-on-per-instance)
7. Fix the README/API drift list. → [06 §2](./06-dx-and-docs.md#2-documentation-drift)

### Tier 2 — next release (1–2 weeks)

8. Replace the `this`-Proxy getter mechanism with a tracking override on the
   instance so `#private` works. → [04 §3](./04-architecture.md#3-tracking-override-instead-of-a-this-proxy)
9. Move `getPluginManager` out of the registry module; get both packages under
   budget. → [03](./03-bundle-and-packaging.md)
10. Public deps API (`useBlocDeps` or a `deps` option). → [05 §4](./05-api-and-types.md#4-the-deps-lane-has-no-public-api)
11. Type tightening: zero-arg constructor constraint, deep-readonly state,
    dev-only mutation traps. → [05 §2](./05-api-and-types.md#2-type-safety)
12. Remove dead surface. → [05 §3](./05-api-and-types.md#3-dead-and-redundant-surface)

### Tier 3 — the `@blac/react` rewrite (one coordinated change)

13. `useSyncExternalStore` with a per-consumer version snapshot.
    → [04 §1](./04-architecture.md#1-usesyncexternalstore-with-a-per-consumer-version-snapshot)
14. Activation lifecycle (`onActivate` / `onDeactivate`) and a zero-ref sweep;
    render becomes pure. → [04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render)
15. Unified ownership count; `ensure()` gated behind a dependent.
    → [04 §4](./04-architecture.md#4-one-ownership-model)
16. Registry via React context. → [04 §5](./04-architecture.md#5-registry-scoping-through-context)
17. Consolidate the hook's ~17 refs / 3 effects into one consumer object.
    → [02 §6](./02-performance.md#6-per-consumer-hook-cost)

Items 13, 14 and 17 touch the same 900 lines of `useBloc.ts` and should ship
together; doing them separately means rewriting the reconcile logic twice.
