# Scope — the breaking batch (R4)

Date: 2026-09-07. Repo state: `main` @ `f60ac717`, both packages `2.0.20`.

This unblocks the six items that have sat behind "needs a batching decision"
since Phase 4. Decisions below are Brendan's, recorded 2026-09-07.

## Decisions

| Question             | Decision                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| External consumers   | Assume none.                                                                                                           |
| Release              | **Stay on `2.x`.** Breaks ship as a minor — the project is in alpha, so the semver violation is accepted deliberately. |
| Export shape         | **One barrel, `getPluginManager` cut from it** — this is what actually delivers 03 §2.                                 |
| `/testing`           | **Kept.** See "Deviation" below.                                                                                       |
| `configureBlacReact` | Remove.                                                                                                                |
| Naming pass          | Approved.                                                                                                              |

**Changeset consequence:** the pending `instance-type-preserves-class` changeset
is currently `major` on `@blac/react`, which would force `3.0.0` on release. It
must be rewritten to `minor` to hold the `2.x` line, and the new changeset for
this batch is `minor` on both packages with the breaks listed in its body.

## Deviation from the brief, and why

The brief said "drop subpath exports" (all five). Measured usage:

| Subpath     | `.ts`/`.tsx` imports | of which tests | build aliases | docs |
| ----------- | -------------------- | -------------- | ------------- | ---- |
| `./testing` | **56**               | 55             | **7**         | 16   |
| `./debug`   | 1                    | 0              | 0             | 1    |
| `./plugins` | 1                    | 0              | 0             | 3    |
| `./watch`   | 1                    | 0              | 0             | 1    |
| `./types`   | 0                    | 0              | 0             | 1    |

`./testing` exports 10 test-harness helpers (`createTestRegistry`,
`createCubitStub`, `blacTestSetup`, `withBlocState`, …). It has no test-runner
import, so folding it into the barrel is technically possible — but it would put
the test harness in the same entry point as `Cubit` and `useBloc`. That is the
same class of problem as `getPluginManager`, which this batch exists to fix, and
relies on the same tree-shaking assumption that already failed once for
`PluginManager`. Shipping `createCubitStub` to production bundles is a worse
outcome than keeping one subpath.

**Resolved: drop the four trivial subpaths, keep `./testing`.** 5 → 1, and the
`getPluginManager` cut still lands. Confirmed by Brendan.

## Work items

### 1. Cut `getPluginManager` from the barrel — 03 §2

The blocker: `src/plugins.ts` holds the singleton (Phase 2 moved it there and
decoupled the registry), but the barrel still re-exports it, so anything
importing `@blac/core` pulls `PluginManager` in. Phase 2 measured the decoupling
alone as **not shrinking the bundle** (8.46 → 8.51 kB) for exactly this reason.

- Remove `getPluginManager` (and `PluginManager`, `BlacPlugin` if re-exported)
  from `src/index.ts`.
- They stay reachable — but the barrel is the only entry now, so plugin authors
  need a route. **Open sub-question resolved by the export decision:** with
  `/plugins` dropped, plugin consumers import from the barrel too, which
  re-introduces the coupling. Therefore: `getPluginManager` is cut from the
  barrel and `/plugins` is _retained_ only if measurement shows the cut does not
  hold. Measure first (`pnpm size` before/after) — if removing it from the
  barrel does not reduce core size, the cut is cosmetic and the finding should be
  closed as won't-fix rather than shipped as a break for nothing.
- **Gate:** this item only ships if `pnpm size` shows a real reduction.

### 2. Drop `./debug`, `./plugins`, `./watch`, `./types`

- `package.json` `exports`: remove the four keys, keep `.` and `./testing`.
- Remove the matching `vite.config.ts` entry-map members and the api-extractor
  configs / `etc/*.api.md` reports for the dropped entries.
- Fix the 3 real import sites (1 each for debug/plugins/watch; types has 0).
- Docs: 6 mentions across `.md`/`.mdx`.

### 3. Remove `configureBlacReact` + `BlacReactConfig` — 05 §3

**The module is inert.** `getBlacReactConfig()` — the only reader — has **zero
callers**; nothing in `useBloc` or elsewhere consults the config. So
`configureBlacReact({...})` writes to a variable no code path reads. The doc
comment states the tracking model is fixed.

Delete `src/config.ts` entirely (`BlacReactConfig`, `configureBlacReact`,
`getBlacReactConfig`, `resetBlacReactConfig`) and its 2 barrel exports.

