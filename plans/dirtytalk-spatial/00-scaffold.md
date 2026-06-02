# 00 — Scaffold `@dirtytalk/spatial`

**Phase:** 0 (sequential — must commit before any Phase 1 agent starts)
**Model:** Sonnet 4.6
**Effort:** low (mechanical)
**Estimated touch:** ~11 new files

---

## Goal

Create `packages/dirtytalk-spatial/` with the same build/test toolchain as `packages/dirtytalk-engine/`. Lay down empty stub files for every source unit the Phase 1+ agents will fill, so downstream agents only fill bodies — no race on file creation.

Ships a package that builds and tests successfully with zero functional code.

---

## Inputs — read these first

1. `packages/dirtytalk-engine/package.json`, `tsconfig*.json`, `vite.config.ts`, `.gitignore` — copy template.
2. `packages/dirtytalk-engine/src/index.ts` — barrel pattern.
3. `dirtytalk/02-insomni.md` — full surface this package exposes.
4. `~/.claude/CLAUDE.md` — commit format.
5. `AGENTS.md` — `vp` command usage.

---

## Owned files (write set)

```
packages/dirtytalk-spatial/
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.ts
├── README.md                              (placeholder; 01-readme replaces)
└── src/
    ├── index.ts                           (barrel — only types today)
    ├── types.ts                           (shared type aliases — final contents)
    ├── rect.ts                            (stub)
    ├── rect-space.ts                      (stub)
    ├── scene-node.ts                      (stub)
    ├── scene-root.ts                      (stub)
    └── pointer-router.ts                  (stub)
```

**Do not touch:** anything else in the repo.

---

## Concrete contents

### `package.json`

```json
{
  "name": "@dirtytalk/spatial",
  "version": "0.0.1",
  "license": "MIT",
  "author": "Brendan Mullins <jsnanigans@gmail.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/jsnanigans/blac.git",
    "directory": "packages/dirtytalk-spatial"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "publishConfig": { "access": "public" },
  "keywords": [
    "reactive",
    "dirty-tracking",
    "damage",
    "rect",
    "scene-graph",
    "spatial"
  ],
  "scripts": {
    /* copy verbatim from packages/dirtytalk-engine/package.json */
  },
  "dependencies": {
    "@dirtytalk/engine": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:",
    "vite-plus": "catalog:",
    "publint": "catalog:"
  }
}
```

### `vite.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`

Copy verbatim from `packages/dirtytalk-engine/`. Only adjust: `vite.config.ts`'s `pack` config to declare a **single** entry (`index`) — no `primitives` / `react` like the other packages. Match engine's config but trim to one entry.

### `src/types.ts` — final contents (not a stub)

```ts
/**
 * Public type aliases shared across the spatial package.
 * Concrete representations live in their respective implementation files.
 */

/** A 2D axis-aligned rectangle in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Damage classification — determines which render-pipeline stages run. */
export type DamageKind = 'paint' | 'layout' | 'data';

/** A single damage entry. `node` is optional — root-level damage may omit it. */
export interface Damage {
  rect: Rect;
  kind: DamageKind;
  node?: unknown;
}

/** The Region type of the spatial DirtyChannel. */
export type DirtyRegion = readonly Damage[];
```

`node?: unknown` deliberately avoids referencing `SceneNode` to break the circular import that would otherwise force `types.ts` to import from `scene-node.ts`. The render pipeline will narrow the type at use time.

### Stub pattern (apply to all other `src/*.ts`)

Each implementation file gets type signatures with `throw new Error('not implemented — Phase N')` bodies.

**`src/rect.ts`:**

```ts
import type { Rect } from './types';

export const rectOverlaps = (_a: Rect, _b: Rect): boolean => {
  throw new Error('rectOverlaps: not implemented (Phase 1)');
};
export const rectEquals = (_a: Rect, _b: Rect): boolean => {
  throw new Error('rectEquals: not implemented (Phase 1)');
};
export const unionRects = (_rects: readonly Rect[]): Rect => {
  throw new Error('unionRects: not implemented (Phase 1)');
};
export const rectClamp = (_inner: Rect, _outer: Rect): Rect => {
  throw new Error('rectClamp: not implemented (Phase 1)');
};
```

**`src/rect-space.ts`:**

```ts
import type { Space } from '@dirtytalk/engine';
import type { DirtyRegion } from './types';

export const RectSpace: Space<DirtyRegion> = {
  empty: () => {
    throw new Error('RectSpace.empty: not implemented (Phase 1)');
  },
  isEmpty: () => {
    throw new Error('RectSpace.isEmpty: not implemented (Phase 1)');
  },
  union: () => {
    throw new Error('RectSpace.union: not implemented (Phase 1)');
  },
  intersects: () => {
    throw new Error('RectSpace.intersects: not implemented (Phase 1)');
  },
};
```

**`src/scene-node.ts`:**

