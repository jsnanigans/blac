# Plan — the `@blac/react` rewrite (Phase 5 / R3)

Companion to [scope-react-rewrite.md](./scope-react-rewrite.md). The scope doc
says _what is true_; this says _what we do, in what order, and what proves each
step_. Re-verified against source 2026-09-07 — every claim the plan leans on is
listed under [Verification](#verification-of-the-scope-doc) with the evidence.

---

## Decisions taken

The scope doc left four open. Taking its recommendations on all four, because
each is backed by a probe rather than a preference:

| #   | Decision                                                        | Rationale                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 04 §4 lands as `owners: Map<OwnerToken, number>`, **not** `Set` | `acquire` increments a per-refId count (`:464`) and `release` only deletes at `count <= 1` (`:626`). A `Set` disposes on the first of two releases — use-after-free. `apps/perf/.../pure-state.ts:430` already passes a hand-written `refId`, and `refId` is public surface. |
| 2   | 04 §4 **splits out** of this release                            | It is the only part touching published `blac-core` surface (`getRefCount`/`getRefIds`/devtools). Step 2 does not depend on it. Judge the risky half on its own merits.                                                                                                       |
| 3   | Delete `configureBlacReact`; **keep** the tuple's 3rd element   | Config is empty with zero real callers. Tuple arity is the one change that would break downstream destructuring, and it costs one `useRef`.                                                                                                                                  |
| 4   | `onActivate` fires in a **layout** effect                       | Predictable, pre-paint, matches today's `init()` timing. Consequence is documented, not designed around — see below.                                                                                                                                                         |

**Decision 4 has a consequence that must ship as documentation, not a
footnote.** `useBlocDeps` applies its slice in a passive `useEffect`
(`useBlocDeps.ts:31`); `useBloc` acquires in `useLayoutEffect` (`:420`). React
runs every layout effect before any passive effect, so `onActivate` runs
**before the first deps slice is applied** — a bloc reading `this.deps.x` in
`onActivate` sees `undefined` on first activation. `onDepsChanged` is the
correct hook for deps-driven work. This matches today's `init()` behaviour, so
it is not a regression; it is a sharp edge that needs naming in the docs.

---

## Sequencing

One strict chain: **1 → 2**. Everything else is parallel. The tree stays green
after every step, so each is independently revertable.

```
Step 1  core: activation + sweep  ──┬── Step 2  react: uSES rewrite
                                    ├── Step 5  core: ownership consolidation
                                    └── Step 6  core: plugin hooks
Step 3  react: registry context ────  (parallel with 2)
Step 4  docs ───────────────────────  (parallel with everything)
```

### Step 1 — Activation lifecycle + zero-ref sweep (`blac-core`)

_04 §2, 01 §6. Strictly first: steps 2, 5 and 6 all build on it._

- Add `onActivate(signal: AbortSignal)` / `onDeactivate()` to `StateContainer`,
  fired on the 0↔1 ownership transition in `acquire` / `release` /
  `_releaseDependent`.
- `init()` is **untouched**. `onActivate` is purely additive.

Purely additive, no React change. Diff against the existing ownership fuzz
baseline (`StateContainerRegistry.ownership.fuzz.test.ts`, 200 seeds) rather
than writing new ownership tests.

#### The zero-ref sweep — kept, in opt-in form (2026-09-07)

The plan originally specified a **microtask sweep** for ref-less creates, then
tried to cut it, then reinstated it. The final design is opt-in and it works.
The reversals are recorded below because the _measurement_ failures are more
instructive than the design question.

`useBloc.ts:233` states the constraint in a comment that predates this plan:

> Render only ENSUREs the instance exists (no ref). Ownership is claimed in the
> layout effect below, so an abandoned/uncommitted render can never leak a ref

Instances are created during **render**; the ref is taken in a **layout
effect**. The concern was that a sweep scheduled at create time fires in that
gap. It does not, on any constructible path — React flushes layout effects
before the microtask queue drains.

**Shipped form:** the sweep is gated behind an opt-in `sweepIfUnowned` flag on
`acquire`, passed only by `useBloc`'s speculative render-time create. A bare
`ensure()` is deliberately **not** swept — it hands the instance to a caller
that legitimately holds it without a ref, and sweeping those would make
`ensure` unusable across an `await`.

**Verified against the finished tree:** `blac-react` 188/188, `blac-core`
679/679 including the 200-seed ownership fuzz, plus a purpose-built probe
(`await act(async () => render(...))` under a scoped provider, component left
mounted, extra microtask _and_ 30 ms macrotask drains) — instance stays alive.

##### How the verification went wrong, twice

Worth keeping, because both failures were about _method_, not about React.

| Probe                                                                              | Result     | What it actually proved                                                                                                                  |
| ---------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Synchronous `render()`; suspended subtree; StrictMode                              | passes     | Little. Layout effects flush before microtasks drain, so these paths cannot open the gap even if it existed.                             |
| Full suite run **while another agent was mid-edit** on `StateContainerRegistry.ts` | **fails**  | Nothing about the sweep. A half-written registry. Another agent independently hit `_scheduleSweep is not a function` in the same window. |
| Same scenario, isolated, against the finished tree                                 | passes 5/5 | The gap is not open.                                                                                                                     |

Two lessons, both self-inflicted:

1. **A green probe against a timing bug is weak evidence** — it shows the window
   did not open on that path, not that it cannot.
2. **A red run against a moving tree is worse than no evidence.** A single
   failure was taken as ground truth and a detailed correction built on top of
   it, sending an agent to tear out working code. Re-run in isolation before
   concluding anything from a suite executed during concurrent edits.

**A second, independent fix for the SSR case — no new core surface.** On the
server there is no commit at all, so a per-request registry is the more direct
remedy and composes with the sweep rather than replacing it. Two pieces that
already exist:

- `StateContainerRegistry.clearAll()` (`:786`) disposes every instance.
- Step 3's `RegistryProvider` scopes `useBloc` to a supplied registry.

```tsx
const registry = new StateContainerRegistry();
const html = renderToString(
  <RegistryProvider registry={registry}>
    <App />
  </RegistryProvider>,
);
registry.clearAll();
```

Per-request registry, disposed wholesale after render. No timing heuristic
about whether a render committed. This makes step 3 a **prerequisite** for the
SSR fix rather than an independent nicety, and turns the riskiest item in step 1
into documentation.

`PersistenceStatus.tsx:19` (`ensure` with no owner) is consequently a non-issue:
the `useBloc` above it holds a real ref on the same `(Type, args)`, so it never
sees zero refs. Verified, and moot now that nothing sweeps.

### Step 2 — Rewrite `useBloc` on `useSyncExternalStore` (`blac-react`)

_04 §1, 02 §6, 01 §7. After step 1._

One `Consumer` object replacing the ref soup: `subscribe` / `getSnapshot`
(version counter) / `getServerSnapshot` → 0.

Deletable, each confirmed by reading its only uses:

| Ref                          | Line     | Why it goes                                                                                                                |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `rebindNonce` + `bumpRebind` | 216, 435 | ~~uSES + commit-time acquire closes the stale-capture window~~ **Wrong — see below. The nonce goes, the rebind does not.** |
| `force`                      | 285      | manual re-render dispatch → `onStoreChange`                                                                                |
| `renderStateRef`             | 302      | ~~mount gap → closed by uSES (probe-confirmed)~~ **Wrong — survives as `consumer.renderState`.**                           |
| `prevBlocRef`                | 305      | consumer object is re-created on re-key                                                                                    |
| `ownedBlocRef`               | 219      | ~~acquire/release stop being split across effects~~ **Wrong — survives.**                                                  |

#### 01 §7 (tearing) is NOT closed by this step — verified (2026-09-07)

The plan, the scope doc and 04 §1 all assume adopting uSES fixes the tearing in
01 §7. **It does not.** Verified by running the same probe against both hooks:

```
probe: sibling A emits from its own render body, both siblings record what they read

post-uSES  seen: [0,1,1,1]     final a='1' b='1'
pre-uSES   seen: [0,1,1,1,1]   final a='1' b='1'
```

A reads `0` and B reads `1` **in the same commit** — a real intra-commit tear —
in _both_ versions, and both then converge. uSES saved one render pass and
changed nothing about the tear.

**Why:** `useBloc.ts:420` does `const rawState = container.state` — the hook
reads live container state during render, in the old hook and the new one
alike. The uSES snapshot is a **version counter**, not the state. uSES makes the
_version_ consistent across a commit; it does nothing to make the _state_
consistent, because the state never passes through `getSnapshot`.

Closing 01 §7 requires snapshotting state per render pass so every consumer in
one commit reads the same immutable value — a design change well outside this
step, and one that interacts with the tracking proxy (`trackRender` wraps
`rawState` directly).

**What step 2 did buy:** the mount-gap compensation is now genuinely unnecessary
(`renderStateRef` deleted, mutation-confirmed unreachable), both `useReducer`s
are gone, `rebindNonce` demoted to a plain ref, and ~6 refs folded onto one
consumer object. Real simplification and a correct subscribe/unsubscribe
contract — **not** the tearing fix it was sold as.

**Scorecard: 3 of 5 deletions held.** `force`, `prevBlocRef` and
`renderStateRef` went — the last only after a mutation proved its branch
unreachable. Two were load-bearing:

- **`rebindNonce`** — `buildTrackedProxy` binds its target at construction, so
  when the layout-effect `acquire` returns a different instance than the render
  captured, the returned proxy still wraps the disposed one. The memo must
  re-run. Demoted from `useReducer` state to a plain ref (the re-render already
  arrives via `consumer.bump()`), which is the real win: both `useReducer`s are
  gone.
- **`ownedBlocRef`** — the unmount cleanup closure captures the _pre-rebind_
  `bloc`, so `onUnmount` would fire with a disposed instance without it.
  Acquire/release are co-located; the closure's captured value is still stale.

**On the "~500 lines" target — the metric was wrong, not the outcome.** Final
file is 947 lines: **497 code, 390 comment, 60 blank**. The code is at the
target. The plan compared a post-rewrite figure against a raw line count that is
41% comments — the same comments this plan explicitly told the implementer to
preserve, because they encode hard-won constraints. Two rules for next time:
count code, not lines; and do not set a size target on a file whose comment mass
is deliberate.

`lastReconcileRef` (`:206`) **survives**, moving onto the consumer object.

#### Correction: the rebind is load-bearing (2026-09-07)

The table above claimed `rebindNonce`/`bumpRebind` were deletable because "uSES

- commit-time acquire closes the stale-capture window". **That is wrong**, and
  the first rewrite attempt proved it — deleting the rebind broke 4 tests:

```
× same-commit handoff of a shared key rebinds B to the LIVE instance
    AssertionError: expected '0' to be '1'
× StrictMode remount rebinds a lone consumer to the LIVE instance
× StrictMode: bloc instance returned after double-invocation is alive
× should work correctly in React Strict Mode
```

Component B rendered `'0'` after the live instance incremented — still bound to
a disposed instance, never woken.

uSES guarantees subscribe/unsubscribe **pairing**. It guarantees nothing about
the render body having captured the wrong _instance_ for a key that another
consumer handed over in the same commit. The old code handled this explicitly:
`acquire` returns the authoritative live instance, and `live !== bloc` bumped a
nonce to re-run the memo against it.

**What actually changes:** the `useReducer` nonce goes; the rebind _mechanism_
stays, expressed through `consumer.bump()`. The subtlety is that `subscribe` is
memoised on `[BlocClass, instanceKey, consumerId, consumer]` and a rebind
changes none of them — so swapping `consumer.container` does not re-run
`subscribe`, and the channel subscription must be re-established explicitly.

Generalisation worth keeping: **"uSES makes X unnecessary" needs a test, not an
argument.** Three of the five deletions in that table were safe; this one was
asserted on the same reasoning and was not.

1. **The version counter must be incremented inside the channel callback,
   _before_ `onStoreChange`.** uSES requires `getSnapshot()` to already reflect
   the change when it is notified. Backwards yields a silent missed render.
2. **`subscribe` must be memoised on `[BlocClass, instanceKey]`, not on
   `bloc`.** Memoising on `bloc` reintroduces the
   `useBloc(cond ? AdminBloc : UserBloc)` leak that the comment at `:402–410`
   exists to prevent — `resolveInstanceKey` collapses distinct classes to the
   same default key.

**Port the dep-reconcile unchanged.** `:588–662` plus `makeDepWrapper`
(`:789–878`) is ~180 lines, is the subtlest code in the file, and is orthogonal
to uSES. It is not what this finding is about. Note it now takes the resolved
`registry` as a parameter (step 3) — keep that threading.

**Ownership must stay in a _layout_ effect.** Step 1's sweep is scheduled as a
microtask at render-time create and only spares entries that have gained an
owner by the time it runs. Layout effects run before that microtask drains;
a passive effect does not. Moving the acquire to a passive effect puts a
macrotask between create and acquire and **the sweep starts disposing live
mounts**. This is a silent failure — no type error, no obvious test — so it is
the single constraint step 2 must not violate.

Keep `useId()` at `:117` — it is a documented no-op slot, but deleting it
shifts SSR id sequencing for every consuming component.

### Step 3 — Registry scoping through context (`blac-react`)

_04 §5. Parallel with step 2._ `RegistryContext`; `useContext(...) ?? getRegistry()`
at the 6 read sites (`:233`, `:421`, `:606`, `:623`, `:678`, `:798`). Small and
independent of step 2's internals — but both touch `useBloc.ts`, so expect a
merge, or land 3 immediately after 2.

**Promoted from nicety to prerequisite:** with the sweep cut, this is now the
mechanism that fixes the SSR leak (see step 1). It must ship in this release.

Watch the dep lane specifically — `makeDepWrapper` resolves its own registry,
so scoping that misses it leaves deps resolving from the global while the
primary bloc uses the scoped one.

### Step 4 — Docs (parallel with everything)

Two distinct groups:

- **9 files teaching `init()` side effects** → recommend `onActivate`. Not a
  breaking-change note; the old pattern keeps working.
- **3 sites where the uSES claim is currently false** — `CHANGELOG.md:240` and
  `README.md:20` have claimed uSES since 2.x and it has never been true. After
  step 2 they become true. The reverse pair (`use-bloc.mdx:251`,
  `async.mdx:267,382`) correctly say uSES is _not_ used and must flip.

Plus: document the decision-4 ordering, and delete `configureBlacReact` from
`blac-react/README.md:318` and the two web-docs pages.

### Step 5 — Ownership consolidation (`blac-core`)

_04 §4, weakened per decision 1. After step 1, independent of 2–4. Ships
separately._

`refs` + `dependents` → one `owners: Map<OwnerToken, number>`. One concept, one
dispose predicate, one reverse `WeakMap`, multiplicity preserved. Public
surface (`getRefIds`, `maxRefsPerInstance` circuit breaker, devtools ×5) keeps
working unchanged. Diff against the fuzz baseline.

### Step 6 — Plugin `onActivate` / `onDeactivate` hooks

_The only open part of 04 §6. After step 1._ The other two thirds are already
landed: `created`-after-`init()` shipped with the Phase 0 hydration fix, and the
`stateChanged`-over-`onStateChange` half was ruled **must-not-do** in the R2
audit.

---

## Explicitly not doing

- **The bare-`Set` form of 04 §4** — unsafe, decision 1.
- **`stateChanged` over `onStateChange`** (04 §6) — the two lanes are
  deliberately different; the R2 audit settled this.
- **Changing the `[state, bloc, ref]` tuple arity** — decision 3.
- **A concurrent-rendering / `startTransition` test** — uSES _is_ the mechanism
  that makes concurrent rendering safe. That tests React, not this code.
- **Engine internals** — interned path ids, `DirtyChannel`, skeleton diff. 04 §8.

---

## Tests

Per project convention, minimal and small. The 27 existing `blac-react` test
files are the real regression net for step 2 — particularly the cross-bloc
suites that exercise the dep-reconcile paths the rewrite must preserve.

| Test                                                                                                     | Why it is needed                                                                                                                                                                      | Step   |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| SSR: `renderToString` under a scoped registry, `clearAll()`, assert no instance survives                 | Today's test (`useBloc.test.tsx:173`) asserts only that the HTML contains `0` — it cannot catch the leak                                                                              | 1 or 3 |
| `onActivate` fires once per ownership span; `AbortSignal` aborts on deactivate **and on dispose**        | New public surface. The dispose case matters: if the signal does not abort there, async work started in `onActivate` outlives the instance — the bug class the hook exists to prevent | 1      |
| A `depend()` handle resolves from the **scoped** registry under a provider                               | The dep lane is where registry scoping is most likely to regress; a primary-bloc test would not catch it                                                                              | 3      |
| ~~Tearing: two siblings, emit between their renders~~ **Not written — see "01 §7 is not closed" below.** | ~~The 01 §7 finding~~                                                                                                                                                                 | 2      |
| StrictMode subscribe/unsubscribe pairing                                                                 | The single assumption the deletion of `rebindNonce`/`force` rests on                                                                                                                  | 2      |

Expect churn in tests asserting exact render counts — uSES coalesces.

**Each new test must be mutation-checked** (revert the fix, confirm the test
fails). This session has already caught two cases where a test passed for the
wrong reason; a green run alone does not distinguish "found nothing" from "not
looking".

---

## Release shape

**Steps 1–4 + 6 ship as one major.** Step 5 follows separately.

Public signature is unchanged — `UseBlocOptions` and the tuple both survive, so
the 68 non-test `useBloc(` call sites recompile untouched. Three genuine
behavioural deltas:

| Change                                                       | Who notices                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Instances from a discarded/SSR render are now swept          | Code relying on a zero-ref instance surviving — i.e. relying on today's leak |
| `init()` side effects may run in a render that never commits | Blocs doing async work in `init()`. First-party: zero                        |
| Fewer re-renders                                             | Tests asserting exact render counts                                          |

The removal of `configureBlacReact` is the only API deletion (decision 3).

Line estimate: the scope doc calls `~942 → ~350` optimistic and lands on
**~500**, since the ~180-line dep-reconcile survives intact. **Both estimates
measured the wrong thing.** Final file is 947 raw lines but **497 code lines**
(390 comment, 60 blank) — the code estimate was right; the raw-line target was
never achievable without deleting comments this plan required kept. uSES bought
subscription correctness and the removal of hand-rolled compensation, **not**
tearing (see 01 §7 above). Any future estimate for this file should count code
and start from "same length, better invariants".

---

## Verification of the scope doc

Re-checked against source before writing this plan. Everything material holds:

- **21 `useRef` calls**, 2 `useReducer` (`:216`, `:285`), 2 `useEffect`,
  2 `useLayoutEffect`, 1 real `useId()` (`:117`), 942 lines. The doc's
  correction to `scope-remaining.md` ("22 refs, 4 effects") is right.
- **No `useSyncExternalStore` in any package source** — the only hit repo-wide
  is the false claim in `blac-react/CHANGELOG.md`.
- **No `async init(` in any `.ts`/`.tsx`.** Exactly 3 non-test `init()`
  overrides exist (`ChannelBloc.ts:50`, `UserCubit.ts:27`,
  `UserCardCubit.ts:26`), plus the no-op base at `StateContainer.ts:426`. All
  synchronous. The headline finding — that the feared migration does not exist —
  is confirmed.
- **`refs: Map<string, number>`** (`:31`), increment at `:464`, decrement with
  `count <= 1` delete at `:626`. Decision 1 is load-bearing.
- **`maxRefsPerInstance`** is real public config, default `1000`, backed by the
  refcount.
- **Effect ordering** for decision 4 confirmed in both files.
- **27** `blac-react` test files.

One correction to the scope doc: it cites the hand-written refId at
`pure-state.ts:431,435`; the actual lines are **`:430` and `:434`**. The
substance — that a caller-supplied `refId` is already in use — is right.

### Corrections to _this_ plan, found while building

1. **The sweep survived, in opt-in form** — see step 1. The plan asserted a
   timing property (that the render→commit gap swallows a microtask) without
   verifying it; that assertion turned out to be false, but only after three
   reversals driven by bad measurements rather than by analysis. The method
   failures are written up under step 1 and are the durable lesson here.

2. **`packages/blac-react/README.md:20` has no `useSyncExternalStore` claim.**
   Inherited from the scope doc and repeated here without checking; `git show
HEAD:packages/blac-react/README.md | rg useSyncExternalStore` returns
   nothing. The false-uSES problem is real but confined to
   `blac-react/CHANGELOG.md:240`. Correcting a claim that does not exist risks
   _introducing_ one — which is exactly what a first pass at step 4 did.

3. Several line references in the docs group had drifted (`README.md:127`,
   `use-bloc.mdx:85`/`:251`, `README.md:318`). Locate by content, not line
   number.

---

## Sign-off needed before step 1

The four decisions above are taken from the scope doc's recommendations, but
they have **not** been approved. Step 1's sweep changes disposal behaviour and
step 5 changes published surface; neither should start without confirmation.
