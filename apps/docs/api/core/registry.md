# Registry

Registry helpers manage instance lifecycle and ref counting.

## Functions

- `acquire(BlocClass, instanceKey?, options?)`
- `ensure(BlocClass, instanceKey?)`
- `borrow(BlocClass, instanceKey?)`
- `borrowSafe(BlocClass, instanceKey?)` -> `{ error, instance }`
- `release(BlocClass, instanceKey?, forceDispose?)`
- `hasInstance(BlocClass, instanceKey?)`
- `getRefCount(BlocClass, instanceKey?)`
- `getAll(BlocClass)`
- `forEach(BlocClass, cb)`
- `clear(BlocClass)`
- `clearAll()`

## Notes

- `acquire` increments ref count and creates the instance if needed.
- `ensure` creates if missing but does not increment ref count.
- `borrow` requires an existing instance and does not increment ref count.
- `release` decrements ref count and disposes at 0 unless keepAlive.
