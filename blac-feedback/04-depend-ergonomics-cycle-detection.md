# `depend()` ergonomics + missing cycle detection

**Impact: Medium-high** — two separate but related issues with `depend()`
itself (as opposed to what it's missing, covered in reports #2/#5): it's more
verbose than the common case needs, and if two Cubits ever *do* depend on
each other and both resolve eagerly, the failure mode is a silent stack
overflow rather than a clear error.

## Issue A: boilerplate for the common "just get it now" case

`depend()` returns a handle, not the instance:

```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  defaultArgs?: ExtractArgs<T>
): DepHandle<T>  // { track(), untracked() }
```

Every call site that just wants "give me the current instance" needs two
steps:

```ts
class OrderCubit extends Cubit<OrderState> {
  private userDep = this.depend(UserCubit);

  checkout() {
    const user = this.userDep.untracked(); // step 2, every time
    const userId = user.state.id;
  }
}
```

versus what most consumers reach for instead — a plain param or a bare
`Blac.getBloc(UserCubit)` call inline, which is one step and reads more
naturally, even though it's the pattern this API exists to replace:

```ts
checkout() {
  const user = Blac.getBloc(UserCubit); // no handle, no .untracked()
}
```

We found **zero** usages of `depend()` anywhere across two production apps
(hundreds of Cubits) despite it being the documented recommended pattern for
cross-Cubit dependencies. The two-step handle indirection is a plausible
contributor: it's simply more typing than the alternative for the case that
comes up most often.

### Suggested fix

Add a sugar method for the eager/one-shot case, equivalent to
`this.depend(Type, args).untracked()` in one call:

```ts
class OrderCubit extends Cubit<OrderState> {
  checkout() {
    const user = this.dependValue(UserCubit); // one step
  }
}
```

Keep `depend()` itself for the cases that genuinely need the handle (repeated
reads, `.track()` for render, or the `.onChange()` reactive subscription
proposed in report #2) — this is additive, not a replacement.

## Issue B: no cycle detection — silent stack overflow, not a clear error

There's already a circuit breaker in the registry's get-or-create path —
`assertInstanceLimit(Type, instances.size)`, gated by a configurable
`maxInstancesPerType` (default 1000) that throws a descriptive error on
runaway instance creation — but it doesn't catch this. `depend()` itself is
safe to declare cyclically, because it's lazy (it only writes a Map entry) —
but resolution is eager construction:

```ts
class ACubit extends Cubit<AState> {
  private bDep = this.depend(BCubit);
  init = () => {
    const b = this.bDep.untracked(); // triggers new BCubit() if not yet created
  };
}

class BCubit extends Cubit<BState> {
  private aDep = this.depend(ACubit);
  init = () => {
    const a = this.aDep.untracked(); // triggers new ACubit() if not yet created
  };
}
```

Traced directly from the shipped registry source, the get-or-create sequence
for a single class runs in this exact order:

```
assertInstanceLimit(Type, instances.size)     // reads size BEFORE insertion
const instance = new Type()
instance[INIT_CONFIG](config)                 // runs the Cubit's init()
instances.set(resolvedKey, { instance, refs }) // inserted only now
```

Because the instance is written into the registry map only *after*
`init()` fully returns, a mutual dependency resolved eagerly inside `init()`
never finds the in-progress instance: `ACubit.init()` resolves `BCubit` →
`new BCubit()` → `BCubit.init()` resolves `ACubit` → `ACubit` isn't in the
map yet → a **second** `new ACubit()` → recurses the same way — and so on,
until the call stack overflows. And because `instances.size` is read *before*
each insertion, both classes' maps stay at size 0 for the entire recursive
chain, so `assertInstanceLimit` never trips — the one guard that already
exists is structurally blind to exactly this failure mode. There is no
thrown `CircularDependencyError`, no console warning — just a generic
`RangeError: Maximum call stack size exceeded` with a stack trace that
doesn't obviously point at the cycle.

### Suggested fix

This doesn't need new machinery — `assertInstanceLimit` is already the
right place, it just needs to know about in-progress construction, not only
the finished-instance count it currently checks. Track an
in-progress-construction set per resolution chain (a `Set<Type>` or similar,
scoped to one get-or-create call tree) and throw a descriptive error the
moment a `Type` already mid-construction is requested again:

```
CircularDependencyError: Circular dependency detected while constructing
ACubit: ACubit -> BCubit -> ACubit
```

This turns an opaque stack-overflow crash into an actionable error message
naming the exact cycle, which is the difference between a five-minute fix and
a debugging session.

## Why bundle these two

Both are about the boundary between "declare a dependency" (cheap, lazy,
already safe) and "resolve a dependency" (eager, currently silent on both
ergonomics and failure mode). Fixing the ergonomics (Issue A) will likely
*increase* how often eager resolution happens at construction/`init()` time
(since `dependValue()` invites exactly that), which makes Issue B's fix more
urgent, not less — shipping A without B would make the cycle failure mode
more commonly hit, not less.
