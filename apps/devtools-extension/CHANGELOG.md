# @blac/devtools-extension

## 3.0.0

### Major Changes

- Rebuilt on the typed DevTools protocol (`@blac/devtools-connect` agent and
  client). Needs an agent from `@blac/devtools-connect` 2.0.24 or later; older
  agents are not detected.
- Stateless service worker that splices a panel port to the inspected tab's
  top-frame content script; nothing is cached in the worker.
- The panel follows reloads and SPA navigation, keeps its selection and log
  across a reload of the same session, and reconnects after the service
  worker restarts.
- Shares the `Panel` UI with the in-app overlay (`@blac/devtools-ui`).

## 2.0.3

### Patch Changes

- prepare compat support for v0 and v1
- Updated dependencies
  - @blac/core@2.0.13
  - @blac/react@2.0.13
  - @blac/devtools-connect@2.0.16
  - @blac/devtools-ui@2.0.16

## 2.0.2

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/core@2.0.12
  - @blac/react@2.0.12
  - @blac/devtools-connect@2.0.15
  - @blac/devtools-ui@2.0.15

## 2.0.1

### Patch Changes

- Updated dependencies
  - @blac/devtools-ui@2.0.1
  - @blac/react@2.0.1
  - @blac/core@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies
  - @blac/devtools-ui@2.0.0
  - @blac/react@2.0.0
  - @blac/core@2.0.0
