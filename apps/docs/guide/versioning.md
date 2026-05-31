# Versioning & Stability

This page documents BlaC's versioning policy, the React and browser support matrix,
the stability tier of every package, and where to find the full deprecation record.

## Semver policy

All published BlaC packages follow [Semantic Versioning 2.0](https://semver.org):

- **PATCH** — backwards-compatible bug fixes. Safe to upgrade any time.
- **MINOR** — new backwards-compatible features. Safe to upgrade.
- **MAJOR** — breaking public API changes. The migration guide is updated before
  the release; always read it before upgrading a major.

"Public API" means anything exported without an `@internal` JSDoc tag. Items
tagged `@internal` may change in any release, including patches.

### Release channel

All packages are published to the npm public registry from the `main` branch.
There is no separate `next` or `canary` channel at this time. Pre-release
versions (e.g. `0.0.x`) indicate that the package's own API is still stabilizing;
they still follow the intent of semver within the `0.y.z` range (i.e. any minor
bump may be breaking for `0.x` packages).

## Current package versions

| Package              | npm name                 | Version  | Stability    |
| -------------------- | ------------------------ | -------- | ------------ |
| Core                 | `@blac/core`             | `2.0.15` | Stable       |
| React bindings       | `@blac/react`            | `2.0.15` | Stable       |
| DevTools connect     | `@blac/devtools-connect` | `2.0.18` | Stable       |
| DevTools UI          | `@blac/devtools-ui`      | `2.0.18` | Stable       |
| Logging plugin       | `@blac/logging-plugin`   | `2.0.16` | Stable       |
| Persistence plugin   | `@blac/plugin-persist`   | `0.0.12` | Experimental |
| DirtyTalk engine     | `@dirtytalk/engine`      | `0.0.3`  | Experimental |
| DirtyTalk structural | `@dirtytalk/structural`  | `0.0.3`  | Experimental |
| DirtyTalk spatial    | `@dirtytalk/spatial`     | `0.0.3`  | Experimental |

### Why DirtyTalk ships at `0.0.x` alongside core `2.0.x`

`@blac/core` and `@blac/react` are mature and have been in production use since
their `2.0.0` release. The `@dirtytalk/*` packages are the reactive-tracking
substrate extracted from that work — they power the proxy and path-interning
inside core — but their own _public_ APIs are still being refined as additional
use-cases (spatial dirty tracking, standalone reactive trees) are explored.

Publishing them at `0.0.x` is an honest signal: the implementations are
production-proven inside core, but the DirtyTalk package boundaries, export
shapes, and hook points are subject to change without a semver major. If you
build directly on `@dirtytalk/*`, pin the exact version and watch the changelog.
If you use only `@blac/core` and `@blac/react`, you get a stable surface and the
DirtyTalk internals are opaque to you.

## Stability badge legend

Pages throughout these docs use three stability tiers:

| Badge            | Meaning                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Stable**       | Public API follows semver strictly. No breaking changes without a major bump. Safe to use in production.                        |
| **Experimental** | The feature or package is usable but the API shape is still evolving. May see breaking changes in minor or even patch releases. |
| **Internal**     | Tagged `@internal` in source. Not part of the public API contract. May change or disappear in any release.                      |

Stability badges apply to packages as a whole (see the table above) and to
individual APIs within a package — for example, `APPLY_DEPS` and `REMOVE_DEPS_OWNER`
are `@internal` symbols exported from `@blac/core` for framework-integration use
only and are not subject to semver guarantees.

## React and browser support matrix

### React

`@blac/react` declares `react` as a peer dependency and is tested against the
following ranges:

| React version      | Supported       | Notes                                                          |
| ------------------ | --------------- | -------------------------------------------------------------- |
| React 18           | Yes (`^18.0.0`) | Full support; `useSyncExternalStore` is used for subscription. |
| React 19           | Yes (`^19.0.0`) | Full support including React Compiler compatibility.           |
| React 17 and below | No              | `useSyncExternalStore` is required; no polyfill is bundled.    |

The `@types/react` peer is optional — if you are on a JavaScript project you can
omit it. Testing utilities in `@blac/react/testing` additionally accept
`@testing-library/react ^14.0.0 || ^15.0.0 || ^16.0.0` as an optional peer.

### Browser and runtime targets

All packages compile to **ES2021** (the TypeScript `target` used across the
monorepo). The output format is dual ESM + CJS, so both modern bundlers and
Node.js `require()` are supported.

| Target       | Details                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browsers     | Any browser supporting ES2021 natively (Chrome 92+, Firefox 90+, Safari 15+, Edge 92+). Older browsers require a transpilation step in your own build.                 |
| Node.js      | The ESM entry works with Node 16+ (native ESM). The CJS entry works with Node 14+.                                                                                     |
| Bundlers     | Vite, webpack 5, Rollup, esbuild — any bundler that honours `exports` map.                                                                                             |
| React Native | Not officially tested. The `@blac/core` state-only layer has no DOM dependencies; `@blac/react` wraps React hooks and should work in RN environments, but is untested. |

### `@dirtytalk/structural` React peer

`@dirtytalk/structural` declares `react >= 18` as an optional peer dependency
for its `/react` subpath export. If you do not import the React subpath you do
not need React installed.

## Deprecations

All v1 → v2 deprecations and removed APIs are documented in the
[Migration from v1](/guide/migration-from-v1) guide. That page is the canonical
reference; this page does not duplicate the individual items.

Summary of the categories covered there:

- `useBloc` option `dependencies` renamed to `select`
- `tracked()` standalone API removed
- `@blac/adapter` package removed
- `Bloc` event-driven class removed; use `Cubit`
- `props` generic replaced by `args` / `deps` input lanes
- `id` option renamed to `instanceId`
- `Blac` static facade replaced by tree-shakeable registry functions
- Plugin hook renames (`onInstanceCreated` → `onCreated`, etc.)
- `onSystemEvent('stateChanged')` is now microtask-coalesced

See [Migration from v1](/guide/migration-from-v1) for grep hints, before/after
examples, and mechanical porting notes for each item.
