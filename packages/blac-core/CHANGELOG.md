# @blac/core

## 2.0.16

### Patch Changes

- 0a3fa8c: Remove the `instanceId` option and all explicit string-key arguments from the public API. Instance identity is now derived entirely from `args` — via a class's `static key(args)`, the structural hash of `args`, or the `'default'` sentinel.

  **Breaking changes**

  - `useBloc` / `BlocProvider`: the `instanceId` prop/option is removed. Key instances with `args` and a `static key`; for a private per-mount instance, pass a synthetic value such as `args: { _id: useId() }`.
  - Registry functions take an options object instead of positional string keys:
    - `acquire(Bloc, { args?, refId? })`
    - `release(Bloc, { args?, refId?, forceDispose? })`
    - `ensure(Bloc, { args? })`
    - `borrow` / `borrowSafe` / `hasInstance` / `getRefCount` / `getRefIds(Bloc, { args? })`
  - `depend(Type, args?)` and `instance(Bloc, args?)` take `args` instead of a string key.
  - Testing helpers (`withBlocState`, `withBlocMethod`, `registerOverride`, `overrideEnsure`) take a trailing `args?` instead of an `instanceKey?`.

  The `instanceId` instance property, the `instanceId()` branded-type helper, and the internal resolved-key tier (`getRegistry()`) are unchanged. The `@9amhealth/blac-compat` v1 surface is unaffected — it maps `id` to the internal key tier.

- Updated dependencies
  - @dirtytalk/structural@0.0.4

## 2.0.15

### Patch Changes

- Add dts
- Updated dependencies
  - @dirtytalk/structural@0.0.3

## 2.0.14

### Patch Changes

- replace core
- Updated dependencies
  - @dirtytalk/structural@0.0.2

## 2.0.13

### Patch Changes

- prepare compat support for v0 and v1

## 2.0.12

### Patch Changes

- Maintainance

## 2.0.11

### Patch Changes

- Update devtools UI and start consumer registeration

## 2.0.10

### Patch Changes

- fix types for testing helpers

## 2.0.9

### Patch Changes

- vite-plus

## 2.0.8

### Patch Changes

- update devtools

## 2.0.7

### Patch Changes

- Use private and symbols for internals

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility

## 2.0.5

### Patch Changes

- Fix build output

## 2.0.4

### Patch Changes

- add depend system

## 2.0.3

### Patch Changes

- streamline api

## 2.0.1

### Patch Changes

- 2.0.0 release

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
