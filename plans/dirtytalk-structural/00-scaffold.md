# 00 — Scaffold `@dirtytalk/structural`

**Phase:** 0 (sequential — must commit before any Phase 1 agent starts)
**Model:** Sonnet 4.6
**Effort:** low (mechanical)
**Estimated touch:** ~12 new files

---

## Goal

Create `packages/dirtytalk-structural/` with the same build/test toolchain as `packages/dirtytalk-engine/`. Lay down empty stub files for every source unit the Phase 1+ agents will fill, so each downstream agent only has to *fill bodies* in its owned file — never create the file from scratch in a checkout it's racing other agents on.

This task ships a **package that builds and tests successfully with zero functional code.** No exports beyond type re-exports + empty class shells.

---

## Inputs — read these first

1. `packages/dirtytalk-engine/package.json` — copy structure exactly (deps, scripts, exports).
2. `packages/dirtytalk-engine/tsconfig.json` and `tsconfig.build.json` — copy.
3. `packages/dirtytalk-engine/vite.config.ts` — copy.
4. `packages/dirtytalk-engine/.gitignore` — copy.
5. `packages/dirtytalk-engine/src/index.ts` — read for barrel pattern.
6. `dirtytalk/03-blac.md` — full surface area is described here. The stubs you write are derived from this.
7. `~/.claude/CLAUDE.md` — commit format.
8. `AGENTS.md` — `vp` command usage (no direct `pnpm`/`npm`).

---

## Owned files (write set)

You may create the following files. **No other files** in the repo.

```
packages/dirtytalk-structural/
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.ts
├── README.md                              (placeholder; 01-readme replaces)
└── src/
    ├── index.ts                           (barrel — empty exports today; later phases extend)
    ├── react.ts                           (React subpath barrel — empty today)
    ├── types.ts                           (shared type aliases — final contents)
    ├── path-interner.ts                   (stub: class with method signatures, throw 'not implemented')
    ├── path-set.ts                        (stub)
    ├── tracker.ts                         (stub)
    ├── diff.ts                            (stub)
    ├── container.ts                       (stub)
    └── react-hook.ts                      (stub)
```

**Do not touch:** any other file in the repo. Specifically: do not modify `pnpm-workspace.yaml` unless it does not already auto-include `packages/*` (check it first; the existing engine package picks up automatically, so structural will too).

---

## Concrete contents

### `package.json`

Mirror engine, replacing the name, description, and exports. Add the `@dirtytalk/engine` workspace dep and the React peer.

```json
{
  "name": "@dirtytalk/structural",
  "version": "0.0.1",
  "license": "MIT",
  "author": "Brendan Mullins <jsnanigans@gmail.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/jsnanigans/blac.git",
    "directory": "packages/dirtytalk-structural"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "core": ["./dist/index.d.ts"],
      "react": ["./dist/react.d.ts"]
    }
  },
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./react": {
      "import": { "types": "./dist/react.d.ts", "default": "./dist/react.js" },
      "require": { "types": "./dist/react.d.cts", "default": "./dist/react.cjs" }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "publishConfig": { "access": "public" },
  "keywords": ["reactive", "dirty-tracking", "path", "state", "structural"],
  "scripts": { /* copy from engine package.json verbatim */ },
  "dependencies": {
    "@dirtytalk/engine": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:",
    "vite-plus": "catalog:",
    "publint": "catalog:",
    "react": "catalog:",
    "@types/react": "catalog:"
  }
}
```

If `react` / `@types/react` aren't in the catalog, omit them from `devDependencies` — the Phase 4 agent will add them in its own commit.

### `vite.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`

Copy verbatim from `packages/dirtytalk-engine/`. The only edit: in `vite.config.ts`, update the `entry` / `pack` config to declare two entries — `index` and `react` — mirroring how engine declares `index` and `primitives`.

### `src/types.ts` — **final contents** (not a stub)

```ts
/**
 * Public type aliases shared across the package's modules.
 * Concrete representations live in their respective implementation files.
 */

/** An interned identifier for a path through state. Stable per Container class. */
export type PathId = number;

/** Opaque consumer identifier. */
export type ConsumerId = string | symbol;
```

That's it. No other content. Subsequent files import from here.

