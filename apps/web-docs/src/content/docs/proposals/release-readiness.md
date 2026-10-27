---
title: 'Proposal: Release Readiness'
description: Preview of the release hygiene still open for the shipped features, changesets and API reports.
---

:::caution[Proposal — not done]
This is tooling and release work, not a new API. See the [proposals index](/proposals/) for the other pages.
:::

## Problem

Most of the shipped features have no changeset, so the next release would omit them from the changelog and may under-bump the packages. `@blac/async` also has no API report, so its public surface can drift unnoticed.

| Package                | Shipped                                                          | Changeset today                             |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `@blac/core`           | `clearWhere`, `watch({ signal })`, `waitForState`, `onActivated` | Only `$blac.registry`, inside the async one |
| `@blac/react`          | `isolated`, `withBlocs`, `renderWithBlocs`                       | None                                        |
| `@blac/plugin-persist` | Web storage plugin with synchronous hydration                    | None                                        |
| `@blac/async`          | New package                                                      | Present                                     |

## When

After the breaking [async refinements](/proposals/async-refinements/) (a mutation resolves its settled state, `retryOn` removed), so the first published `@blac/async` has its final shape. Additive proposals can follow in minor releases.

## Proposal

### 1. Changesets

One file per package, written like the existing one:

```md title=".changeset/core-registry-utilities.md"
---
'@blac/core': patch
---

Add `clearWhere`, `watch(..., { signal })`, `waitForState` and `onActivated`.
```

```md title=".changeset/react-isolated-and-test-helpers.md"
---
'@blac/react': patch
---

Add `@blac({ isolated: true })`, `withBlocs` and `renderWithBlocs`.
```

```md title=".changeset/persist-web-storage.md"
---
'@blac/plugin-persist': patch
---

Add `createWebStoragePersistPlugin` with synchronous hydration.
```

The bump level is the decision: recent releases in this repo used `patch` even for features, so `patch` follows precedent, while `minor` would signal new API to consumers.

### 2. API report for `@blac/async`

Copy the `api-extractor.*.json` files and the `api:check` script from `@blac/core`, then add the package to the root `api:check` filter. Fix the formatting drift that makes `api:check` fail on a clean checkout first, as a separate change. Otherwise the new gate starts red, and the hand-edited `core.api.md` can be regenerated.

`@blac/plugin-persist` has no report either. Its public surface grew, but it is optional.

## Effort

| Step                                  | Effort |
| ------------------------------------- | ------ |
| Three changesets                      | ~0.5h  |
| Fix `api:check` drift                 | ~0.5h  |
| `api:check` for `@blac/async`         | ~2h    |
| Optional: report for `plugin-persist` | ~1h    |

## Open questions

- `patch` or `minor` for the feature changesets?
- Should `plugin-persist` get an API report now, or only when its surface next changes?
