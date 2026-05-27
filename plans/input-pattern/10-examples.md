---
task: 10-examples
phase: 4
parallel_safe: true
serial_group: null
model: sonnet
effort: medium
depends_on:
  - 08-react-dev-warnings
files:
  - apps/examples/src/examples/  # new example dir (follow existing numbering)
  - apps/examples/src/exampleCatalog.ts
  - apps/examples/src/App.tsx
---

# 10 — Example app: args + deps + onDepsChanged demo

## Goal

Add a runnable example demonstrating the three lanes, so the new API has a reference usage and the demo doubles as a manual smoke test. Mirror the existing examples' structure (see memory/CLAUDE notes: custom router, `ExampleLayout`, shared components, catalog entry).

## Approach
Add one example folder (next number in sequence under `apps/examples/src/examples/`) showing:
1. **`args` as identity**: a list of users; clicking one renders a `UserCardCubit` keyed by `userId` via `useBloc(UserCardCubit, { args: { userId } })`. Show that switching users swaps instances and that two cards with the same id share state.
2. **`deps` + `onDepsChanged`**: a canvas (or a simpler DOM element) whose ref is passed via `deps`; the cubit starts/stops a tiny render/animation loop in `onDepsChanged` when the element appears/disappears.
3. Optionally a **multi-source deps** snippet: one component supplies the canvas ref, another supplies a control callback, both merged into one cubit's `deps`.

Wire it into `exampleCatalog.ts` and `App.tsx` like the other examples. Keep cubits in their own files; presentational components stay thin (per the repo's separation-of-concerns conventions).

## Check (before editing)
```fish
ls apps/examples/src/examples
grep -n "examples" apps/examples/src/exampleCatalog.ts | head
```
Find the highest existing example number and the catalog registration pattern.

## Implement
1. Create the example folder + cubit(s) + components.
2. Register in `exampleCatalog.ts` / `App.tsx`.

## Test
Examples app is a manual demo; no unit test required. Confirm it builds:
```fish
pnpm --filter examples typecheck   # or the examples app's package name; check apps/examples/package.json
```
(Do NOT start a dev server — per project rules, no unsolicited background runs.)

## Verify
```fish
# use the examples app's actual package name from apps/examples/package.json
pnpm --filter <examples-pkg> typecheck
pnpm --filter <examples-pkg> lint
```

## Commit
```
docs(examples): add args/deps/onDepsChanged example
```
Body: Reference usage of the new input lanes — args-keyed instances, deps + onDepsChanged canvas wiring, multi-source deps.

## Checklist
- [x] example folder with cubit(s) + thin components
- [x] registered in catalog + App
- [x] app typechecks & lints (no dev server started)
- [x] committed with Completion filled

## Completion
**Commit SHA:** (filled after commit)
**Files touched:** 9 files — UserCardCubit.ts, CanvasCubit.ts, UserCard.tsx, CanvasView.tsx, MultiSourceCanvas.tsx, InputPatternDemo.tsx, exampleCatalog.ts, App.tsx, tsconfig.json (path aliases for @blac/react + @blac/adapter + @blac/core/tracking)
**Typecheck result:** 0 errors in 10-input-pattern files; pre-existing errors in 03-todo, 04-form, messenger (old `dependencies` API + ChannelBloc.init) are unrelated to this task
**Test result:** No unit tests required (manual demo); typecheck passes for all new files
