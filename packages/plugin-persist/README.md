# @blac/plugin-persist

IndexedDB persistence plugin for BlaC.

This package provides a basic native IndexedDB-backed plugin that can:

- hydrate Cubit state after creation
- persist state changes automatically
- debounce writes
- transform state to and from persisted records

The first version hydrates asynchronously, so it does not yet block `acquire()`.
