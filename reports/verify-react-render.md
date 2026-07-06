# Verification: Render-tracking ergonomics (08-render-tracking-ergonomics.md)

Source verified against: `packages/blac-react/src/useBloc.ts`,
`packages/blac-react/src/buildTrackedProxy.ts`, `packages/blac-react/src/types.ts`,
`packages/blac-react/src/config.ts`, `packages/dirtytalk-structural/src/tracker.ts`,
`packages/dirtytalk-structural/src/container.ts`, `packages/dirtytalk-engine/src/dirty-channel.ts`.

## Claim A — default (no `select`) state is a fresh proxy every render
**Verdict: VERIFIED**

`useBloc.ts:342-347`, the no-`select` branch calls `trackRender(rawState, interner)`
unconditionally every render and returns `tracked.value` as `state`. `trackRender`
(`tracker.ts:79-99,225-227`) allocates a fresh `WeakMap` (`proxyByTarget`) and
`new Proxy(target, handler)` on every call — the docstring at `tracker.ts:97-98`
is explicit: *"Per-call cache. Dies with this function frame so each render gets
fresh recordings; do not promote to module scope."* So `state` is a new object
identity every render even when `bloc.state` itself is unchanged (confirmed
reference-stable — see D.2 below). Putting it in a `useEffect`/`useMemo` dep
array does cause the effect to re-run every render. One nuance: "Maximum update
depth exceeded" only occurs if that effect's body itself triggers a further
re-render (e.g. calls `setState`); a plain read-only effect just re-runs
every render rather than looping infinitely. The core "unstable by reference"
claim is accurate; the "worst case" framing is a plausible but not automatic
consequence.

## Claim B — with `select`, hook returns raw stable `bloc.state`, re-renders via per-index `Object.is`
**Verdict: VERIFIED**

`useBloc.ts:332-333`: `if (selectRef.current !== undefined) { state = rawState; ... }`
— no proxy wrapping, the raw `bloc.state` is returned directly. Re-render
gating is in the channel subscription callback, `useBloc.ts:256-274`: subscribes
to `ALL_PATHS`, and on every emit calls `select(...)`, compares against
`lastSelectionRef.current` via `shallowArrayEqual` (`useBloc.ts:651-658`, per-index
`Object.is`), only calling `force()` (the `useReducer` bump, `useBloc.ts:234`) if
they differ.

## Claim C — selector must be referentially stable or the subscription re-keys
**Verdict: FALSE (stale documentation, not current implementation behavior)**

The feedback's claim mirrors the JSDoc warning in `types.ts:41-44`: *"Keep the
selector referentially stable across renders ... passing a fresh function each
render forces the subscription to re-key, which the underlying channel treats
as a new consumer."* That is **not what the code does**:

- `selectRef` is a `useRef` reassigned unconditionally every render
  (`useBloc.ts:113-114`, in the render body, not an effect) — always holds the
  latest function.
- The channel subscription effect's dependency array is `[bloc, consumerId]`
  only (`useBloc.ts:300`) — it does **not** depend on `select`'s identity, so a
  new inline lambda passed every render never re-runs this effect.
- The subscription callback dereferences `selectRef.current` fresh at
  *invocation* time (`useBloc.ts:260-265`), not a closed-over function from
  subscribe time.
- `DirtyChannel.subscribe` (`dirty-channel.ts:58-70`) keys subscribers by an
  internal monotonic `id`, never by identity of the passed-in `interest`/`cb`
  functions — there is no "the channel treats a new function as a new
  consumer" mechanism at all, at any layer.

So today, an inline `select` lambda recreated every render causes **no
re-subscription, no re-keying, and no extra channel consumer**. This looks
like documentation that predates a refactor (`selectRef`/ref-indirection was
introduced specifically to decouple the subscription from the callback's
identity) and was never updated to match. This is a documentation bug, not a
behavioral one — and it's the opposite direction of the feedback's premise:
the "shipped fix's footgun" doesn't currently exist in the code, only in the
docstring.

## Claim D — feasibility of the three suggested fixes

