---
'@dirtytalk/structural': minor
'@blac/core': minor
---

Make state mutation protected; `Cubit` is the public-mutation variant.

`emit`, `patch` and `update` are now `protected` on `StructuralContainer` and
`StateContainer`, and public on `Cubit`. Previously both classes exposed all
three publicly, so `Cubit` was an empty subclass that made no difference and
the choice between the two meant nothing — while the docs described the
encapsulation the code did not enforce.

`Cubit` is unchanged for callers: it re-declares the three as public, so every
bloc that extends `Cubit` and every external `bloc.emit(...)` keeps working.

**Migration.** A class that extends `StateContainer` (or `StructuralContainer`)
_and_ is mutated from outside must either extend `Cubit` instead, or expose its
own method that calls the protected mutator internally — the latter is the
pattern the docs already recommend:

```ts
class Counter extends StateContainer<{ n: number }> {
  increment() {
    this.patch({ n: this.state.n + 1 }); // internal calls are unaffected
  }
}
```

Mutating a bloc from inside its own methods is unaffected, whichever base
class it uses.
