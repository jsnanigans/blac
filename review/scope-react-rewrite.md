# Scope — the `@blac/react` rewrite (Phase 5 / R3)

Written 2026-09-07. Every count below was measured against source; every
hard constraint was settled with a throwaway probe (run under the package's
own `vp test` runner, then deleted) rather than reasoned about.

Items: [04 §1](./04-architecture.md#1-usesyncexternalstore-with-a-per-consumer-version-snapshot),
[04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render),
[04 §4](./04-architecture.md#4-one-ownership-model),
[04 §5](./04-architecture.md#5-registry-scoping-through-context),
[04 §6](./04-architecture.md#6-emit-ordering-and-plugin-hooks),
[02 §6](./02-performance.md#6-per-consumer-hook-cost),
[01 §6](./01-correctness.md#6-instance-creation-and-init-side-effects-run-inside-render),
[01 §7](./01-correctness.md#7-tearing-under-concurrent-rendering).

---

## Headline: the migration everyone is braced for does not exist

`scope-remaining.md` R3 says the activation lifecycle is "a **semantic**
change… docs and examples currently put `void this.load()` in `init()`, and
that moves to `onActivate`. **Existing `init()` behaviour must keep working or
this is a rewrite of every consumer app.**"

That sizing is wrong, and it is wrong in the direction that makes this cheap.
I read every `init()` body in the repo:

| `init()` bodies with a side effect (fetch / timer / listener / `void this.x()`) | Count |
| ------------------------------------------------------------------------------- | ----- |
| in `packages/**` (shipped library code)                                         | **0** |
| in `apps/examples/**`                                                           | **1** |
| in tests                                                                        | **0** |

The single one is `apps/examples/src/examples/02-async/FeedCubit.ts:171` —
and it is not even in `init()`; it is inside `loadFeed`, reached from a user
action. Grep for `async init(` across all non-review files returns **4 hits,
all in `.md` docs**, zero in `.ts`.

Every real `init()` in this repo does exactly what 04 §2 wants it to do
already: seed state synchronously and return. Verified bodies:
`UserCardCubit.ts:26` (`this.emit`), `ChannelBloc.ts:50` (`this.emit`),
`UserCubit.ts:27` (`this.patch`), plus the no-op base at
`StateContainer.ts:426`.

**So `onActivate` is purely additive for first-party code.** The behavioural
break the sequencing doc treats as the defining risk of R3 is a
_documentation_ problem, not a code problem:

| Surface teaching `void this.load()` / `await` inside `init()` | Count |
| ------------------------------------------------------------- | ----- |
| `.md` / `.mdx` files                                          | **9** |

`packages/blac-core/README.md:55`, `packages/blac-react/README.md:127`,
`react/use-bloc.mdx:85`, `core/cubit.md:302`, `guide/typescript.md:492`,
`guide/inputs.mdx:40`, `guide/best-practices.md:209,218`,
`guide/patterns.md:61`, `guide/recipes/pagination.md:49,159`.

This reframes the whole unit. R3 is **not** "a rewrite of every consumer
app". It is a hook rewrite plus a 9-file docs pass. Downstream apps that
followed the docs keep working (see [Backward compatibility](#4-backward-compatibility)),
and the ones that did not have nothing to change.

---

## 1. The findings, restated — and checked against today's source

| #     | Finding                                                   | Premise still true?                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 04 §1 | uSES + per-consumer version snapshot; fixes 01 §7 tearing | **Yes.** No `useSyncExternalStore` anywhere in `packages/**` source. `useBloc.ts:285` is still `useReducer`-driven.                                                                                                                                                                                |
| 04 §2 | Activation lifecycle + zero-ref sweep; fixes 01 §6        | **Yes for the leak, no for the migration.** SSR leak reproduced (below). The `init()`-side-effect migration is ~0 code / 9 docs.                                                                                                                                                                   |
| 02 §6 | Consolidate the hook state                                | **Yes, but miscounted.** See below.                                                                                                                                                                                                                                                                |
| 04 §4 | One `owners` set collapsing `refs` + `dependents`         | **Partly false as written.** A bare `Set` is _not_ safe. See §3.                                                                                                                                                                                                                                   |
| 04 §5 | Registry scoping via context                              | **Yes.** `getRegistry()` is read at **6** sites in `useBloc.ts` (`:233`, `:421`, `:606`, `:623`, `:678`, `:798`); module-global in `registry/config.ts`.                                                                                                                                           |
| 04 §6 | Emit ordering + plugin hooks                              | **Mostly already done.** `created`-after-`init()` landed with the Phase 0 hydration fix (`StateContainer.ts:448–455`); the `stateChanged`-over-`onStateChange` half was ruled **must-not-do** in the R2 audit (progress-log `:544`). Only the new `onActivate`/`onDeactivate` plugin hooks remain. |

### Corrections to the review

1. **Hook-state count is off by one.** `scope-remaining.md` R3 says "22
   `useRef`, 2 `useReducer`, 4 effects". Measured: **21 `useRef`**, 2
   `useReducer`, 2 `useEffect`, 2 `useLayoutEffect`, 1 `useMemo`, 3 `useId`
   textual occurrences (**1** actual call, `:117`), 1 `useContext` via
   `useProvidedArgs`. 942 lines. (02 §6's own "17 refs" is staler still.)

2. **`useId()` at `:117` is a documented no-op** — "Reserve a useId slot".
   02 §6 lists it as cost; it is, but deleting it changes SSR id sequencing
   for every component using the hook. Cheap to keep, not free to drop.

3. **04 §6 is ~2/3 already landed.** Listing it as open R3 work oversizes
   the unit.

4. **The CHANGELOG already claims uSES.** `blac-react/CHANGELOG.md:240`:
   "Integrates state containers with React using `useSyncExternalStore` for
   concurrent mode compatibility." That shipped claim is false, and has been
   since 2.x. `README.md:20` makes the same claim (01 §7 flags it). The docs
   that are _correct_ (`react/use-bloc.mdx:251`, `guide/async.mdx:267,382`)
   explicitly say the hook does **not** use uSES — so this rewrite has to
   flip three doc sites back the other way.

5. **`configureBlacReact` is dead surface.** `BlacReactConfig` is an empty
   interface (`config.ts:14`); the only non-doc caller is
   `blac-react/README.md:321` calling `configureBlacReact({})`. Zero real
   consumers. It should be deleted in this major, not carried.

---

## 2. Blast radius (measured)

Commands are `rg`, run from the repo root.

### Call sites

| What                                                     | Count                          | Command                                                                                            |
| -------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `.ts`/`.tsx` non-test files **calling** `useBloc(`       | **68**                         | `rg -l '\buseBloc\(' --glob '*.ts' --glob '*.tsx' --glob '!**/*.test.*' --glob '!**/__tests__/**'` |
| …of those, in `apps/examples`                            | **41**                         | same, scoped to `apps/examples`                                                                    |
| All files mentioning `useBloc` (incl. docs/tests/review) | 183                            | `rg -l '\buseBloc\b'`                                                                              |
| Test files in `blac-react/src/__tests__`                 | **27**                         | `fd -e tsx -e ts . packages/blac-react/src/__tests__`                                              |
| Files referencing `useBlocDeps`                          | 14 (2 are real app call sites) | `rg -l '\buseBlocDeps\b'`                                                                          |

**The log's "42 example files" checks out** — 41 by my count, the difference
being one file that mentions `useBloc` without calling it. Repo-wide there are
68 non-test call sites. That number barely matters, though: the signature does
not change, so they are recompiles, not edits.

### Ownership API (what 04 §4 changes or deletes)

| Symbol        | Non-test consumers                         | Detail                                                                                                                  |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `ensure`      | **3**                                      | `useBloc.ts:814` (rewritten by this work), `06-db-persist/PersistenceStatus.tsx:19`, `blac-core/src/testing.ts:172,197` |
| `borrowSafe`  | **7**                                      | `messenger/services/WebSocketMock.ts` ×6, `messenger/blocs/ChannelBloc.ts:31`                                           |
| `borrow`      | **2**                                      | `apps/perf/.../JSFrameworkBenchmark.tsx:174,212`                                                                        |
| `getRefIds`   | **5 in devtools**                          | `DevToolsBrowserPlugin.ts:495,554,555,656,859`, via `PluginContext` (`PluginManager.ts:507`)                            |
| `getRefCount` | exported from `index.ts:53`, `debug.ts:34` | public surface                                                                                                          |

### Third tuple element / config

| What                                       | Result                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Code destructuring the 3rd element (`ref`) | **0** non-test sites. Only `README.md:96` and `react/preact.mdx:70` show it; `glossary.md:57` calls it "rarely needed in app code". |
| `configureBlacReact` real callers          | **0**                                                                                                                               |

Both are removable in this major — but see the open decisions.

---

## 3. Hard constraints and traps (each probed)

### 3a. uSES does close the mount gap — `renderStateRef` and `force` can go

Probe: a component whose interest Set is populated _during_ JSX (exactly the
auto-tracking model), subscribing via `useSyncExternalStore` with a
version-counter snapshot, with an emit fired from inside the first render
body — the classic render→subscribe gap the R2 code compensates for.

```
unread-wakes: 0   read-wakes: 1        <- path filtering intact through uSES
text after mount-gap: 1  renders: 2    <- gap closed with NO renderStateRef check
```

So `renderStateRef` (`:302`, checked `:380`) and both `useReducer`s
(`:216` `rebindNonce`, `:285` `force`) are genuinely deletable. Also
deletable, per 02 §6 and confirmed by reading their only uses:

| Ref                          | Line     | Exists only because…                                                                         |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `rebindNonce` + `bumpRebind` | 216, 435 | render/commit can capture a disposed instance; uSES + commit-time acquire removes the window |
| `force`                      | 285      | manual re-render dispatch → `onStoreChange`                                                  |
| `renderStateRef`             | 302      | mount gap → closed by uSES                                                                   |
| `prevBlocRef`                | 305      | select-mode reseed on re-key → consumer object is re-created on re-key                       |
| `ownedBlocRef`               | 219      | cleanup needs the _owned_ instance because acquire/release are split across effects          |
| `lastReconcileRef`           | 206      | short-circuit for the dep reconcile; survives, but moves onto the consumer object            |

**StrictMode pairing verified:** subscribe/unsubscribe counts matched exactly
under `<StrictMode>` double-invoke.

### 3b. The channel is asynchronous — this is a real constraint

My first probe reported zero wakes until I flushed a macrotask. Isolated
without React:

```
paths size 1 [0]
woke after bumpA: 1          <- tracked leaf fires
woke after bumpB (delta): 0  <- untracked sibling does not
```

Correct — but delivery is deferred, not synchronous. uSES's contract requires
`getSnapshot()` to _already_ reflect the change by the time `onStoreChange`
fires. The version counter satisfies this only if it is incremented **inside
the channel callback, before** calling `onStoreChange` — which is what 04 §1
specifies. Worth stating explicitly because getting it backwards yields a
silent missed render, and no existing test would catch it.

### 3c. SSR — the leak is real, and `getServerSnapshot` is not enough

Probed against the **current** hook under `renderToString`:

```
instance present in registry after SSR: true   refCount: 0
```

01 §6 confirmed: SSR creates a zero-ref instance in the module-global registry
that nothing ever disposes. And a bare `getServerSnapshot: () => 0` does _not_
fix it — probed separately, on the server `subscribe` is never called and
`getServerSnapshot` is (sub: 0, serverSnap: 1). The instance is created by the
**render body**, not the subscription. So:

> `getServerSnapshot` fixes tearing/hydration. Only the **zero-ref sweep**
> (04 §2) fixes the leak. They are independent, and shipping uSES alone leaves
> the S2 SSR leak in place.

The existing SSR test (`useBloc.test.tsx:173`) only asserts the HTML contains
`0` — it would not catch the leak.

### 3d. `owners` as a bare `Set` is NOT safe — the log's premise is wrong

The progress log (`:556`) and 04 §4 both say the `Map<string, number>`
refcount "exists to support paired acquire/release with the same id. With uSES
doing pairing, a `Set` suffices."

**uSES pairing is necessary but not sufficient.** Probed:

```
refs after 2 acquires (size): 1
count for r1: 2
alive after first release: true | disposed after second: true
```

Acquiring the _same_ refId twice stores `count: 2` and needs two releases. A
`Set` would dispose on the first release — a use-after-free for the second
holder. uSES guarantees each _hook instance_ pairs its own subscribe/
unsubscribe; it says nothing about two different owners choosing the same
refId string, or one owner acquiring twice.

Whether that is reachable today:

- `watch()` mints `_watch_${watchRefSeq++}` — unique per call (`watch.ts:277`).
- `useBloc` primary: `useBloc@${consumerId}` — unique per hook instance.
- `useBloc` deps: `useBloc@${consumerId}:dep` is **shared across every dep of
  one consumer** (`:44`, `:797`). Safe _only_ because the session Map is keyed
  by container instance and re-entry unions paths instead of re-acquiring
  (`:851–854`). Two different deps are different `(Type, key)` entries with
  their own `refs` maps, so they never collide.
- Omitted `refId` auto-generates `_auto_N` (`:463`) — unique.

So no first-party caller currently collides. But `acquire` takes a
caller-supplied `refId` on **public surface**, and `apps/perf/.../pure-state.ts:431,435`
already passes a hand-written `bench-${i}`. Collapsing to a `Set` silently
converts a double-acquire from "refcounted" to "disposed early".

There is also a second blocker the log names correctly: the refcount backs the
`maxRefsPerInstance` circuit breaker (`:381`, `assertRefLimit` at `:465`),
which a plain `Set` cannot express, and `getRefIds` is read at 5 devtools
sites.

**Recommendation: keep the count.** 04 §4's own migration note already offers
this escape hatch ("Keep the count if you want to support explicit nested
acquires"). Collapse `refs` + `dependents` into one `owners:
Map<OwnerToken, number>` — one _concept_, one dispose predicate, one reverse
`WeakMap` — without throwing away the multiplicity. That gets the entire
correctness benefit of 04 §4 (the two dispose paths stop disagreeing) at zero
regression risk, and keeps `getRefCount`/`getRefIds`/the circuit breaker
working unchanged.

### 3e. `args`-keyed vs per-mount instances and subscription identity

`useBloc` re-keys on `[BlocClass, instanceKey, consumerId]` (`:447`), _not_ on
`bloc` — with a long comment (`:402–410`) explaining that `BlocClass` must stay
in the array because `resolveInstanceKey` collapses different classes to the
same `DEFAULT_STRUCTURAL_KEY` when neither has args nor a `static key`.

**That hazard survives the rewrite and must be carried over.** uSES re-subscribes
whenever the `subscribe` function identity changes, so `subscribe` must be
memoised on exactly `[BlocClass, instanceKey]` — memoising on `bloc` alone
reintroduces the `useBloc(cond ? AdminBloc : UserBloc)` leak the comment
describes. Per-mount instances (`{ args: { _id: useId() } }`) are just a
distinct `instanceKey`, so they fall out correctly.

### 3f. Ordering: `useBlocDeps` vs activation — a real, unaddressed constraint

`useBlocDeps` applies its slice in a **passive** `useEffect` with no dep array
(`useBlocDeps.ts:31–33`), and withdraws on unmount (`:35–39`). `useBloc` takes
ownership in a **layout** effect (`:420`).

React runs all layout effects before any passive effect, so today ownership is
always claimed before deps are applied. If `onActivate` fires on the 0→1
transition inside that layout effect, then:

> **`onActivate` runs before the component's first `useBlocDeps` slice is
> applied.** A bloc that reads `this.deps.canvas` in `onActivate` gets
> `undefined` on first activation.

Neither 04 §2 nor the sequencing doc mentions this. It is not a blocker —
`onDepsChanged` is the correct hook for deps-driven work, and that ordering
matches today's `init()` behaviour — but it must be **documented**, and it
argues for firing `onActivate` in a layout effect (predictable, before paint)
rather than a passive one.

---

## 4. Backward compatibility

**Public signature: unchanged.** `UseBlocOptions` (`args`/`select`/`onMount`/
`onUnmount`) and the `[state, bloc, ref]` tuple all survive. The 68 call sites
recompile untouched.

**Behaviour: one change, and a compatibility shim is possible.**

`init()` keeps working exactly as today — 04 §2's own migration step 4 says
"Keep `init()` behaviour unchanged so existing blocs keep working; only the
recommendation moves." Nothing forces existing code to move. The only genuine
behavioural deltas:

| Change                                                                                       | Who notices                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instances constructed in a discarded/SSR render are now **swept**                            | Code relying on a zero-ref instance surviving until someone acquires it — i.e. relying on today's leak. `PersistenceStatus.tsx:19` (`ensure` with no owner) is the one first-party pattern in this shape and needs checking. |
| `init()` side effects now run before activation, but the instance may be swept before commit | Only blocs that both do async work in `init()` **and** are created in a render that never commits. First-party: zero such blocs.                                                                                             |
| Fewer re-renders (uSES coalescing)                                                           | Tests asserting exact render counts.                                                                                                                                                                                         |

**Verdict: one major, not a rewrite of every downstream app.** The shim is
"keep `init()`" and it costs nothing, because `onActivate` is additive. The
docs change; the API does not. Downstream apps that copied the documented
`void this.load()` pattern keep working — they just get the old double-fetch
behaviour until they migrate, which is what they have today.

---

## 5. Recommendation and plan

**Do it — but decouple it from 04 §4, and do 04 §4 in the weaker form (§3d).**

The unit as filed bundles a low-risk, high-value hook rewrite with a
high-risk public-surface ownership change. They are separable: the hook
rewrite needs uSES pairing, but it does **not** need `owners` to be a `Set`.
Splitting them lets the risky half be judged on its own.

Ordering — the tree stays green after every step:

| Step  | Work                                                                                                                                                                                                                                                                                                                                                                                                        | Parallel?                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **1** | **Activation lifecycle + zero-ref sweep** (04 §2, 01 §6) in `blac-core`. Add `onActivate(signal)`/`onDeactivate()`, fire on the 0↔1 transition in `acquire`/`release`/`_releaseDependent`; add the microtask sweep for ref-less creates. Purely additive — no React change, tree green. Diff against the existing ownership fuzz baseline.                                                                  | Strictly first (2 and 5 both build on it) |
| **2** | **Rewrite `useBloc` on uSES** (04 §1, 02 §6, 01 §7). One `Consumer` object; `subscribe`/`getSnapshot` (version counter)/`getServerSnapshot`→0. Delete `rebindNonce`, `force`, `renderStateRef`, `prevBlocRef`, `ownedBlocRef`, the mount-gap check. Port the dep-reconcile onto the consumer object **unchanged in behaviour** — it is the subtlest code in the file and is not what this finding is about. | Strictly after 1                          |
| **3** | **Registry via context** (04 §5). `RegistryContext`, `useContext(...) ?? getRegistry()`. Small and independent of 2's internals.                                                                                                                                                                                                                                                                            | Can run parallel with 2                   |
| **4** | **Docs pass** — the 9 files teaching `init()` side effects, plus the 3 uSES claims (`CHANGELOG.md:240`, `README.md:20`, and flipping `use-bloc.mdx:251` / `async.mdx:267,382`).                                                                                                                                                                                                                             | Parallel with everything                  |
| **5** | **Ownership consolidation** (04 §4, weakened per §3d): `refs` + `dependents` → one `owners: Map<OwnerToken, number>`. Public surface (`getRefIds`, circuit breaker, devtools ×5) preserved.                                                                                                                                                                                                                 | After 1; independent of 2–4               |
| **6** | **Plugin `onActivate`/`onDeactivate` hooks** (the only open part of 04 §6).                                                                                                                                                                                                                                                                                                                                 | After 1                                   |

Steps 3, 4 and 5 are mutually parallel. 1 → 2 is the only strict chain.

**Do not do:** the `stateChanged`-over-`onStateChange` half of 04 §6 (ruled
out in the R2 audit — the two lanes are not redundant), and the bare-`Set`
form of 04 §4 (§3d).

The `~942 → ~350` line estimate looks optimistic. The dep-reconcile machinery
(`:588–662`, plus `makeDepWrapper` at `:789–878`, ~180 lines) is orthogonal to
uSES and survives essentially intact. Realistic target: **~500 lines**.

---

## 6. Testing strategy

The R2 fuzz baseline (`StateContainerRegistry.ownership.fuzz.test.ts`, 200
seeds, mutation-verified) covers steps 1 and 5 — diff against it rather than
writing new ownership tests. Per project convention, keep new tests minimal:

| Test                                                                           | Why it is needed                                                     | Step |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---- |
| Tearing: two siblings, emit between their renders, assert identical snapshots  | The 01 §7 finding; nothing covers it today                           | 2    |
| StrictMode subscribe/unsubscribe pairing (count sub vs unsub)                  | The single assumption the deletion of `rebindNonce`/`force` rests on | 2    |
| SSR: `renderToString`, then assert the registry holds **no** instance          | Today's test only asserts HTML content and would not catch the leak  | 1    |
| `onActivate` fires once per ownership span; `AbortSignal` aborts on deactivate | New public surface                                                   | 1    |
| Ref-less create is swept (create without commit → disposed after a microtask)  | The 01 §6 fix                                                        | 1    |

The 27 existing `blac-react` tests are the real regression net for step 2 —
particularly the cross-bloc suites, which exercise the dep-reconcile paths the
rewrite must preserve. Expect churn only in tests asserting exact render
counts.

Not worth writing: a concurrent-rendering/`startTransition` test. uSES _is_
the mechanism that makes concurrent rendering safe; testing React's own
guarantee tests React, not this code.

---

## 7. Open decisions

Four, in descending order of consequence. I have a recommendation for each.

1. **Does 04 §4 ship as a `Map` or a `Set`?** The review and the log both say
   `Set`; §3d shows that silently breaks double-acquire and cannot express the
   `maxRefsPerInstance` circuit breaker. **Recommend `Map<OwnerToken, number>`** —
   all of the design benefit, none of the regression. If you want the literal
   `Set`, then `acquire`'s public `refId` parameter has to become
   framework-internal first, which is a separate breaking change.

2. **Is 04 §4 in this release at all?** It is the only part of Phase 5 that
   touches published `blac-core` surface (`getRefCount`/`getRefIds`/devtools
   ×5), and §3a shows the hook rewrite does not depend on it. **Recommend
   splitting it out** and shipping steps 1–4 + 6 as the major; 04 §4 can follow
   in the same major or the next one on its own merits.

3. **Delete `configureBlacReact` and the 3rd tuple element?** Both have zero
   non-doc consumers, and this is the major where removals are free.
   **Recommend deleting `configureBlacReact`** (empty config, dead) and
   **keeping the tuple's 3rd element** — it costs one `useRef`, it is
   documented in 3 places, and a tuple-arity change is the one thing here that
   would actually break downstream destructuring.

4. **Where does `onActivate` fire — layout or passive effect?** §3f: in a
   layout effect it runs before the first `useBlocDeps` slice is applied, so
   `this.deps` is empty during first activation. **Recommend layout effect**
   (predictable, pre-paint, matches today's `init()` timing) with the ordering
   documented and `onDepsChanged` named as the correct hook for deps-driven
   work.

Not a decision, but flagged: **`CHANGELOG.md:240` and `README.md:20` have been
claiming uSES since 2.x.** Whatever is decided above, that claim should stop
being false in this release.
