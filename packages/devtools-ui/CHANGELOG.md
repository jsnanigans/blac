# @blac/devtools-ui

## 2.0.24

### Patch Changes

- d85792f: DevTools v3, rebuilt around a typed, versioned protocol.
  
  - `@blac/devtools-connect`: `createDevToolsBrowserPlugin` is replaced by `createDevToolsAgent`. The agent records plain references and serializes and sends nothing until a client attaches. `window.__BLAC_DEVTOOLS__`, time-travel, getter enumeration, the event ring and the heartbeat/full-sync are removed. New entry points `@blac/devtools-connect/client` (`DevToolsClient`, `connectInPage`) and `@blac/devtools-connect/protocol`. Serialization now caps depth, breadth, string length and total size.
  - `@blac/devtools-ui`: a single `<Panel client={client} />` plus the `<BlacDevtoolsUi />` overlay (Alt+D, Shadow DOM, connects only while open). The BlaC-based stores, `DevToolsPanel` and `DraggableOverlay` are removed, along with `@uiw/react-json-view` and `json-diff-kit`. `@blac/core` and `@blac/react` are no longer peer dependencies.
- Updated dependencies [d85792f]
  - @blac/devtools-connect@2.0.24

## 2.0.23

### Patch Changes

- b15a2bc: `interner.lookup(rootId)` returns `''` instead of the internal `\0root`
  sentinel; devtools shows it as `<root>`.
- Updated dependencies [55c9bd3]
- Updated dependencies [d29adc5]
- Updated dependencies [34f744c]
- Updated dependencies [5a0f7ad]
- Updated dependencies [5a361e5]
  - @blac/react@2.1.2

## 2.0.22

### Patch Changes

- Rebuild against the new `@blac/core` and `@blac/react` releases.
- Updated dependencies [cec7c48]
- Updated dependencies [e31ee51]
- Updated dependencies [5a23fc0]
- Updated dependencies [bef2f5b]
- Updated dependencies [5a23fc0]
- Updated dependencies [d0ede99]
- Updated dependencies [5a23fc0]
- Updated dependencies [5a23fc0]
- Updated dependencies [cec7c48]
- Updated dependencies [0a76d8b]
- Updated dependencies [370c225]
- Updated dependencies [bef2f5b]
- Updated dependencies [5a23fc0]
- Updated dependencies [f0987e4]
- Updated dependencies [d479173]
- Updated dependencies [c46ad21]
- Updated dependencies [5a23fc0]
- Updated dependencies [d479173]
- Updated dependencies [d479173]
- Updated dependencies [596d44e]
- Updated dependencies [91cae43]
- Updated dependencies [86c37df]
- Updated dependencies [5a23fc0]
- Updated dependencies [24f0293]
- Updated dependencies [7a43433]
- Updated dependencies [697c0e7]
  - @blac/react@2.1.1
  - @blac/core@2.1.1

## 2.0.21

### Patch Changes

- Sync
- Updated dependencies [14702ce]
- Updated dependencies [2059ba9]
- Updated dependencies [9012194]
- Updated dependencies
  - @blac/core@2.0.20
  - @blac/react@2.0.20

## 2.0.20

### Patch Changes

- Read bloc identity, lifecycle, and hydration state through the `$blac` meta
  namespace and drop references to the removed legacy `StateContainer` members.
  Internal adaptation to the `@blac/core` changes; no public API changes in these
  packages.
- Updated dependencies
- Updated dependencies
- Updated dependencies [9c473ec]
- Updated dependencies [a98329a]
  - @blac/react@2.0.18
  - @blac/core@2.0.18

## 2.0.19

### Patch Changes

- Add per-consumer watched paths to the instance detail panel and overhaul the connect protocol.

  **Features**
  - The detail panel now shows the structural paths each consumer is watching, surfacing exactly which slices of state drive a given component's re-renders.

  **Breaking changes**
  - The wire protocol no longer carries per-consumer (`C:n`) tracking or perf metrics. The `consumers-changed` message is renamed to `refs-changed`, and the perf-metrics producer is removed. UI and connect must be upgraded together.

  **Fixes**
  - `instance-updated` messages are now coalesced per animation frame instead of emitted per change, eliminating broadcast storms under rapid state updates.
  - The connect bridge broadcasts atomically and unconditionally, with added heartbeat tolerance so the panel no longer drops the connection during quiet periods.
  - The detail panel re-renders when a different instance is selected.
  - Acquire/release of devtools-owned instances now uses the args form, matching the args-only identity model in `@blac/core`.

- Updated dependencies [0a3fa8c]
  - @blac/core@2.0.16
  - @blac/react@2.0.16

## 2.0.18

### Patch Changes

- Add dts
- Updated dependencies
  - @blac/core@2.0.15
  - @blac/react@2.0.15

## 2.0.17

### Patch Changes

- replace core
- Updated dependencies
  - @blac/core@2.0.14
  - @blac/react@2.0.14

## 2.0.16

### Patch Changes

- prepare compat support for v0 and v1
- Updated dependencies
  - @blac/core@2.0.13
  - @blac/react@2.0.13

## 2.0.15

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/core@2.0.12
  - @blac/react@2.0.12

## 2.0.14

### Patch Changes

- Update devtools UI and start consumer registeration
- Updated dependencies
  - @blac/core@2.0.11
  - @blac/react@2.0.11

## 2.0.13

### Patch Changes

- Update list view in devtools

## 2.0.12

### Patch Changes

- Add computed getters and edit state to devtools

## 2.0.11

### Patch Changes

- fix types for testing helpers
- Updated dependencies
  - @blac/core@2.0.10
  - @blac/react@2.0.10

## 2.0.10

### Patch Changes

- fix types for the testing helpers

## 2.0.9

### Patch Changes

- vite-plus
- Updated dependencies
  - @blac/react@2.0.9
  - @blac/core@2.0.9

## 2.0.8

### Patch Changes

- update devtools

## 2.0.7

### Patch Changes

- Use private and symbols for internals
- Updated dependencies
  - @blac/core@2.0.7
  - @blac/react@2.0.7

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility
- Updated dependencies
  - @blac/react@2.0.6
  - @blac/core@2.0.6

## 2.0.5

### Patch Changes

- Fix build output
- Updated dependencies
  - @blac/react@2.0.5
  - @blac/core@2.0.5

## 2.0.4

### Patch Changes

- add depend system
- Updated dependencies
  - @blac/react@2.0.4
  - @blac/core@2.0.4

## 2.0.3

### Patch Changes

- streamline api
- Updated dependencies
  - @blac/core@2.0.3
  - @blac/react@2.0.3

## 2.0.1

### Patch Changes

- 2.0.0 release
- Updated dependencies
  - @blac/react@2.0.1
  - @blac/core@2.0.1

## 2.0.0

BlaC DevTools UI components for v2.

### Highlights

- **State Viewer**: JSON tree view for inspecting state container values
- **Diff View**: Visual state change diffs for debugging
- **Time-travel UI**: Navigate through state history

## 2.0.0-rc.17

Initial release candidate for BlaC DevTools UI components.