### Stub pattern (apply to all other `src/*.ts` files)

Each implementation file gets a single `throw new Error('not implemented — Phase N will fill this in');` body and the **exported names** referenced by `dirtytalk/03-blac.md`. The goal is: TS compiles, tests can import the names, no runtime call works.

**`src/path-interner.ts`:**

```ts
import type { PathId } from './types';

export class PathInterner {
  intern(_path: string): PathId {
    throw new Error('PathInterner.intern: not implemented (Phase 1)');
  }
  lookup(_id: PathId): string {
    throw new Error('PathInterner.lookup: not implemented (Phase 1)');
  }
  get size(): number {
    throw new Error('PathInterner.size: not implemented (Phase 1)');
  }
}
```

**`src/path-set.ts`:**

```ts
import type { PathId } from './types';
import type { Space } from '@dirtytalk/engine';

export type PathSet = Set<PathId> | typeof ALL_PATHS;

export const ALL_PATHS: unique symbol = Symbol.for('@dirtytalk/structural/ALL_PATHS');

export const emptyPathSet = (): PathSet => {
  throw new Error('emptyPathSet: not implemented (Phase 1)');
};
export const pathSetUnion = (_a: PathSet, _b: PathSet): PathSet => {
  throw new Error('pathSetUnion: not implemented (Phase 1)');
};
export const pathSetEquals = (_a: PathSet, _b: PathSet): boolean => {
  throw new Error('pathSetEquals: not implemented (Phase 1)');
};

export const PathSetSpace: Space<PathSet> = {
  empty: () => {
    throw new Error('PathSetSpace.empty: not implemented (Phase 1)');
  },
  isEmpty: () => {
    throw new Error('PathSetSpace.isEmpty: not implemented (Phase 1)');
  },
  union: () => {
    throw new Error('PathSetSpace.union: not implemented (Phase 1)');
  },
  intersects: () => {
    throw new Error('PathSetSpace.intersects: not implemented (Phase 1)');
  },
};
```

**`src/tracker.ts`:**

```ts
import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

export interface TrackResult<S> {
  value: S;
  paths: PathSet;
}

export const trackRender = <S>(_state: S, _interner: PathInterner): TrackResult<S> => {
  throw new Error('trackRender: not implemented (Phase 2)');
};
```

**`src/diff.ts`:**

```ts
import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

export const diffAlongSkeleton = <S>(
  _prev: S,
  _next: S,
  _skeleton: PathSet,
  _interner: PathInterner,
): PathSet => {
  throw new Error('diffAlongSkeleton: not implemented (Phase 2)');
};

export const pathsFromPatch = <S>(
  _patch: Partial<S>,
  _interner: PathInterner,
  _basePath?: string,
): PathSet => {
  throw new Error('pathsFromPatch: not implemented (Phase 2)');
};

export const getAt = (_state: unknown, _path: string): unknown => {
  throw new Error('getAt: not implemented (Phase 2)');
};
```

**`src/container.ts`:**

```ts
import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';
import type { ConsumerId } from './types';
import type { Scheduler } from '@dirtytalk/engine';

export interface StructuralContainerOptions {
  scheduler?: Scheduler;
}

export abstract class StructuralContainer<S> {
  constructor(_initial: S, _options?: StructuralContainerOptions) {
    throw new Error('StructuralContainer: not implemented (Phase 3)');
  }

  get state(): S {
    throw new Error('StructuralContainer.state: not implemented (Phase 3)');
  }

  get interner(): PathInterner {
    throw new Error('StructuralContainer.interner: not implemented (Phase 3)');
  }

  emit(_next: S): void {
    throw new Error('StructuralContainer.emit: not implemented (Phase 3)');
  }
  patch(_partial: Partial<S>): void {
    throw new Error('StructuralContainer.patch: not implemented (Phase 3)');
  }
  update(_fn: (state: S) => S): void {
    throw new Error('StructuralContainer.update: not implemented (Phase 3)');
  }

  registerConsumerPaths(_id: ConsumerId, _paths: PathSet): void {
    throw new Error('StructuralContainer.registerConsumerPaths: not implemented (Phase 3)');
  }
  unregisterConsumer(_id: ConsumerId): void {
    throw new Error('StructuralContainer.unregisterConsumer: not implemented (Phase 3)');
  }
}
```

