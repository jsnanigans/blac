# Scope — resolving `Cubit` vs `StateContainer` (05 §1)

Written 2026-09-06, after R2 closed. Every count below was measured against
source, and the TypeScript constraints were verified with throwaway `tsc`
probes rather than assumed.

---

## The finding, restated correctly

`Cubit` is an empty subclass of `StateContainer`. Both expose `emit`, `patch`
and `update` publicly, so the two classes are behaviourally identical and the
choice between them means nothing. The review ([05 §1](./05-api-and-types.md#1-cubit-and-statecontainer-are-the-same-class))
offers two options and prefers the first: make `StateContainer` declare
mutation `protected` and have `Cubit` re-declare it `public`.

**The review's preferred option cannot be implemented as written.** Two
corrections:

1. **`update` is not on `StateContainer`.** It is defined only on
   `StructuralContainer` (`container.ts:255`), in the separate
   `@dirtytalk/structural` package. `StateContainer` overrides just `emit`
   (`:533`) and `patch` (`:546`). The review says all three are on
   `StateContainer`; they are not.

2. **TypeScript forbids narrowing visibility in a subclass.** Verified:

   ```
   error TS2415: Class 'Mid<S>' incorrectly extends base class 'Base<S>'.
     Property 'emit' is protected in type 'Mid<S>' but public in type 'Base<S>'.
   ```

   So `StateContainer` cannot declare `protected override emit` while
   `StructuralContainer.emit` is public. The change **must start in
   `@dirtytalk/structural`** or it cannot start at all. The review does not
   mention this, and it is the single fact that determines the shape of the
   work.

Widening in the other direction _is_ legal, which is what makes the fix
possible. Verified with a probe mirroring the real hierarchy
(`Base(protected) → SC → Cubit(public)`): `Cubit` re-declaring `emit` public
compiles, and an external `sc.emit(...)` on the middle class correctly fails
to compile. That probe is the design.

---

## Blast radius (measured, not estimated)

The headline number that makes this cheap:

| Base class, non-test class declarations | Count |
| --------------------------------------- | ----- |
| `extends Cubit`                         | 70    |
| `extends StateContainer`                | **0** |

**No first-party production code extends `StateContainer` directly.** Every
real bloc already extends `Cubit`, where mutation stays public. The 30
`extends StateContainer` declarations are all in test files.

External mutation call sites (`X.emit`/`X.patch`/`X.update` where `X` is not
`this`/`super`) — the calls that would stop compiling:

| Location                                                     | Sites | Breaks?                                                                                                   |
| ------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------- |
| `apps/perf/src/libraries/blac/pure-state.ts`                 | 32    | **No** — every class there extends `Cubit`                                                                |
| `packages/blac-core/src/testing.ts` (`:141,143,181,183`)     | 4     | **No** — both blocks are already guarded by `instanceof Cubit` (`:133`, `:173`), so TS narrows to `Cubit` |
| `packages/devtools-connect/.../DevToolsBrowserPlugin.ts:541` | 1     | **No** — already goes through `as any as Record<string, ...>` for time-travel                             |
| `packages/dirtytalk-structural/src/hotpath.bench.ts:71,124`  | 2     | **Yes** — operates on `StructuralContainer` directly                                                      |
| Test files                                                   | ~139  | Partly — only those using `StateContainer`/`StructuralContainer` directly                                 |

So of ~39 non-test external sites, **2 actually break**, both in a benchmark
file in the same package as the change.

`instanceof Cubit`: 3 occurrences, all inside `blac-core` — the docstring
claim at `Cubit.ts:8` plus the two `testing.ts` guards. The docstring says
`Cubit` is kept as a real class "because downstream code does
`instanceof Cubit` checks". **No downstream code does.** The guards are
first-party. The class should still stay a class — but for the reason below,
not the stated one.

---

## Recommendation

**Do the review's option 1 (make the README true), extended one layer down.**

Option 2 (delete `Cubit`, alias it) is the wrong call here: it removes the
only lever that could ever express the encapsulation story, and 70 first-party
classes plus all published examples name `Cubit`. It trades a real API
distinction for a deprecation cycle and gains nothing.

Option 1 is unusually cheap _because_ of the 0/70 split — the change is
almost entirely type-level ceremony over code that already follows the
intended convention. The `@dirtytalk/structural` docs already call these
"protected-by-convention mutators"
(`web-docs/.../structural/getting-started.mdx:54`), and the core README
already describes `Cubit` as "Extends `StateContainer` with public `emit`,
`update`, and `patch`" (`blac-core/README.md:23`). **The docs describe the
target state; only the code disagrees.** This change makes the code match the
documentation, not the reverse.

---

## Work

### Step 1 — `@dirtytalk/structural` (the enabling change)

`container.ts`: make `emit` (`:170`), `patch` (`:221`) and `update` (`:255`)
`protected`.

- `update` calls `this.emit(...)` internally (`:256`) — unaffected, internal
  calls are legal from any visibility.
- Fix the 2 breaking sites in `hotpath.bench.ts` (`:71`, `:124`) by giving the
  bench harness class a public mutation method, matching how every real bloc
  already works.
- `container.test.ts:69` calls `c.update(...)` externally — the one external
  `update` call in the repo. Its test subclass needs a public wrapper.
- Update `README.md:30,130,214` and
  `web-docs/.../structural/getting-started.mdx:54`, which document these as
  public / "protected-by-convention". The convention becomes enforced.

**Risk:** this is published surface on a public package. Mitigated by the
package's own README (`:5-9`), which states BlaC v2 is in beta and **breaking
changes may ship in patch releases** without a major. It is at `0.1.0`.

**Note on the "do not touch the engine" rule** ([04 §8](./04-architecture.md#8-what-not-to-change)):
that rule protects the `StructuralContainer.emit/patch` **diff strategy** —
the algorithm. This changes only visibility modifiers; no diff, channel,
interner or skeleton logic is touched. I read that as compatible, but it is a
judgment call and is flagged here deliberately rather than assumed.

### Step 2 — `blac-core`

- `StateContainer`: change `override emit` (`:533`) and `override patch`
  (`:546`) to `protected override`. Add `protected override update` — it does
  not exist today and is needed so `Cubit` has something to widen.
- `Cubit`: replace the empty body with three public re-declarations
  delegating via `super`. The class stops being a lie and the docstring gets
  rewritten (its `instanceof` justification is false; the real justification
  is that it is now the public-mutation variant).
- `testing.ts`: no change needed — the `instanceof Cubit` guards already
  narrow correctly. Worth a comment noting the guard is now load-bearing for
  types, not just runtime.

### Step 3 — surface and docs

- Regenerate `etc/core.api.md`. `emit`/`patch` currently appear at `:602`/`:613`
  under `StateContainer`; they should move to `Cubit`. Use the workflow the
  log records: `cp temp/core.api.md etc/ && vp fmt`.
- Changeset with a migration note: _"a bloc that extends `StateContainer` and
  is mutated from outside must extend `Cubit` instead."_
- Core README needs no change — it already says the right thing.

### Tests

Keep minimal, per project convention. Two type-level assertions are the whole
point and are worth pinning:

- external `cubit.emit(...)` compiles;
- external `stateContainer.emit(...)` does **not** (`@ts-expect-error`).

Plus confirm the ~30 test files declaring `extends StateContainer` still
compile; the ones mutating externally move to `Cubit`. That migration is
mechanical and is the bulk of the diff.

---

## Sizing

**Size:** small-to-medium — large diff, almost all of it mechanical test
churn. **Breaking:** yes, but only for a pattern no first-party code uses.
**Ships with:** the R2/R3/R4 major, per the scope doc's batching rule. It is
independent of R3, so it can be built at any point before that release.

## Open decision

The only judgment call worth your sign-off before building: **the
`@dirtytalk/structural` visibility change** (Step 1). It is published surface
on a package the review told us to leave alone, and Step 2 is impossible
without it. The beta disclaimer and the "diff strategy, not modifiers"
reading both support proceeding — but if you would rather not touch that
package at all, then 05 §1 has no viable fix and should be closed as
**won't-do** with the docs corrected instead. Those are the only two coherent
outcomes; there is no version of this that lives purely in `blac-core`.
