# Two overlapping cross-cutting mechanisms (`Deps` lane vs `depend()`) with no guidance

**Impact: Medium** — v2 ships two genuinely different, well-designed
mechanisms for cross-cutting concerns, but both are called "deps" in the API
and docs, with no contrasting guidance on when to reach for which. In a
codebase with hundreds of Cubits, that naming overlap is a plausible
adoption blocker in its own right: a reader searching the docs for "how do I
give a Cubit something from outside" finds two answers under the same word
with no signal about which one applies to their case.

## The two mechanisms

**1. The declarative `Deps` generic** — non-serializable handles (refs,
callbacks, class instances) declared as a Cubit's third type parameter and
read via `this.deps.x`:

```ts
class FormCubit extends Cubit<FormState, FormArgs, { onSubmitted?: () => void }> {
  submit() {
    // ...
    this.deps.onSubmitted?.();
  }
}
```

Per the README, each `useBloc` call is supposed to contribute a slice of
`Deps` and the Cubit sees the merged union across every mounted consumer;
deps never affect instance keying, they're live (re-merged on every commit),
and there's an optional `onDepsChanged(next, prev)` lifecycle hook.

Note a doc/impl drift that compounds the confusion here (cross-reference
report #5's `instanceKey` case): the README says *"each `useBloc` call
contributes its own slice,"* but the shipped `@blac/react@2.0.18`
`UseBlocOptions` type exposes **no `deps` field** (`{ args?, select?,
onMount?, onUnmount? }` only), and `useBloc`'s implementation never calls the
core `[APPLY_DEPS]` path — that path is currently only reachable from the
`@blac/core/testing` helpers (`createCubitStub({ deps })`, via a synthetic
`"testing-deps"` owner). So the component-facing half of the `Deps` lane
appears documented but not actually wired into the React binding, which makes
"which mechanism do I use, and how do I feed it?" even harder to answer from
the docs alone.

**2. `this.depend(OtherCubit)`** — *one Cubit resolving another Cubit* from
the registry:

```ts
class OrderCubit extends Cubit<OrderState> {
  private userDep = this.depend(UserCubit);

  checkout() {
    const user = this.userDep.untracked();
  }
}
```

Returns a `DepHandle` (`{ track(), untracked() }`) for reading another
Cubit's state/instance, not for injecting a value supplied by a component.

## Why the overlap matters

These solve unrelated problems — "give me a callback/ref from the component
that mounted me" versus "give me another Cubit's state/instance" — but they
share the word "dep(s)" throughout the public API (`Deps` generic, `this.deps`,
`this.depend()`, `DepHandle`) and neither the README nor the type
definitions contrast them anywhere. Nothing about the names alone tells a
new consumer that `this.deps.onSubmitted` and
`this.depend(UserCubit).untracked()` are two unrelated systems rather than
two ways to reach the same thing. In our own codebase this ambiguity showed
up directly: engineers investigating how to remove a "pass a Cubit instance
as a plain constructor param" antipattern (the same investigation that
surfaced most of these reports) initially assumed `Deps`/`this.deps` was the
fix, since it's the one that comes up first when searching for "deps" in the
types — only to find it's the wrong mechanism for resolving another Cubit
and `depend()` is the one that actually applies.

## Suggested fix

1. **Add a README section explicitly contrasting the two**, ideally
   side-by-side: "inject a value from the component tree" (`Deps`/`this.deps`)
   vs. "resolve another Cubit from the registry" (`depend()`). A single
   sentence stating they are unrelated despite the shared word would have
   saved real investigation time in our case.
2. **Consider renaming the resolve-another-cubit API** so it doesn't share
   the "dep" word at all — e.g. `this.use(OtherCubit)` or
   `this.resolve(OtherCubit)` — freeing "deps" to mean only the
   component-injected lane. This is a bigger, breaking change, so the
   documentation fix in (1) is the higher-priority, lower-cost ask; the
   rename is worth considering for a future major version.
