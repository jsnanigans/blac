# BlaC feedback — verified triage & fix plan

Source: `blac-feedback/01..08`, verified against live `main` (`@blac/core` /
`@blac/react` v2.0.18) by four investigators. Report files:
`packages/blac-core/reports/verify-depend-identity.md`,
`packages/blac-core/reports/verify-dispose-eventbus.md`,
`reports/verify-testing-utils.md`, `reports/verify-react-render.md`.

## Verdict summary

| # | Topic | Verdict | Real remaining work |
|---|-------|---------|---------------------|
| 1 | Typed event bus | **Real gap** | New feature: `Blac.emit/on` |
| 2 | `depend().onChange` + owner cleanup | **Real gap** (bigger than framed — needs new bookkeeping, no sweep to reuse) | New feature |
| 3 | Testing utilities | **Stale premise** — all 11 exports ship, web-docs already document them fully | README link only |
| 4A | `dependValue()` sugar | **Real** (no sugar exists) | Small additive method |
| 4B | Cycle detection | **Real** — silent stack overflow confirmed | Guard in `acquire` |
| 5 | `instanceKey` on `depend()` | **Partial** — resolver already supports it; only the public API + README are missing/stale | Plumbing + doc |
| 6 | Composite/predicate disposal | **Real gap**; the `_dispose()`/`super` footgun sub-claim is **stale** (no `_dispose` exists) | New feature |
| 7 | `Deps` lane vs `depend()` | **Real doc gap** + stale internal comments; wiring `Deps` into `useBloc` is a separate decision | Docs now, decision later |
| 8 | Render-tracking | Claim A **real**; Claim C (**`select` must be stable**) is **FALSE stale JSDoc, actively misleading** | Doc fix now, tracker feature later |

Key correction to relay to the feedback author: report #3's "no test docs
exist" and its `blac-compat` evidence are **out of date** (docs exist; the
package was deleted in the 2026-06-06 legacy purge); report #6's
`super._dispose()` footgun and report #8's `select` re-key footgun **do not
exist in the current code** — both describe stale/removed behavior.

---

## Wave 0 — Docs & stale-comment corrections (trivial, zero behavior risk)

Do these first: cheap, and two of them are *actively misleading users today*.

0.1 **Fix stale `select` JSDoc** — `blac-react/src/types.ts:41-44` claims the
selector must be `useCallback`-stable or the subscription re-keys. Verified
FALSE: `selectRef` is reassigned every render (`useBloc.ts:113-114`), the
subscription effect deps are `[bloc, consumerId]` only (`:300`), and
`DirtyChannel.subscribe` keys by monotonic id, not fn identity. Delete the
"keep referentially stable / useCallback" guidance. **Highest priority** — it
pushes users into pointless ceremony.

0.2 **Fix README signature drift** — `blac-core/README.md:149` documents
`depend(BlocClass, instanceKey?)`; shipped signature is
`depend(Type, defaultArgs?)`. Update to real signature. (web-docs glossary is
already correct — do not regress it.) Ideally land *after* Wave 1.5 so the
README can document the newly-added `instanceKey` for real.

0.3 **Fix stale internal comments** — `StateContainer.ts:138` and `index.ts:22`
claim `useBloc.ts` reads `APPLY_DEPS`/`REMOVE_DEPS_OWNER`; it does not (zero
matches in `blac-react/src`). Correct/remove.

0.4 **Link testing docs from READMEs** — `blac-core`/`blac-react` READMEs only
have a one-line subpath mention. Add a "Testing" pointer to the existing
`apps/web-docs/.../testing/{overview,core,react}` pages. (No new content — the
docs are already good, incl. the `depend()`-ordering pitfall.)

