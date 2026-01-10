---
outline: deep
---

# Changelog

Current version: **v2.0.0**

This changelog is automatically generated from the individual package changelogs using [Changesets](https://github.com/changesets/changesets).

## @blac/core

## 2.0.0

BlaC v2 - a complete rewrite with improved architecture and TypeScript support.

### Highlights

- **StateContainer**: New abstract base class for all state containers with lifecycle management and ref counting
- **Cubit**: Simple state container with direct state emission via `emit()`, `update()`, and `patch()` methods
- **Vertex**: Event-driven state container following the BLoC pattern with `on()` and `add()` methods
- **Plugin System**: Extensible plugin architecture with lifecycle hooks
- **Improved TypeScript**: Full type safety throughout the library

## 2.0.0-rc.17

Initial release candidate for BlaC v2 - a complete rewrite with improved architecture and TypeScript support.

## @blac/react

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

## @blac/devtools-connect

## 2.0.0

BlaC DevTools connection plugin for v2.

### Highlights

- **DevTools Bridge**: Connect BlaC state containers to browser DevTools extension
- **State Inspection**: Real-time state viewing and time-travel debugging
- **Plugin Architecture**: Implemented as a BlaC plugin with lifecycle hooks

## 2.0.0-rc.17

Initial release candidate for BlaC DevTools connection plugin.

## @blac/devtools-ui

## 2.0.0

BlaC DevTools UI components for v2.

### Highlights

- **State Viewer**: JSON tree view for inspecting state container values
- **Diff View**: Visual state change diffs for debugging
- **Time-travel UI**: Navigate through state history

## 2.0.0-rc.17

Initial release candidate for BlaC DevTools UI components.

