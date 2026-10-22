---
title: 'Proposal: Adoption Pilot'
description: A small, measurable pilot of the shipped APIs in a real app, run before more is built.
---

:::caution[Proposal — not started]
This is a process proposal, not an API. See the [proposals index](/proposals/) for the other pages.
:::

## Why

`@blac/async` and the other additions were built from an analysis of a large app, but none has run inside it yet. The async proposals ([list query](/proposals/list-query/), [mutation concurrency](/proposals/mutation-concurrency/), [retry after token refresh](/proposals/retry-failed/)) each have open questions only real use can settle. A pilot answers them cheaply, and decides which proposals are worth building.

## Scope

Pick the smallest slice that touches every shipped area. Link the packages from the workspace or a packed tarball, so no release is needed.

| Slice                                       | Exercises                                                       |
| ------------------------------------------- | --------------------------------------------------------------- |
| One data container that other screens share | `resource`, `tags`, `invalidate`, `keepAlive`, `onActivated`    |
| One form with a submit                      | `mutation`, `success` message, double-submit behavior           |
| One server-paged list                       | The list-query question: how much page logic is left in `after` |
| One session boundary                        | `clearWhere` on sign-out                                        |
| One screen's tests and stories              | `waitForState`, `renderWithBlocs`, `withBlocs`                  |
| One container that must hydrate at boot     | Web storage persistence                                         |

## What to record

- Lines before and after for each slice, and which lines remain.
- Any behavior that changed, in the style of the "differences to review" sections.
- Whether a `401` reaches the app as an error with a status code (decides the retry proposal).
- Whether the mutation race was ever observed, and whether `exclusive` is wanted at call sites.
- Whether the page-reset rule repeats across the lists tried (decides the list-query proposal).

## Exit criteria

| Outcome                                       | Next step                                               |
| --------------------------------------------- | ------------------------------------------------------- |
| Slices migrate with only expected differences | Release the pending changesets, then migrate in batches |
| A shipped API needs a change                  | Fix it before release, so the first version is right    |
| An open question is answered                  | Build or drop the matching proposal                     |

## Effort

About 1–2 days for the pilot itself, in the consuming app, plus 0.5–1 day for fixes that come out of it.
