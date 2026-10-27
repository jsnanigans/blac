---
title: 'Proposal: Adoption Pilot'
description: A small, measurable pilot of the shipped APIs in a real app, run before more is built.
---

:::caution[Proposal — not started]
This is a process proposal, not an API. See the [proposals index](/proposals/) for the other pages.
:::

## Why

`@blac/async` and the other additions were built from an analysis of a large production codebase, but none has run inside it yet. The async proposals each have open questions only real use can settle. A pilot answers them cheaply, and decides which proposals are worth building.

## When

After the [async refinements](/proposals/async-refinements/), [mutation concurrency](/proposals/mutation-concurrency/), [resource input](/proposals/resource-input/), [lifecycle hooks](/proposals/lifecycle-hooks/) and [activation-scoped timers](/proposals/activation-timers/). Those change the shape of code the pilot would otherwise migrate twice. The larger proposals, [realtime refetch](/proposals/realtime-refetch/) and [`ask()`](/proposals/ask/), come after it and are shaped by what it finds.

## Scope

Pick the smallest slice that touches every shipped area. Link the packages from the workspace or a packed tarball, so no release is needed.

| Slice                                       | Exercises                                                    |
| ------------------------------------------- | ------------------------------------------------------------ |
| One data container that other screens share | `resource`, `tags`, `invalidate`, `keepAlive`, `onActivated` |
| One form with a submit                      | `mutation`, `success` message, double-submit behavior        |
| One server-paged list and one typeahead     | `input`: how much page-reset logic is left in each container |
| One session boundary                        | `clearWhere` on sign-out                                     |
| One screen's tests and stories              | `waitForState`, `renderWithBlocs`, `withBlocs`               |
| One container that must hydrate at boot     | Web storage persistence                                      |
| One container refreshed by socket events    | Today's primitives plus `set`; shapes realtime refetch       |
| One confirm-then-save flow                  | `mutation` with the existing dialog; shapes `ask()`          |

## What to record

- Lines before and after for each slice, and which lines remain.
- Any behavior that changed, in the style of the "differences to review" sections.
- Whether the mutation race was ever observed, and whether `exclusive` is wanted at call sites.
- Whether the page-reset helper repeats across the lists tried (decides whether a `listResource` helper is worth adding).
- Whether a flat tag convention holds up, or tags drift or get mistyped (decides tuple keys).
- What the socket-driven container still hand-writes: coalescing flags, polling, recovery (decides the realtime API).
- What the confirm flow still hand-writes around the dialog (decides `ask()`).

## Exit criteria

| Outcome                                       | Next step                                               |
| --------------------------------------------- | ------------------------------------------------------- |
| Slices migrate with only expected differences | Release the pending changesets, then migrate in batches |
| A shipped API needs a change                  | Fix it before release, so the first version is right    |
| An open question is answered                  | Build or drop the matching proposal                     |

## Effort

About 1–2 days for the pilot itself, in the consuming app, plus 0.5–1 day for fixes that come out of it.
