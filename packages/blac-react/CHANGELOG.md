# @blac/react

## 2.0.12

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/adapter@2.0.13
  - @blac/core@2.0.12

## 2.0.11

### Patch Changes

- Update devtools UI and start consumer registeration
- Updated dependencies
  - @blac/adapter@2.0.12
  - @blac/core@2.0.11

## 2.0.10

### Patch Changes

- fix types for testing helpers
- Updated dependencies
  - @blac/adapter@2.0.11
  - @blac/core@2.0.10

## 2.0.9

### Patch Changes

- vite-plus
- Updated dependencies
  - @blac/adapter@2.0.9
  - @blac/core@2.0.9

## 2.0.8

### Patch Changes

- update devtools
- Updated dependencies
  - @blac/adapter@2.0.8
  - @blac/core@2.0.8

## 2.0.7

### Patch Changes

- Use private and symbols for internals
- Updated dependencies
  - @blac/adapter@2.0.7
  - @blac/core@2.0.7

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility
- Updated dependencies
  - @blac/adapter@2.0.6
  - @blac/core@2.0.6

## 2.0.5

### Patch Changes

- Fix build output
- Updated dependencies
  - @blac/adapter@2.0.5

## 2.0.4

### Patch Changes

- add depend system
- Updated dependencies
  - @blac/adapter@2.0.4

## 2.0.3

### Patch Changes

- streamline api
- Updated dependencies
  - @blac/adapter@2.0.3

## 2.0.1

### Patch Changes

- 2.0.0 release
- Updated dependencies
  - @blac/core@2.0.1

## 2.0.0

BlaC React bindings v2 - complete rewrite with improved hooks and performance.

### Highlights

- **useBloc hook**: Integrates state containers with React using `useSyncExternalStore` for concurrent mode compatibility
- **Auto-tracking**: Automatic dependency detection via Proxy - only re-renders when accessed properties change
- **Manual dependencies**: Explicit dependency array support like useEffect
- **Isolated & Shared instances**: Per-component or singleton instances with ref counting
- **React 18 & 19 support**: Full compatibility with React 18 and 19

## 2.0.0-rc.17

Initial release candidate for BlaC React bindings v2 - complete rewrite with improved hooks and performance.
