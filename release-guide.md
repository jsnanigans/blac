# Release Guide

Releases use [Changesets](https://github.com/changesets/changesets). Publishing is **manual** and runs from the `main` branch. Only packages that changed (and anything depending on them) get versioned and published.

## TL;DR

```fish
pnpm changeset        # 1. describe your change
pnpm release:status   # 2. preview what will bump
pnpm release:version  # 3. apply bumps + changelogs
git add -A && git commit -m "[<ticket>] chore(release): version packages"
pnpm release:publish  # 4. build + publish changed packages
git push
```

Or run `pnpm release` for an interactive menu of all the steps below.

## Steps

### 1. Add a changeset (per change)

```fish
pnpm changeset
```

Select the affected packages and a bump level (`patch` / `minor` / `major`) for each, then write a one-line summary. This creates a file in `.changeset/` — commit it with your PR.

> No user-facing change? `pnpm changeset add --empty`.

### 2. Preview the release

```fish
pnpm release:status
```

Shows exactly which packages will bump and to what version, **including dependents** that cascade automatically. Nothing here changes files.

### 3. Version packages

```fish
pnpm release:version
```

Consumes pending changesets: bumps only changed packages + their dependents, rewrites internal deps, and updates each `CHANGELOG.md`. Review `git diff`, then commit:

```fish
git add -A && git commit -m "[<ticket>] chore(release): version packages"
```

### 4. Publish

```fish
pnpm release:publish
```

Builds all packages, then publishes **only** packages whose version isn't already on npm. Then push the version commit and tags:

```fish
git push --follow-tags
```

## Prereleases (alpha / beta / rc)

```fish
pnpm changeset pre enter beta   # start prerelease mode
# ... changeset / version / publish as usual → x.y.z-beta.N
pnpm changeset pre exit         # back to stable
```

## How "only what changed" works

- A changeset names which packages changed; `release:version` bumps **only those + their dependents**.
- `updateInternalDependencies: "patch"` cascades bumps down the dependency graph automatically (e.g. an `@dirtytalk/engine` change patch-bumps `structural`/`spatial`, which patch-bumps `@blac/core`/`@blac/react`).
- `release:publish` compares each version to the registry and skips anything already published.

No manual diffing required.

## Reference

| Command | Does |
|---|---|
| `pnpm changeset` | Create a changeset |
| `pnpm release:status` | Preview pending bumps + dependents |
| `pnpm release:check` | Build + verify + test + typecheck |
| `pnpm release:version` | Apply changesets, bump versions, write changelogs |
| `pnpm release:publish` | Build + publish changed packages |
| `pnpm release` | Interactive menu for all of the above |

- Config: `.changeset/config.json` (`baseBranch: main`, `access: public`).
- All `@blac/*` and `@dirtytalk/*` packages publish publicly; `@9amhealth/blac-compat` is private and never published.
- Requires npm auth with publish rights to the `@blac` and `@dirtytalk` scopes.
