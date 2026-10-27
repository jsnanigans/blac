---
title: Proposals
description: Previews of shipped and possible changes across BlaC packages, written for review before anything more is built.
---

:::caution[Preview section]
Pages here describe APIs or work that do not exist yet. Once a proposal is built, it moves into the reference docs. The section is searchable but left out of `llms.txt`, so assistants do not recommend unbuilt APIs.
:::

Each page shows the API, code it improves (before and after), the differences to review, and open questions. Feedback is welcome on any of them, especially the open questions.

## Goals

The proposals come from migrating a large production codebase (an admin dashboard and a mobile web app sharing one API layer) off hand-written loading, caching and event code. They aim to:

- **Remove app workarounds**, not add features: each page counts the hand-written code it replaces.
- **Keep containers plain and testable**: state stays plain data that tests can seed, and effects are tied to a container's activation, so they clean up on their own.
- **Stay UI-free**: dialogs, forms and tables are built in the app. BlaC offers small primitives they build on, such as [`ask()`](/proposals/ask/) and [form primitives](/proposals/form-primitives/), not components.
- **Generalize**: every primitive must be useful outside the codebase that motivated it.

Pages are grouped by the package they change, the same as the sidebar. **Also touches** tags a page that changes or relies on another package too.

## `@blac/async`

| Page                                                     | Status   | Also touches                        | Adds                                             | Replaces                                                       | Effort |
| -------------------------------------------------------- | -------- | ----------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- | ------ |
| [Mutation concurrency](/proposals/mutation-concurrency/) | Proposed |                                     | Ordered slot, `exclusive`, keyed mutations       | `isSubmitting` guards and per-row loading-id sets              | ~0.5d  |
| [Resource input](/proposals/resource-input/)             | Proposed |                                     | `input: (state) => …`, `debounce`                | Manual `reload()` after filter changes, request-id guards      | ~4h    |
| [Lifecycle hooks](/proposals/lifecycle-hooks/)           | Proposed | Plugins (DevTools)                  | `configureAsync({ onStart, onSettled })`, `meta` | Copy-pasted breadcrumbs and duration metrics                   | ~2h    |
| [Realtime refetch](/proposals/realtime-refetch/)         | Proposed |                                     | Event sources, `refetchOn`, `refetchInterval`    | Socket watchers, coalescing flags, polling and focus listeners | 1–1.5d |
| [Retry after token refresh](/proposals/retry-failed/)    | Proposed |                                     | `retryFailed(registry?)`                         | An app-wide token-refresh event and per-container last params  | ~3h    |
| [`ask()`](/proposals/ask/)                               | Proposed |                                     | An awaitable request the UI answers              | Dialog callbacks and hand-wrapped promises                     | ~2h    |
| [Form primitives](/proposals/form-primitives/)           | Proposed | `@blac/core`, Plugins (Persistence) | `configureAsync({ normalizeError })`             | Form-ready flags, toast-only server validation                 | ~2h    |

The earlier **list query** proposal (`listResource`) is superseded by [resource input](/proposals/resource-input/): with an `input` derived from state, a list container is a query slot plus one resource.

### Later

- **`all(a, b, …)`**: combine several `AsyncState` slots into one status (loading if any is loading, error if any failed), for screens with three loading flags and one spinner. ~1h.
- **Persisted resource cache**: the persist plugin on a resource slot plus `staleTime` gives stale-while-revalidate across sessions.
- **DevTools**: show async slots, their tags and the invalidation log, once [lifecycle hooks](/proposals/lifecycle-hooks/) exist.

### Not proposed

- A normalized entity cache: no container in the surveyed code shares an id map.
- Suspense integration.
- Generic undo.
- A declarative `requires: { flag, capability }`: `enabled` plus `depend()` covers it without a new concept.
- A dialog or form package: see Goals.

## `@blac/core`

| Page                                                      | Status                 | Also touches  | Replaces                                                      |
| --------------------------------------------------------- | ---------------------- | ------------- | ------------------------------------------------------------- |
| [Activation-scoped timers](/proposals/activation-timers/) | Proposed               | `@blac/async` | Hand-managed timeouts, intervals and component-held debounce  |
| [Typed step machine](/proposals/step-machine/)            | Proposed, recipe first |               | `patch({ step })` writes and ad hoc transition guards         |
| [Typed clearWhere](/proposals/typed-clear-where/)         | Proposed               |               | `instanceof` checks and optional chaining in reset predicates |
| [Borrow by key](/proposals/borrow-key/)                   | Closed                 |               | Repeating full `args` at lookup call sites                    |

## Shipped

These started as proposals and are now documented in the reference, each with a "before and after" for migrating from the hand-written version:

- `clearWhere`: [Instance Management](/core/instance-management/#replacing-reset-events), replacing app-wide reset events.
- `watch({ signal })` and `onActivated`: [watch()](/core/watch/#pass-an-abortsignal), replacing hand-written subscription bridges.
- `isolated`: [`useBloc()`](/react/use-bloc/#args), replacing a per-mount `useId` plus `static key`.
- `waitForState`, `renderWithBlocs`, `withBlocs`: [Core Testing](/testing/core/#waitforstatebloc-predicate-options) and [React Testing](/testing/react/#replacing-a-hand-written-usebloc-mock), replacing polling, `useBloc` mocks and per-app Storybook decorators.
- Web storage persistence: [Persistence](/plugins/persistence/#localstorage--sessionstorage), replacing hand-written `localStorage` helpers.
- Async refinements: [Async Resources](/guide/async-resources/). A mutation resolves its settled `AsyncState`, `resource.set` writes locally, `enabled` gates a resource, `optimistic` writes with rollback, a deactivated load restores the exact previous state, and `retryOn` is removed. Tags follow a two-level convention (`['user', 'user:42']`).

## Release and adoption (all packages)

| Page                                               | Status   | What                                                            | Effort |
| -------------------------------------------------- | -------- | --------------------------------------------------------------- | ------ |
| [Release readiness](/proposals/release-readiness/) | Proposed | Changesets for shipped features, API report for async           | ~3h    |
| [Adoption pilot](/proposals/adoption-pilot/)       | Proposed | Run the APIs in a real app before building the larger proposals | 1–2d   |

## Suggested order

1. [Mutation concurrency](/proposals/mutation-concurrency/) and [resource input](/proposals/resource-input/). ~1d.
2. [Lifecycle hooks](/proposals/lifecycle-hooks/) and [activation-scoped timers](/proposals/activation-timers/): small, and they remove the most copy-paste. ~0.5d.
3. [Release readiness](/proposals/release-readiness/), then the [adoption pilot](/proposals/adoption-pilot/).
4. [Realtime refetch](/proposals/realtime-refetch/), shaped by the pilot's socket-driven container. 1–1.5d.
5. [Retry after token refresh](/proposals/retry-failed/) and the smaller helpers.
6. [`ask()`](/proposals/ask/), [form primitives](/proposals/form-primitives/), then the [step machine](/proposals/step-machine/) recipe.

## About the examples

The "before" code is a typical shape adapted from production apps and simplified, with names changed. It is not copied from a real codebase, and the "before" tests are typical shapes as well. Counts such as "about 80 copies" come from searching one production codebase and are estimates. "After" code for **Proposed** pages is illustrative and not compiled, because those APIs do not exist yet.