```ts
import type { Rect, DamageKind } from './types';

export abstract class SceneNode {
  bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  parent: SceneNode | null = null;
  clipsOverflow = false;

  abstract paint(layer: unknown): void;

  rebuildData?(): void;
  doLayout?(): void;

  protected markDamaged(_kind: DamageKind, _rect?: Rect): void {
    throw new Error('SceneNode.markDamaged: not implemented (Phase 2)');
  }
  protected batch(_fn: () => void): void {
    throw new Error('SceneNode.batch: not implemented (Phase 2)');
  }

  setBounds(_next: Rect): void {
    throw new Error('SceneNode.setBounds: not implemented (Phase 2)');
  }

  adoptChild(_node: SceneNode): void {
    throw new Error('SceneNode.adoptChild: not implemented (Phase 2)');
  }
}
```

**`src/scene-root.ts`:**

```ts
import { SceneNode } from './scene-node';
import type { DirtyRegion, Rect } from './types';
import type { DirtyChannel, Scheduler } from '@dirtytalk/engine';

/**
 * Renderer interface: the spatial package ships this contract, not an implementation.
 * `paintRegion` is the bounding rect of the frame's paint damages (Phase 3 computes
 * it via `unionRects`). Keep this signature stable from scaffold onward so the
 * Phase 1 README examples don't drift from the Phase 3 implementation.
 */
export interface Renderer2D {
  beginFrame(paintRegion: Rect): void;
  endFrame(): void;
}

export interface SceneRootOptions {
  scheduler?: Scheduler;
}

export class SceneRoot extends SceneNode {
  paint(_layer: unknown): void {
    throw new Error('SceneRoot.paint: not implemented (Phase 3)');
  }

  constructor(_renderer: Renderer2D, _options?: SceneRootOptions) {
    super();
    throw new Error('SceneRoot: not implemented (Phase 3)');
  }

  get channel(): DirtyChannel<DirtyRegion> {
    throw new Error('SceneRoot.channel: not implemented (Phase 3)');
  }

  hitTest(_x: number, _y: number): SceneNode | null {
    throw new Error('SceneRoot.hitTest: not implemented (Phase 3)');
  }
}
```

**`src/pointer-router.ts`:**

```ts
import type { SceneRoot } from './scene-root';
import type { SceneNode } from './scene-node';

/** A minimal pointer event shape, surface-agnostic (works with DOM PointerEvent and synthetic). */
export interface SpatialPointerEvent {
  type: 'down' | 'move' | 'up' | 'cancel';
  x: number;
  y: number;
  buttons: number;
  pointerId: number;
}

export interface PointerHandler {
  onPointerDown?(e: SpatialPointerEvent): void;
  onPointerMove?(e: SpatialPointerEvent): void;
  onPointerUp?(e: SpatialPointerEvent): void;
  onPointerCancel?(e: SpatialPointerEvent): void;
}

export class PointerRouter {
  constructor(_root: SceneRoot) {
    throw new Error('PointerRouter: not implemented (Phase 4)');
  }

  dispatch(_e: SpatialPointerEvent): SceneNode | null {
    throw new Error('PointerRouter.dispatch: not implemented (Phase 4)');
  }
}
```

### `src/index.ts` — empty barrel today

```ts
// @dirtytalk/spatial — Phase 1+ tasks extend this barrel.
export type { Rect, DamageKind, Damage, DirtyRegion } from './types';
```

### `README.md` placeholder

```md
# @dirtytalk/spatial

Rect-based damage-tracking instantiation of @dirtytalk/engine. Implementation in progress — see `plans/dirtytalk-spatial/`.
```

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - `ls packages/dirtytalk-engine` works.
   - `pnpm-workspace.yaml` includes `packages/*` (existing engine package proves this).

2. **Implement.** Create every file in the owned-files list with the contents above.

3. **Verify.**
   - From repo root: `vp install`.
   - From `packages/dirtytalk-spatial/`: `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test` — passes with `--passWithNoTests`.
   - `vp run build` — produces `dist/index.{js,cjs,d.ts,d.cts}`. Run `vp run clean`.
   - `vp run verify` — publint clean.

5. **Commit.**

   ```
   chore(dirtytalk-spatial): scaffold package
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] All files listed in "Owned files" exist with the specified contents.
- [ ] `vp install` succeeds at repo root.
- [ ] `vp run {typecheck,lint,format:check,test,build,verify}` all pass.
- [ ] `dist/` is gitignored and not committed.
- [ ] No other package's files were modified.

---

## Pitfalls

- **Do not implement anything beyond stubs.** Each `throw new Error('not implemented (Phase N)')` is the contract that downstream agents grep for.
- **Single-entry `vite.config.ts`.** This package has one entry (`index`); don't copy engine's two-entry config. Trim the `primitives` declaration.
- **`node?: unknown` in `Damage`** is intentional — breaks the circular import that would happen if `types.ts` had to import `SceneNode`. Phase 2/3 narrows at use time with `as SceneNode | undefined` where appropriate.
- **`SceneRoot extends SceneNode`** — the stub uses `super()` and throws after, which is fine because the throw runs after the super-call. Don't try to "fix" by moving the throw before `super()` — that's illegal in TS.
- **`SpatialPointerEvent` not `PointerEvent`.** The DOM has its own `PointerEvent` type; collision would shadow it. Use a prefixed name.
- **Don't add a `<canvas>` import** anywhere. The package is DOM-agnostic. The browser-side glue lives in the eventual `insomni` renderer that consumes this.
- **`@dirtytalk/engine` workspace resolution.** If TS can't find the import, you skipped `vp install`. Run it from repo root.
