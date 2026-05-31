---
outline: deep
---

# Changelog

BlaC is a monorepo of independent packages, each versioned separately.
The core BlaC packages (`@blac/core`, `@blac/react`, and most tooling) are on
the `2.0.x` stream. The DirtyTalk packages (`@dirtytalk/*`) and
`@blac/plugin-persist` ship on an independent `0.0.x` stream — they are newer
additions and have not yet reached a `1.0` stability commitment.

Do not read a single version number as representing the whole monorepo.
See the [Versioning & Stability](./versioning.md) page for the full policy.

For the complete commit-level history, see the
[GitHub Releases](https://github.com/9am/blac/releases) page.

---

## @blac/core

Current: **2.0.15** · [npm](https://www.npmjs.com/package/@blac/core)

### 2.0.15

- Add declaration files (`dts`) to the package output.
- Dependency bump: `@dirtytalk/structural@0.0.3`.

### 2.0.14

- Replace internal core implementation with the DirtyTalk engine.
- Dependency bump: `@dirtytalk/structural@0.0.2`.

### 2.0.13

- Prepare compatibility support for v0 and v1 consumer code paths.

### 2.0.12

- Maintenance release (dependency hygiene, no API changes).

### 2.0.11

- Update DevTools UI integration; begin consumer registration protocol.

### 2.0.10

- Fix types for testing helpers.

### 2.0.9

- Switch build tooling to `vite-plus`.

### 2.0.8

- Update DevTools integration.

### 2.0.7

- Use `private` class fields and `Symbol`s for internal members to harden
  the public API surface.

### 2.0.6

- Reconfigure release pipeline for compatibility.

### 2.0.5

- Fix build output artefacts.

### 2.0.4

- Add the `depend` system (cross-bloc dependency injection via
  `this.depend(OtherBloc)`).

### 2.0.3

- Streamline the public API (initial surface reduction pass).

### 2.0.1

- 2.0.0 release polish.

### 2.0.0

BlaC v2 — complete rewrite with improved architecture and TypeScript support.

**Highlights:**

- `StateContainer` — new abstract base class for all state containers with
  lifecycle management and ref counting.
- `Cubit` — simple state container with direct state emission via `emit()`,
  `update()`, and `patch()`.
- `Vertex` — event-driven container following the BLoC pattern with `on()` and
  `add()`.
- Plugin System — extensible plugin architecture with lifecycle hooks.
- Full TypeScript type safety throughout the library.

---

## @blac/react

Current: **2.0.15** · [npm](https://www.npmjs.com/package/@blac/react)

Versioned in lock-step with `@blac/core`; patch entries that duplicate core's
notes are condensed here.

### 2.0.15

- Add declaration files (`dts`).
- Dependency bumps: `@blac/core@2.0.15`, `@dirtytalk/structural@0.0.3`.

### 2.0.14

- Replace internal core; follow `@blac/core@2.0.14`.

### 2.0.13

- Prepare compat support for v0/v1; follow `@blac/core@2.0.13`.

### 2.0.12 — 2.0.9

- Maintenance, DevTools, tooling, and vite-plus alignment (mirrors core).

### 2.0.8 — 2.0.3

- DevTools integration updates; private internals hardening; API streamlining.

### 2.0.0

BlaC React bindings v2 — complete rewrite with improved hooks and performance.

**Highlights:**

- `useBloc` — integrates state containers with React using
  `useSyncExternalStore` for Concurrent Mode compatibility.
- Per-consumer proxy tracking — only re-renders when accessed properties change.
- Manual `select` option for explicit dependency control.
- `instanceId` for per-component isolated instances.
- React 18 and 19 support.

---

## @blac/devtools-connect

Current: **2.0.18** · [npm](https://www.npmjs.com/package/@blac/devtools-connect)

Note: this package's version is ahead of `@blac/core` because it had
additional DevTools-specific patch releases.

### 2.0.18

- Add declaration files (`dts`).
- Dependency bump: `@blac/core@2.0.15`.

### 2.0.17

- Replace internal core; follow `@blac/core@2.0.14`.

### 2.0.16

- Prepare compat support for v0/v1.

### 2.0.15

- Maintenance.

### 2.0.14

- Update DevTools UI and begin consumer registration.

### 2.0.13

- Update list view in DevTools panel.

### 2.0.12

- Add computed getters and in-DevTools state editing.

### 2.0.11 — 2.0.3

- Testing-helper type fixes; vite-plus migration; private internals hardening;
  API streamlining (mirrors core cadence).

### 2.0.0

BlaC DevTools connection plugin for v2.

**Highlights:**

- Bridge between BlaC state containers and the browser DevTools extension.
- Real-time state inspection and time-travel debugging.
- Implemented as a first-class BlaC plugin.

---

## @blac/devtools-ui

Current: **2.0.18** · [npm](https://www.npmjs.com/package/@blac/devtools-ui)

### 2.0.18

- Add declaration files (`dts`).
- Dependency bumps: `@blac/core@2.0.15`, `@blac/react@2.0.15`.

### 2.0.17 — 2.0.3

- Mirrors `@blac/devtools-connect` cadence; includes list-view and
  computed-getters improvements in 2.0.13 / 2.0.12.

### 2.0.0

BlaC DevTools UI components for v2.

**Highlights:**

- JSON tree view for inspecting state container values.
- Visual state-change diffs for debugging.
- Time-travel navigation UI.

---

## @blac/logging-plugin

Current: **2.0.16** · [npm](https://www.npmjs.com/package/@blac/logging-plugin)

### 2.0.16

- Add declaration files (`dts`).
- Dependency bump: `@blac/core@2.0.15`.

### 2.0.15 — 2.0.3

- Mirrors `@blac/core` patch cadence: internal hardening, vite-plus, API
  streamlining.

### 2.0.0

BlaC logging plugin for v2.

**Highlights:**

- Configurable console logging for state changes and events.
- Debug mode with verbose output for development.
- Implemented as a BlaC plugin.

---

## @blac/plugin-persist

Current: **0.0.12** · [npm](https://www.npmjs.com/package/@blac/plugin-persist)

This package is on an independent `0.0.x` version stream — it is a newer
addition that has not yet reached API stability. The `0.0.x` designation
reflects that the public API may change in minor releases. See
[Versioning & Stability](./versioning.md) for what this means in practice.

### 0.0.12

- Add declaration files (`dts`).
- Dependency bump: `@blac/core@2.0.15`.

### 0.0.11

- Replace internal core; follow `@blac/core@2.0.14`.

### 0.0.10

- Prepare compat support for v0/v1.

### 0.0.9

- Maintenance.

### 0.0.8

- Update DevTools UI integration.

### 0.0.7

- Fix types for testing helpers.

### 0.0.6

- Fix types for testing helpers.

### 0.0.5

- Switch to vite-plus build tooling.

### 0.0.4

- Update DevTools.

### 0.0.3

- Use private class fields and Symbols for internals.

### 0.0.2

- Reconfigure release for compatibility.

---

## @dirtytalk/engine

Current: **0.0.3** · [npm](https://www.npmjs.com/package/@dirtytalk/engine)

DirtyTalk is the reactive engine that powers `@blac/core` internally.
All three `@dirtytalk/*` packages are on the `0.0.x` version stream —
independently versioned from the BlaC packages and not yet at `1.0` stability.

### 0.0.3

- Add declaration files (`dts`).

### 0.0.2

- Replace the previous core implementation.

---

## @dirtytalk/structural

Current: **0.0.3** · [npm](https://www.npmjs.com/package/@dirtytalk/structural)

### 0.0.3

- Add declaration files (`dts`).
- Dependency bump: `@dirtytalk/engine@0.0.3`.

### 0.0.2

- Replace internal core implementation.
- Dependency bump: `@dirtytalk/engine@0.0.2`.

---

## @dirtytalk/spatial

Current: **0.0.3** · [npm](https://www.npmjs.com/package/@dirtytalk/spatial)

### 0.0.3

- Add declaration files (`dts`).
- Dependency bump: `@dirtytalk/engine@0.0.3`.

### 0.0.2

- Replace internal core implementation.
- Dependency bump: `@dirtytalk/engine@0.0.2`.
