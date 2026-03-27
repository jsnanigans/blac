---
outline: [2, 3]
---

# @blac/core

Core state management primitives.

## API Sections

| Section                          | Description                       |
| -------------------------------- | --------------------------------- |
| [Registry](./core/registry.md)   | Instance management and lifecycle |
| [Plugins](./core/plugins.md)     | Plugin system                     |
| [Tracking](./core/adapter.md)    | Dependency tracking utilities     |
| [Utilities](./core/utilities.md) | Helpers and types                 |

## Classes

### StateContainer

Abstract base class for state containers.

### Cubit

Extends `StateContainer` with public mutation helpers: `emit`, `update`, `patch`.
