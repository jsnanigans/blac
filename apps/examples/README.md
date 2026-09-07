# BlaC Examples

Thirteen interactive examples, sequenced from a single Cubit to a full messenger
workspace. Each route isolates one idea; the numbering matches the folders in
`src/examples/`.

## Running

```bash
pnpm install
cd apps/examples
pnpm dev
```

Then open http://localhost:3002.

## The examples

| #   | Route            | Feature in focus                                                   |
| --- | ---------------- | ------------------------------------------------------------------ |
| 01  | `/counter`       | `Cubit`, `useBloc`, `emit` / `patch`, seeding through `init(args)` |
| 02  | `/async`         | `onActivate(signal)`, real `AbortSignal` cancellation, retry       |
| 03  | `/tracking-lab`  | The auto-tracking proxy: nested paths, array indices, getters      |
| 04  | `/form`          | Getter tracking and computed validation, `args`-keyed instances    |
| 05  | `/inputs`        | The three input lanes: `args`, `deps`, `onDepsChanged`             |
| 06  | `/cross-bloc`    | `depend().track()`, transitive getters, conditional dependencies   |
| 07  | `/db-persist`    | IndexedDB persistence plugin, hydration, state transforms          |
| 08  | `/registry`      | Instance creation, sharing, disposal, lifecycle events             |
| 09  | `/lifecycle`     | `onActivate` restore, `watch()` outside React, action-only pattern |
| 10  | `/dashboard`     | Plugins, `depend()`, `keepAlive`, widget coordination              |
| 11  | `/messenger`     | Capstone: named instances, `acquire` / `borrow`, persistence       |
| 12  | `/encapsulation` | `StateContainer` vs `Cubit` — where invariants live                |
| 13  | `/testing`       | `createCubitStub`, `withBlocState`, `RegistryProvider` isolation   |

## Project structure

```
src/
├── examples/
│   ├── 01-counter/ … 13-testing/   # one directory per route
├── router/                         # BlaC-based router (no routing library)
├── shared/                         # layout, UI primitives, RenderCounter
├── App.tsx                         # route table
├── exampleCatalog.ts               # single source of truth for nav + metadata
└── Home.tsx
```

Adding an example means creating the directory, adding a `RouteMeta` entry to
`exampleCatalog.ts`, and adding a `<Route>` in `App.tsx`.

## Reading the render badges

Most examples render a `RenderCounter` badge in each panel. The badge counts
renders of that component alone, which is the point: changing one slice of state
should leave the other panels untouched. If a badge ticks when you did not expect
it to, that component read a path it did not need.

## DevTools

DevTools are enabled in development. Press **Alt+D** for the in-app overlay
(search, state diffs, draggable window), or install the
[extension](../devtools-extension) for a Chrome DevTools panel. Both show the same
data and work simultaneously.

## Tests

`src/examples/13-testing/CheckoutCubit.test.ts` is a working example of testing a
bloc without React. `src/__tests__/testing-utils/` covers the helpers themselves.

```bash
pnpm test
```

> Vitest resolves from the workspace root; run `pnpm install` at the repo root
> first if the binary is missing.

## Learn more

- [Documentation](https://blac-docs.pages.dev)
- [`@blac/core`](../../packages/blac-core/README.md) · [`@blac/react`](../../packages/blac-react/README.md)
