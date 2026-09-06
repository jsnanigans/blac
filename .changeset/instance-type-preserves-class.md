---
'@blac/core': minor
'@blac/react': major
---

Preserve the class type in `InstanceReadonlyState` / `InstanceState` /
`StateContainerInstance`, and drop `DepsTarget`.

The three aliases built their narrowed `state` with `Omit<InstanceType<T>,
'state'> & { state: ... }`. `Omit` maps the class into a plain object type,
which discards `private` members, so the result was no longer assignable to
`StateContainer`. That is what forced `@blac/react` to introduce the
structural `DepsTarget` interface for `useBlocDeps`.

They now use a plain intersection, `InstanceType<T> & { state: ... }`, which
keeps the nominal class intact. `state` is getter-only on `StateContainer`,
so assignment through the narrowed type is already a compile error and no
`readonly` modifier is needed.

BREAKING (`@blac/react`): `DepsTarget` is removed from the public surface and
`useBlocDeps` now takes `StateContainer<any, any, D>`. Callers passing a real
bloc — including the value `useBloc` returns — are unaffected; only code that
named `DepsTarget` explicitly, or passed a hand-rolled structural object, must
change.

A `WithState<I, S>` helper is exported alongside them; it is the shared
implementation of the three aliases.

`LifecycleListener`'s `stateChanged` payloads are typed
`Readonly<Record<string, unknown>>` instead of `any`, matching the
`depsChanged` branch.