0.5 **Add dep-array callout** (report #8 D.1) — one line in `useBloc` JSDoc
(`useBloc.ts:39-88`): "if you're putting this value in a dependency array, use
`select` — the default tracked value is a fresh object each render."

0.6 **Add "`Deps` vs `depend()`" contrast section** (report #7 §1) — short
side-by-side in web-docs: "inject a value from the component tree"
(`Deps`/`this.deps`) vs "resolve another Cubit" (`depend()`), stating plainly
they are unrelated despite the shared word.

---

## Wave 1 — Small additive code (low risk, clear win)

1.1 **`dependValue()` sugar** (report #4A) — add
`protected dependValue<T>(Type, args?) { return this.depend(Type, args).untracked(); }`
on `StateContainer`. Additive, non-breaking. Reduces the two-step handle
friction that likely contributes to `depend()`'s zero adoption.

1.2 **Cycle-detection guard** (report #4B) — **ship together with 1.1**, since
1.1 invites more eager `init()`-time resolution. In
`StateContainerRegistry.acquire` (`StateContainerRegistry.ts:335-346`): add an
in-progress-construction `Set<resolvedKey>` (or `Set<Type|key>`), mark before
`new Type()`, clear in a `finally` after `instances.set(...)`. If a key is
already in-progress when requested, throw a `CircularDependencyError` naming
the chain (`A -> B -> A`). Add the error class to core exports + a test.

1.3 **Expose `instanceKey` on `depend()`/`useBloc`** (report #5) — plumbing,
not new resolver logic: `resolveKey` already honors an explicit `instanceKey`
(branch 0, `StateContainerRegistry.ts:192-208`); the internal
`acquire/ensure/borrow` tiers already accept it. Thread it through the public
`depend()` signature to `resolveKey(Type, instanceKey, args)` and through
`useBloc`.
- **API decision needed** (see Open Questions): options-object
  `depend(Type, { instanceKey?, args? })` (matches report, breaking) vs.
  additive positional `depend(Type, defaultArgs?, instanceKey?)`
  (non-breaking). Recommend additive positional + overload to avoid a breaking
  change; revisit the options-object at the next major.
- This closes report #5 Mode 2 (silent divergence) by giving a shape-independent
  identity pin, and lets #6's tags reuse the same key.
- Then land 0.2 (README) documenting the real new signature.

1.4 **`disposeWhere(Type, predicate)`** (report #6, first half) — add a
predicate sweep to the registry that composes the existing per-class
`getAll` + `release(..., forceDispose)` primitives, so consumers stop
hand-writing per-class filter loops. Small, composes existing pieces.

---

## Wave 2 — Larger features (each needs a design decision first)

2.1 **Typed event bus** (report #1) — the one genuine compat-shim gap. Add a
second open-ended `Map<eventType, Set<listener>>` to the global registry
singleton, mirroring the existing closed `on/emit` LifecycleEvent pattern
(`StateContainerRegistry.ts:32-38,685-758`). Public surface
`Blac.emit(type, payload)` / `Blac.on(type, handler): () => void`. Needs a
typed event-map story (module augmentation à la a `BlacEventMap` interface).
Medium effort.

2.2 **`DepHandle.onChange()` + owner-scoped auto-cleanup** (report #2) —
bigger than the report frames: there is **no existing owner-scoped sweep to
extend** (`depend()`'s `_dependencies` map is inert metadata, not a live
subscription). Requires new per-owner subscription bookkeeping on the
*dependent* Cubit, torn down in its `dispose()` (`StateContainer.ts:403-439`).
Built on the existing `onSystemEvent`/`watch` primitives underneath. Medium-high.

2.3 **Lifecycle tags** (report #6, second half) — `registerLifecycleTag(tag)` +
`Blac.disposeTag(tag)` disposing all tagged instances across classes. Hook into
`StateContainerRegistry` near the existing ensure-dep cleanup cascade. Gives a
real middle ground between `keepAlive: true` and dispose-on-last-unsubscribe
(the report found `keepAlive` on 25+ classes as a workaround). Can reuse the
`instanceKey` from 1.3 as/with the tag. Medium.

2.4 **Stable default tracked value** (report #8 D.2) — reuse the top-level
proxy when `rawState` is reference-`===` the previous render's (parent
re-rendered, bloc didn't). Requires a **resettable-tracker API addition to
`@dirtytalk/structural`** (`trackRender`'s per-call `WeakMap`/paths-Set is
private and documented as single-frame, `tracker.ts:97-98`) — a cross-package
public-surface change also used by `dirtytalk-structural/react-hook.ts`. Only
helps the "parent re-rendered" case; a changed state still (correctly) yields a
new reference. Medium; do only if the dep-array friction persists after 0.5.

2.5 **Report #8 D.3 — DROP.** A `select` identity-change warning / deps-array
solves a problem that doesn't exist (Claim C is false). No infra to build on
(`config.ts` is an empty placeholder). Skip.

---

## Open questions (need a call before Wave 1.3 / Wave 2)

1. **`depend()` signature** — additive positional `instanceKey` (non-breaking,
   recommended) vs. options-object (breaking, matches report #5). Affects 1.3 + 0.2.
2. **`Deps` lane in `useBloc`** (report #7 §2) — actually wire
   `APPLY_DEPS`/`REMOVE_DEPS_OWNER` into `useBloc` (new `deps` hook option) OR
   formally scope the `Deps` lane to testing-only and document that. Currently
   it's implemented in core but unreachable from React. Feature decision, not a bug.
3. **Event-bus scope** (2.1) — first-class `Blac.emit/on`, or ship only a
   documented recipe built from `watch` + `clearAll`/`clear`? Report #1 accepts
   either.

## Suggested sequencing

Wave 0 (all, immediately) → Wave 1.1+1.2 (bundled) → decide OQ#1 → Wave 1.3+0.2
→ Wave 1.4 → then Wave 2 items individually as prioritized (2.1 and 2.2 are the
highest-value features; 2.4 lowest-priority / do-if-needed).
