---
title: Proposals
description: Previews of shipped and possible changes across BlaC packages, written for review before anything more is built.
---

:::caution[Preview section]
Pages marked **Built** describe features that exist today and show what adopting them replaces. Pages marked **Proposed** describe APIs or work that do not exist yet. The section is searchable but left out of `llms.txt`, so assistants do not recommend unbuilt APIs.
:::

Each page shows the API, code it improves (before and after), the differences to review, and open questions.

## Core

| Page                                            | Status                        | Replaces                                          |
| ----------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| [Reset by predicate](/proposals/clear-where/)   | Built                         | App-wide reset events and id-string matching      |
| [Watch with a signal](/proposals/watch-signal/) | Built                         | Hand-written subscription bridges and their leaks |
| [Borrow by key](/proposals/borrow-key/)         | Proposed, not recommended yet | Repeating full `args` at lookup call sites        |

## React and testing

| Page                                                 | Status | Replaces                                                  |
| ---------------------------------------------------- | ------ | --------------------------------------------------------- |
| [Isolated instances](/proposals/isolated-instances/) | Built  | Per-mount `useId` and `static key` boilerplate            |
| [Testing helpers](/proposals/testing-helpers/)       | Built  | Polling, hand-written `useBloc` mocks, per-app decorators |

## Persistence

| Page                                                       | Status | Replaces                                        |
| ---------------------------------------------------------- | ------ | ----------------------------------------------- |
| [Web storage persistence](/proposals/web-storage-persist/) | Built  | Hand-written `localStorage` persistence helpers |

## `@blac/async`

| Page                                                     | Status   | Adds                                       | Replaces                                                      | Effort |
| -------------------------------------------------------- | -------- | ------------------------------------------ | ------------------------------------------------------------- | ------ |
| [List query](/proposals/list-query/)                     | Proposed | `listResource(...)` with `setQuery(patch)` | Near-clone server-paged list containers                       | ~1d    |
| [Mutation concurrency](/proposals/mutation-concurrency/) | Proposed | Ordered slot, `exclusive: true`            | Hand-written `isSubmitting` guards                            | 2–3h   |
| [Retry after token refresh](/proposals/retry-failed/)    | Proposed | `retryFailed(registry?)`, `retryOn` recipe | An app-wide token-refresh event and per-container last params | ~3h    |

## Release and adoption

| Page                                               | Status   | What                                                    | Effort |
| -------------------------------------------------- | -------- | ------------------------------------------------------- | ------ |
| [Release readiness](/proposals/release-readiness/) | Proposed | Changesets for shipped features, API report for async   | ~3h    |
| [Adoption pilot](/proposals/adoption-pilot/)       | Proposed | Run the shipped APIs in a real app before building more | 1–2d   |

## Suggested order

1. Run the [adoption pilot](/proposals/adoption-pilot/). It settles the open questions on every async proposal.
2. Land [release readiness](/proposals/release-readiness/) so the shipped features are in the changelog.
3. Build mutation concurrency: it fixes a race in shipped code.
4. Build retry after token refresh once the pilot shows how `401`s reach the app.
5. Build list query only if the pilot shows the page-reset logic repeating.
6. Leave borrow by key until a call site needs it.

## About the examples

The "before" code is a typical shape adapted from production apps and simplified, with names changed. It is not copied from a real codebase, and the "before" tests are typical shapes as well. "After" code for **Proposed** pages is illustrative and not compiled, because those APIs do not exist yet.
