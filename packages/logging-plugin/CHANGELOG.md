# @blac/logging-plugin

## 2.0.20

### Patch Changes

- Sync
- Updated dependencies [14702ce]
- Updated dependencies [2059ba9]
- Updated dependencies [9012194]
- Updated dependencies
  - @blac/core@2.0.20

## 2.0.19

### Patch Changes

- Read bloc identity, lifecycle, and hydration state through the `$blac` meta
  namespace and drop references to the removed legacy `StateContainer` members.
  Internal adaptation to the `@blac/core` changes; no public API changes in these
  packages.
- Updated dependencies [9c473ec]
- Updated dependencies [a98329a]
  - @blac/core@2.0.18

## 2.0.18

### Patch Changes

- Dedup ancestor-watch ids when decoding dirty paths for display. A normal mark
  and its ancestor-watch sibling can decode to the same path string, so the
  human-facing path list is now deduplicated.
- Updated dependencies
- Updated dependencies [de8c31d]
  - @blac/core@2.0.17

## 2.0.17

### Patch Changes

- Rebuild against the latest `@blac/core` (args-only identity) and refresh pinned dependency versions. No own API changes.
- Updated dependencies [0a3fa8c]
  - @blac/core@2.0.16

## 2.0.16

### Patch Changes

- Add dts
- Updated dependencies
  - @blac/core@2.0.15

## 2.0.15

### Patch Changes

- replace core
- Updated dependencies
  - @blac/core@2.0.14

## 2.0.14

### Patch Changes

- prepare compat support for v0 and v1
- Updated dependencies
  - @blac/core@2.0.13

## 2.0.13

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/core@2.0.12

## 2.0.12

### Patch Changes

- Update devtools UI and start consumer registeration
- Updated dependencies
  - @blac/core@2.0.11

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
- Updated dependencies
  - @blac/core@2.0.8

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

BlaC logging plugin for v2.

### Highlights

- **Console Logging**: Configurable logging for state changes and events
- **Debug Mode**: Detailed logging for development and debugging
- **Plugin Architecture**: Implemented as a BlaC plugin
