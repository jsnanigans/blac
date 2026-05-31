---
"@blac/core": major
"@blac/react": major
---

Remove the `instanceId` option and all explicit string-key arguments from the public API. Instance identity is now derived entirely from `args` — via a class's `static key(args)`, the structural hash of `args`, or the `'default'` sentinel.

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