**D.1 — Doc-only callout for the dep-array trap.**
Trivial. JSDoc for `useBloc` lives at `useBloc.ts:39-88`; the `select` doc
lives at `types.ts:32-57`. A one-line "if this is going in a dependency
array, use `select`" note is a pure comment addition — no code/behavior risk.
Should be paired with fixing the Claim C doc, which is actively *wrong* and
more urgent than adding a new callout.

**D.2 — Stabilize the default value by reference when state is unchanged.**
Feasible but non-trivial; real tension exists. `bloc.state` itself IS
reference-stable across renders when nothing changed — `emit()`
(`container.ts:136`) short-circuits on `Object.is(this._state, next)`, and
`patch()` (`container.ts:176`) short-circuits when `deepMerge` returns `prev`
by reference for a no-op. The instability is purely a side effect of
`trackRender` allocating a brand-new `WeakMap`+`Proxy` graph every call
(`tracker.ts:99,225-227`) — necessary because the proxy's job is to *record
which paths this render's JSX reads*, and that recording state must start
empty each render.
The two are reconcilable in principle: cache the last `{rawState, tracked}`
in a ref keyed on `rawState` identity; when a render's `rawState` is `===` the
cached one (e.g. the re-render was caused by an unrelated parent update, not
a bloc emit), reuse the same top-level proxy object rather than rebuilding it
from scratch — but its internal `paths`/`pinned` recording sets must still be
reset to empty at the start of that render, since `pathRef.current`/
`registerConsumerPaths` need *this render's* actual read set, not an
accumulation across renders (`useBloc.ts:349-355` explicitly clears/rebuilds
per render for the same reason on the session side).
Constraint: `trackRender` doesn't expose a reset/reuse API today — its
per-call `paths`/`pinned`/`proxyByTarget` are private closure state, and the
docstring explicitly forbids promoting the cache beyond one call
(`tracker.ts:97-98`). Implementing this needs a `@dirtytalk/structural` API
addition (e.g., a resettable tracker), a shared, cross-consumer primitive also
used by `dirtytalk-structural/src/react-hook.ts` — so it's a public surface
change to a lower-level package, not a `blac-react`-local fix. When `rawState`
actually changes (the common case right after a real bloc update), a new
proxy is unavoidable and appropriate anyway. Net: worth doing, but it's a
tracker-level feature addition, not a quick patch, and only helps the
"parent re-rendered, bloc didn't change" case — not the "bloc changed, state
legitimately differs" case (where a new reference is correct).

**D.3 — `select` accepts a deps array, or a dev-mode identity-change warning.**
No existing hook to piggyback on: `config.ts:1-42` is an intentionally empty
`BlacReactConfig` interface ("Reserved for forwards-compatible knobs;
currently empty," `config.ts:9`), and there is currently **no**
`console.warn`/`NODE_ENV`-gated dev-warning code anywhere in `blac-react/src`
(a prior commit, `d9614475`, added dev-only unknown-option-key and
`instanceId`-conflict warnings, but that whole option surface — `instanceId`,
`autoInstance`, `autoTrack`, `deps` — was later removed in the structural-
channel rewrite; the warning machinery went with it). Given Claim C is false
as-implemented, a "warn on select identity change" feature would be solving a
problem that doesn't exist in the current code — the useCallback requirement
described in `types.ts:41-44` should simply be deleted from the docs rather
than reinforced with a warning mechanism. If a genuine motivation for
`useMemo`-style deps surfaces later (e.g. to avoid re-running the selector
function on every emit, a minor CPU concern, not a correctness one), that's a
separate, smaller feature with no current supporting infrastructure to reuse.

## Bottom line for main
1. A is real and worth documenting (D.1, trivial).
2. C — the documented "keep `select` referentially stable" footgun is **not
   true of the current implementation**; the JSDoc in `types.ts:41-44` is
   stale and should be corrected/removed, independent of anything else in the
   feedback.
3. D.3 (dev warning / deps-array for `select`) is solving a problem that (per
   #2) doesn't exist — deprioritize or drop.
4. D.2 (stabilize default proxy by state identity) is the one substantive,
   valuable, but non-trivial fix — it requires a `@dirtytalk/structural` API
   change (resettable tracker), not just a `blac-react` tweak.
5. Safe/cheap: D.1 doc callout + fixing the stale Claim-C doc. Risky/bigger:
   D.2's tracker-reuse change (cross-package public API surface).