**`src/react-hook.ts`:**

```ts
import type { StructuralContainer } from './container';

export interface UseStructuralOptions {
  select?: never;
}

export const useStructural = <S, C extends StructuralContainer<S>>(
  _container: C,
  _options?: UseStructuralOptions,
): readonly [S, C] => {
  throw new Error('useStructural: not implemented (Phase 4)');
};
```

### Barrels — empty for now

**`src/index.ts`:**

```ts
// @dirtytalk/structural — core (no React)
// Phase 1+ tasks extend this barrel.
export type { PathId, ConsumerId } from './types';
```

**`src/react.ts`:**

```ts
// @dirtytalk/structural/react — React adapter
// Phase 4 extends this barrel.
export {};
```

### `README.md` (placeholder)

One line; the 01-readme task replaces it.

```md
# @dirtytalk/structural

Path-based dirty-tracking instantiation of @dirtytalk/engine. Implementation in progress — see `plans/dirtytalk-structural/`.
```

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (no staged or unstaged changes). If dirty, stop and report.
   - On branch `main` (or whatever the current branch is); do not switch.
   - `ls packages/dirtytalk-engine` works — confirms engine package exists.
   - `pnpm-workspace.yaml` already includes `packages/*` (don't need to edit it).

2. **Implement.** Create every file in the owned-files list with the contents above.

3. **Verify.**
   - From repo root: `vp install` so the new package is wired into the workspace.
   - From `packages/dirtytalk-structural/`: `vp run typecheck`. Must pass — every stub is well-typed.
   - `vp run lint`. Must pass.
   - `vp run format:check`. Must pass. (Run `vp run format` first if needed to normalise output, **but verify with `format:check` after**.)

4. **Test.**
   - `vp run test` from the package. Should pass with no tests (the `--passWithNoTests` flag in the script handles this).
   - `vp run build`. Should produce `dist/index.{js,cjs,d.ts,d.cts}` and `dist/react.{js,cjs,d.ts,d.cts}`. (The runtime files will be tiny — just type re-exports — but they must exist.) Run `vp run clean` after inspection.
   - `vp run verify` (publint). Must pass.

5. **Commit.**

   ```
   chore(dirtytalk-structural): scaffold package
   ```

   No body needed. No co-author.

---

## Acceptance criteria

- [ ] All files listed in "Owned files" exist with the contents specified.
- [ ] `vp install` succeeds at repo root.
- [ ] `vp run typecheck`, `vp run lint`, `vp run format:check`, `vp run test`, `vp run build`, `vp run verify` all pass from `packages/dirtytalk-structural/`.
- [ ] `dist/` is gitignored and not committed.
- [ ] No other package's files were modified.

---

## Pitfalls

- **Do not implement anything beyond stubs.** Each `throw new Error('… not implemented (Phase N) …')` is the contract that Phase 1+ agents can identify their target by `grep`.
- **Do not pre-export the stubs** in `index.ts` / `react.ts` — only `types` for now. Later phases extend the barrel as they implement.
- **Vite-plus `pack` config must declare both entries.** If only `index` is declared, the `react` build won't emit and the `exports` map in `package.json` will fail `publint`. Mirror the engine's two-entry config (engine uses `index` + `primitives`; structural uses `index` + `react`).
- **`@dirtytalk/engine` import in stubs.** Make sure TS resolves it via the workspace (the dependency entry + `vp install` is the unlock). If you see "cannot find module", you skipped the install step.
- **No catalog'd React?** If `react` isn't in the workspace catalog yet, omit it from devDependencies *and* delete the `react.ts` entry from `vite.config.ts` for now — leave a TODO comment on top of `react-hook.ts`. The Phase 4 agent will add it. (Verify by checking `pnpm-workspace.yaml` for a `catalog:` section.)
- **`.d.cts` duplication.** The `build` script ends with `for f in dist/*.d.ts; do cp "$f" "${f%.d.ts}.d.cts"; done`. This must run after `tsc -p tsconfig.build.json`. Copy the engine's exact script line.
- **Don't run `vp run test` across the whole repo.** Scope every command to `packages/dirtytalk-structural/` (per `~/.claude/CLAUDE.md`: targeted validation only).
