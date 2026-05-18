# BLaC Migration Plan — user-fe-reviews → v2

Plan owner: Brendan Mullins
Generated: 2026-05-18
Source repos analyzed:

- Consumer: `/Users/brendanmullins/Projects/user-fe-reviews`
- v2 library: `/Users/brendanmullins/Projects/blac` (this repo)

## TL;DR

`user-fe-reviews` currently runs BLaC in three coexisting forms:

- **v0** — npm `blac@^0.4.1` (used only in `apps/user-app`, `apps/pmp`)
- **v1** — workspace `blac-next@1.0.30` + `@blac/react@0.0.59` (everywhere)
- **target v2** — `@blac/core` + `@blac/react` from this repo

There are **24 files** that import both v0 and v1 today. They are the migration anchors. The rest is mostly mechanical.

The chosen approach is **shim-first**, not big-bang:

1. ~~Add three small extensions to v2 (E1, E2, E3)~~ ✅ **Landed on `main` (commit `ea04a518`, 2026-05-18)** — see `05-v2-extensions.md`.
2. Build a `packages/blac-compat` package that exposes v1 names backed by v2 internals — see `06-compat-shim-design.md`. ← **next**
3. Replace v0 with the compat shim (codemod, per app) — see `07-codemod-rules.md`.
4. Modernize hot paths over time. Drop the shim when done.

The user explicitly **rejected E4** (constructor-arg / props injection). The chosen pattern is:

```ts
const [, bloc] = useBloc(MyBloc);
useEffect(() => {
  bloc.initWithProps(props);
}, []);
```

Cubits that previously relied on the v1 `props` slot need an explicit `init*` method. See `03-risks-and-edge-cases.md#r3-props-injection`.

## File index

| File                         | Contents                                           |
| ---------------------------- | -------------------------------------------------- |
| `01-inventory.md`            | Verified counts, mixed-file list, symbol inventory |
| `02-api-comparison.md`       | v0 ↔ v1 ↔ v2 API surface map                       |
| `03-risks-and-edge-cases.md` | R1–R10 — the actual sharp edges                    |
| `04-migration-strategy.md`   | Phase 0 → Phase 4, day-by-day                      |
| `05-v2-extensions.md`        | E1–E7 with decisions (E1 reshaped, E4 rejected)    |
| `06-compat-shim-design.md`   | API contract and internals of `blac-compat`        |
| `07-codemod-rules.md`        | Mechanical rewrites the codemod must perform       |
| `08-testing-strategy.md`     | How we know each phase didn't break anything       |
| `09-open-questions.md`       | What still needs a human decision                  |

## Headline numbers

| Metric                                            | Value                 |
| ------------------------------------------------- | --------------------- |
| Files importing v0 `blac`                         | 71                    |
| Files importing v1 (`blac-next` or `@blac/react`) | ~525                  |
| Files importing **both**                          | **24** ← the hotspots |
| `Blac.getBloc(...)` call sites                    | 398                   |
| Classes with `static keepAlive = true`            | 26                    |
| Classes with `static isolated`                    | 11                    |
| Classes with `static addons` (app code)           | 0                     |
| `extends Bloc<E,S>` (event-driven) in app code    | 0                     |
| v0 `<BlocProvider>` JSX uses                      | 3                     |
| `packages/shared` v0 imports                      | 0 (v1-only)           |

## User decisions captured

1. **Shims first**, hand-cleanup later. (§4, §6)
2. **E2 (static-property shim) and E3 (auto-instance) accepted.** (§5)
3. **E4 (props-through-hook) rejected.** v2 design forbids constructor-args via the hook. Pattern: `useBloc(C)` + `useEffect(() => bloc.initWithProps(props), [])`. Cubits using props need an explicit init method.
4. **E1 (BlocProvider) shaped down:** a thin React-context Provider that just passes an `instanceId` to descendants. `useBloc` reads context if no `instanceId` is given.
5. **Per-app PRs**, PMP first, user-app second.
6. **Deadline:** open.
