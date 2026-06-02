# @blac/devtools-connect

## 2.0.20

### Patch Changes

- Dedup ancestor-watch ids when decoding dirty paths for display. A normal mark
  and its ancestor-watch sibling can decode to the same path string, so the
  human-facing path list is now deduplicated.
- Updated dependencies
- Updated dependencies [de8c31d]
  - @blac/core@2.0.17

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

## 2.0.18

### Patch Changes

- Add dts
- Updated dependencies
  - @blac/core@2.0.15

## 2.0.17

### Patch Changes

- replace core
- Updated dependencies
  - @blac/core@2.0.14

## 2.0.16

### Patch Changes

- prepare compat support for v0 and v1
- Updated dependencies
  - @blac/core@2.0.13

## 2.0.15

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/core@2.0.12

## 2.0.14

### Patch Changes

- Update devtools UI and start consumer registeration
- Updated dependencies
  - @blac/core@2.0.11

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

## 2.0.10

### Patch Changes

- fix types for the testing helpers

## 2.0.9

### Patch Changes

- vite-plus
- Updated dependencies
  - @blac/core@2.0.9

## 2.0.8

### Patch Changes

- update devtools

## 2.0.7

### Patch Changes

- Use private and symbols for internals
- Updated dependencies
  - @blac/core@2.0.7

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility
- Updated dependencies
  - @blac/core@2.0.6

## 2.0.5

### Patch Changes

- Fix build output
- Updated dependencies
  - @blac/core@2.0.5

## 2.0.4

### Patch Changes

- add depend system
- Updated dependencies
  - @blac/core@2.0.4

## 2.0.3

### Patch Changes

- streamline api
- Updated dependencies
  - @blac/core@2.0.3

## 2.0.1

### Patch Changes

- 2.0.0 release
- Updated dependencies
  - @blac/core@2.0.1

## 2.0.0

BlaC DevTools connection plugin for v2.

### Highlights

- **DevTools Bridge**: Connect BlaC state containers to browser DevTools extension
- **State Inspection**: Real-time state viewing and time-travel debugging
- **Plugin Architecture**: Implemented as a BlaC plugin with lifecycle hooks

## 2.0.0-rc.17

Initial release candidate for BlaC DevTools connection plugin.
