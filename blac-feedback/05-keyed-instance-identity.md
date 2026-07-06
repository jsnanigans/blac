# Keyed-instance identity is undocumented, inconsistent, and the documented fix was never shipped

**Impact: Medium** — for any Cubit that has more than one instance at
runtime (scoped by an id, a session, a resource — anything beyond a global
singleton), whether two call sites resolve "the same" instance depends on an
implementation detail almost nobody in our codebase knows exists, and the
one escape hatch that does exist (`static key(args)`) is used by exactly one
class out of hundreds.

## How identity resolution actually works today

Traced directly from the shipped `@blac/core@2.0.18` source
(`resolveInstanceKey`, not from the docs), the precedence is:

```
resolveInstanceKey(Type, args):
  if Type.key is defined:  return Type.key(args)          // (1) opt-in escape hatch
  if args !== undefined:   return structuralHash(args)     // (2) shape-sensitive default
  else:                    return DEFAULT_INSTANCE_KEY     // "default" sentinel
```

There is no `instanceKey` parameter anywhere in this signature, or in
`depend<T>(Type: T, defaultArgs?: ExtractArgs<T>): DepHandle<T>` that calls
into it — not a branch that's unreachable from `depend()`, but a parameter
that was never implemented in the shipped resolver at all. Every keyed Cubit
falls into branch (1) if its class happens to define `static key`, or branch
(2) otherwise — where identity is a hash of whatever shape of `args` object
the *caller* happened to construct.

## The two failure modes this produces

**Mode 1 — works, but only by accident.** A router-like Cubit in our codebase
defines a `static key` that happens to normalize two differently-named
properties to the same value:

```ts
class RouterCubit extends Cubit<RouterState> {
  static key = (args?: { id?: string; legacyId?: string }): string =>
    args?.id ?? args?.legacyId ?? "main";
}
```

Two call sites construct `args` completely differently — one passes `{id:
"main"}`, another (going through an older compat layer) passes `{legacyId:
"main"}` — and both resolve to the same instance, purely because this
particular class's author thought to write a fallback chain covering both
property names. It works, but there's no mechanism enforcing that every
keyed class does this, and no compiler/lint signal if a class *doesn't*.

**Mode 2 — silently diverges, no warning at all.** A Cubit with no
`static key` and multiple call sites that construct semantically-equivalent
args slightly differently:

```ts
// Call site A — via a component that resolves by an explicit id
useBlocNext(SessionCubit, { id: sessionId, props: { sessionId } });

// Call site B — a different Cubit that wants "the same" SessionCubit,
// reaching for it via depend()
class OtherCubit extends Cubit<OtherState> {
  private sessionDep = this.depend(SessionCubit, { sessionId: someSessionId });
}
```

Because `SessionCubit` has no `static key`, branch (2) fires for both —
`structuralHash({id, props: {sessionId}})` vs `structuralHash({sessionId})`.
These are **different structural shapes**, so they hash to **different keys**
and resolve to **two separate `SessionCubit` instances**, one of which is
never written to `id`/`props`-based session data at all. There is no
console warning here (unlike the "same key, different args" dev-check that
*does* fire in Mode 1's scenario) — because the two calls never land on the
same resolved key in the first place, so the registry has no basis to
compare them. This is a real correctness bug waiting to happen, and it's
exactly the shape of bug we found mid-refactor in our own codebase (a
per-session Cubit resolved one way by its owning component and a different
way by a Cubit that wanted to depend on it — we had to abandon that
particular `depend()` migration specifically because of this gap).

## The documented fix that was never shipped

The package's own README documents a *different*, safer signature:

```
depend(BlocClass, instanceKey?)
```

— i.e., an explicit instance-key parameter, distinct from `defaultArgs`,
which (per the precedence order above) would take priority over both the
`static key` escape hatch and structural hashing. This would let a caller
say "resolve *this specific* instance, identified by *this* key, regardless
of what args shape gets passed" — which is exactly what's needed to make
Mode 2 impossible. But the shipped `.d.ts` and `.js` only implement
`depend(Type, defaultArgs?)` — no `instanceKey` argument exists anywhere in
the shipped `depend`/`resolveInstanceKey` in `v2.0.18`, not as a dead branch,
but as a parameter that was never implemented. Either this was planned and
never shipped, or the README documents a proposal that was abandoned —
either way, it's the right fix and it's already spec'd.

## Suggested fix

Ship the README's documented signature for real:

```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  options?: { instanceKey?: string; args?: ExtractArgs<T> }
): DepHandle<T>
```

```ts
class OtherCubit extends Cubit<OtherState> {
  // explicit, shape-independent identity — matches whatever `id` a
  // component-level useBlocNext({id}) call used, with no reliance on a
  // fragile static-key bridge or on args happening to structurally match.
  private sessionDep = this.depend(SessionCubit, { instanceKey: someSessionId });
}
```

This also simplifies report #6 (composite disposal) and removes the need for
most `static key` implementations entirely — the explicit `instanceKey` path
becomes the one obvious way to pin identity, rather than an opt-in class-level
convention almost nobody adopts.

## Evidence

- `resolveInstanceKey` precedence order traced directly from shipped source
  (branches 1-2 above); no `instanceKey` parameter exists anywhere in it or
  in `depend()`'s signature.
- `useBloc`/`useBlocNext` derive their resolution key the same way — via
  `resolveInstanceKey(BlocClass, effectiveArgs)` — and memoize on
  `JSON.stringify(args)`, confirming identity is purely args-shape-derived
  end to end, component-level hooks included, not just for `depend()`.
- Exactly one class in a several-hundred-Cubit codebase defines `static key`.
- README documents `depend(BlocClass, instanceKey?)`; shipped `.d.ts`/`.js`
  only accept `defaultArgs` — confirmed mismatch, not a doc-generation issue.
