---
title: Versioning & Stability
description: BlaC's semver policy, the React and browser support matrix, the stability tier of every package, and where to find the deprecation record.
---

This page documents BlaC's versioning policy, the React and browser support matrix,
the stability tier of every package, and where to find the full deprecation record.

:::caution[Beta / pre-release]
BlaC v2 is in pre-release (beta). While in beta, **breaking API changes may ship in patch releases** without a major version bump — pin exact versions and check the changelog before upgrading. The strict semver policy below resumes once v2 is officially out of beta.
:::

## Semver policy

BlaC v2 is currently in **beta**. Until it leaves beta, the team reserves the
right to ship breaking public-API changes in **patch** releases (`2.0.x`) so the
API can be refined ahead of a stable `2.x` line. Pin exact versions and read the
changelog before every upgrade.

Once v2 is out of beta, all published BlaC packages follow
[Semantic Versioning 2.0](https://semver.org):

- **PATCH** — backwards-compatible bug fixes. Safe to upgrade any time.
- **MINOR** — new backwards-compatible features. Safe to upgrade.
- **MAJOR** — breaking public API changes. The changelog documents every
  breaking change before the release; always read it before upgrading a major.

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
| Core                 | `@blac/core`             | `2.0.18` | Beta         |
| React bindings       | `@blac/react`            | `2.0.18` | Beta         |
| DevTools connect     | `@blac/devtools-connect` | `2.0.21` | Beta         |
| DevTools UI          | `@blac/devtools-ui`      | `2.0.20` | Beta         |
| Logging plugin       | `@blac/logging-plugin`   | `2.0.19` | Beta         |
| Persistence plugin   | `@blac/plugin-persist`   | `0.0.14` | Experimental |
| DirtyTalk engine     | `@dirtytalk/engine`      | `0.0.4`  | Experimental |
| DirtyTalk structural | `@dirtytalk/structural`  | `0.0.6`  | Experimental |
| DirtyTalk spatial    | `@dirtytalk/spatial`     | `0.0.4`  | Experimental |

### Why DirtyTalk ships at `0.0.x` alongside core `2.0.x`

`@blac/core` and `@blac/react` are feature-complete and battle-tested in
practice, but remain in **beta** while their v2 public API is finalized — see the
beta notice above. The `@dirtytalk/*` packages are the reactive-tracking
substrate extracted from that work — they power the proxy and path-interning
inside core — but their own _public_ APIs are still being refined as additional
use-cases (spatial dirty tracking, standalone reactive trees) are explored.

Publishing them at `0.0.x` is an honest signal: the implementations are
production-proven inside core, but the DirtyTalk package boundaries, export
shapes, and hook points are subject to change without a semver major. If you
build directly on `@dirtytalk/*`, pin the exact version and watch the changelog.
If you use only `@blac/core` and `@blac/react`, the DirtyTalk internals are
opaque to you.

## Stability badge legend

Pages throughout these docs use these stability tiers:

| Badge            | Meaning                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Beta**         | Feature-complete and usable in production, but the v2 public API is still being finalized. Breaking changes may ship in patch releases until v2 leaves beta — pin exact versions. |
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

When a public API is slated for removal it is first marked `@deprecated` in the
type definitions, with the JSDoc tag pointing at the replacement. Deprecated APIs
keep working for the remainder of the current major and are removed only on the
next major bump, so a `@deprecated` warning is never a build break on its own.

The changelog is the canonical record: every deprecation, the version that
introduced it, and the version that removes it are listed there. Run your build
with deprecation warnings enabled to surface anything you are still relying on
before you upgrade across a major.