**Where config actually lives now**, for the docs pass:

- tree-scoped → `RegistryProvider` (context; replaced the racy global registry swap)
- per-bloc → `@blac()` decorator / statics (`keepAlive`, `key`, `equality`, `name`)

If a genuine global knob ever appears, re-adding this is a one-file additive
minor. Also removes the inert `oxlint-disable` for `no-empty-object-type`.

Docs: `blac-react/README.md:318` + 2 web-docs pages state the config is
"intentionally empty today".

### 4. `useBloc` tuple: 3 → 2 elements, drop the no-op `useId()` — 05 §3

- `useBloc.ts:631` returns `[state, trackedBloc, componentRef]`; drop the third.
- `useBloc.ts:126` calls `useId()` purely to reserve a slot ("kept for forwards
  compatibility"). Dropping it **shifts hook order** — subtle, so it needs its
  own commit, separate from the tuple change, to keep the bisect clean.
- Zero consumers destructure a third element anywhere in the repo.
- `UseBlocReturn<T, S>` type and `ComponentRef` need updating; check whether
  `ComponentRef` becomes dead.

### 5. `register()` re-keying

Current: `register()` guards on `registeredTypeNames`, a `Set<string>` keyed by
`getBlacName(constructor)`. R1 already fixed the minification half (it was
`constructor.name`), but the remaining defect is that it keys by **name, not
identity** — two distinct classes that share a `blacName` collide and the second
throws "already registered".

`this.types` is already a `Set<constructor>` holding the correct key. Re-key the
guard onto constructor identity and delete `registeredTypeNames`.

- Keep the error message quoting the name (that is good DX); only the key changes.
- Tests currently pin the name-based throw — they need rewriting to pin
  identity-based behaviour, plus a new test for two same-named distinct classes.
- Call sites: `registry/management.ts:18` is the only real one.

### 6. `DeepReadonly<S>` on state — 05 §2.2 (type half)

Apply to `ExtractState`, the `state` getter, and `select`'s first arg.

Runtime dev mutation traps already landed (Phase 4), so this is the type half
only. Note the correction recorded in the 05 §2.3 entry: `state` is **already**
getter-only at both sources, so assignment is already an error — this is about
blocking _nested_ mutation (`state.a.b = 1`) at compile time.

Expect fallout in first-party code that mutates nested state; that fallout is
the point, but measure it (`pnpm typecheck` across all 9) before committing.

### 7. Naming pass — 05 §8

**Do this last** — 04 §4 may delete `ensure`/`borrow` outright, so renaming
first risks churn. Confirmed live consumers (11 non-test call sites, 5 files):
`useBloc.ts:814` (`registry.ensure`), 6 × `borrowSafe` in
`messenger/services/WebSocketMock.ts`, 1 in `messenger/blocs/ChannelBloc.ts`,
2 × `borrow` in `apps/perf`, 1 × `ensure` in `06-db-persist/PersistenceStatus.tsx`.

Read 05 §8 for the proposed names before starting; they are not restated here.

## Order

1. `register()` re-keying — internal, no surface change, lands independently.
2. `configureBlacReact` removal — self-contained, deletes a whole file.
3. Subpath drops + `getPluginManager` barrel cut — one packaging change, **gated
   on a real `pnpm size` reduction**.
4. `useBloc` tuple (two commits: tuple, then `useId()`).
5. `DeepReadonly<S>` — largest typecheck blast radius, so after the structural
   churn has settled.
6. Naming pass — last, and only if 04 §4 is not going to delete the methods.

## Gates

Every step: `pnpm test` (baseline 93 files / 1302 tests), `pnpm typecheck`
(9 packages), `pnpm lint`, `pnpm size`. Regenerate `etc/*.api.md` via the
documented `cp temp/*.api.md etc/ && vp fmt` workflow — and note the
pre-existing `api:check` formatting quirk fires on unmodified HEAD, so a
"you have changed the API signature" warning is not by itself a real delta.

Core size budget was raised to 15 kB (actual 9.48) as headroom for this work;
re-tighten to just above actual once it lands.

## Deliberately not in this batch

- **04 §4** (one ownership model) and **02 §6** (hook refs/effects) — both
  rewrite `useBloc.ts` ownership; they follow this batch and 05 §8 depends on
  04 §4's outcome.
- **01 §7** (tearing) — needs a design pass, not a patch.
- **02 §2** (notification pipelines) — must not be collapsed as written.
