# 00 — Scaffold the `@dirtytalk/engine` package

**Phase:** 0 (sequential — must commit before Phase 1)
**Model:** Sonnet 4.6
**Effort:** low (mechanical; care > depth)
**Estimated touch:** ~10 files created, all under `packages/dirtytalk-engine/`

---

## Goal

Stand up the package skeleton + all interface stubs so Phase 1 agents can fill in implementations in disjoint files without touching shared config.

After this task lands, the package compiles (with stub implementations that throw), `vp test` runs zero tests (no `.test.ts` files yet, by design), and `vp lint` is clean.

---

## Inputs — read these first

1. `dirtytalk/01-engine.md` — the spec you're scaffolding to.
2. `packages/blac-core/package.json` — template for the package metadata + scripts.
3. `packages/blac-core/vite.config.ts` — template for the build config (you'll simplify, no aliases needed).
4. `packages/blac-core/tsconfig.json` and `packages/blac-core/tsconfig.build.json` — TS config templates.
5. `packages/devtools-connect/` — a simpler reference (single-entry) if the blac-core multi-entry layout is too much.
6. `AGENTS.md` at repo root — vite-plus (`vp`) tooling rules.
7. `~/.claude/CLAUDE.md` — commit message format.
8. `pnpm-workspace.yaml` — confirm `packages/*` is already in the glob (it is).

---

## Owned files (your exclusive write set)

Create these. No other file may be touched.

```
packages/dirtytalk-engine/package.json
packages/dirtytalk-engine/tsconfig.json
packages/dirtytalk-engine/tsconfig.build.json
packages/dirtytalk-engine/vite.config.ts
packages/dirtytalk-engine/.gitignore
packages/dirtytalk-engine/src/index.ts
packages/dirtytalk-engine/src/primitives.ts        (stub)
packages/dirtytalk-engine/src/space.ts             (final — types only)
packages/dirtytalk-engine/src/scheduler.ts         (stub)
packages/dirtytalk-engine/src/dirty-channel.ts     (stub)
```

You may also create `packages/dirtytalk-engine/CHANGELOG.md` as an empty stub if changesets is configured to require one (check `.changeset/config.json`; skip if not).

---

## What each file must contain

### `package.json`

- `name`: `@dirtytalk/engine`
- `version`: `0.0.1`
- `type`: `"module"`
- `license`: `MIT`
- `author`: `Brendan Mullins <jsnanigans@gmail.com>` (match other packages)
- `repository`: `{ type: "git", url: "git+https://github.com/jsnanigans/blac.git", directory: "packages/dirtytalk-engine" }`
- `main`/`module`/`types`: as in blac-core (`./dist/index.cjs`, `./dist/index.js`, `./dist/index.d.ts`)
- `exports`: two entries
  - `"."` → full surface (`./dist/index.{js,cjs,d.ts,d.cts}`)
  - `"./primitives"` → just `Signal`/`Observable` (`./dist/primitives.{js,cjs,d.ts,d.cts}`)
- `typesVersions`: mirror the `./primitives` subpath
- `files`: `["dist", "README.md", "LICENSE"]`
- `sideEffects`: `false`
- `publishConfig`: `{ "access": "public" }`
- `scripts`: copy from blac-core verbatim where applicable — `dev`, `build`, `clean`, `format`, `format:check`, `lint`, `lint:fix`, `test`, `test:watch`, `coverage`, `verify`, `typecheck`, `prepublishOnly`, `deploy`. The `build` script must end with the `.d.ts → .d.cts` copy step for every `dist/*.d.ts` (see blac-core).
- `devDependencies`: `typescript: catalog:`, `vitest: catalog:`, `vite-plus: catalog:`, `publint: catalog:`. **No other deps. No runtime deps.**
- No `dependencies` field at all.
- `keywords`: `["reactive", "dirty-tracking", "signal", "scheduler", "engine"]`

### `vite.config.ts`

Copy structure from `packages/devtools-connect/vite.config.ts` (single-package simple version) but with **two `pack.entry`s** like blac-core's multi-entry:

```ts
pack: {
  entry: {
    index: 'src/index.ts',
    primitives: 'src/primitives.ts',
  },
  format: ['esm', 'cjs'],
  clean: false,
  dts: false,
  sourcemap: true,
  outExtensions({ format }) { return { js: format === 'es' ? '.js' : '.cjs' } },
},
```

`test` block: `{ environment: 'node', globals: true, include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'] }`. No jsdom — engine has no DOM.

No aliases needed (no internal deps).

### `tsconfig.json`

Extend `../../tsconfig.base.json`. `outDir: "./dist"`. `include: ["src/**/*"]`. `exclude: ["node_modules", "dist", "**/*.test.ts"]`. No `paths` entries needed.

### `tsconfig.build.json`

Extend the local `./tsconfig.json`. `rootDir: "./src"`, `noEmit: false`, `declaration: true`, `emitDeclarationOnly: true`, `outDir: "dist"`. `exclude` must drop `**/*.test.ts`.

### `.gitignore`

```
dist/
node_modules/
*.tsbuildinfo
coverage/
```

### `src/index.ts` — the package barrel

Re-export everything (final, not a stub):

```ts
export type { Observable } from './primitives';
export { Signal } from './primitives';

export type { Space } from './space';

export type { Scheduler } from './scheduler';
export {
  SyncScheduler,
  ManualScheduler,
  MicrotaskScheduler,
  RAFScheduler,
} from './scheduler';

export { DirtyChannel } from './dirty-channel';
```

### `src/primitives.ts` — STUB

```ts
export interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}

export class Signal<T> implements Observable<T> {
  constructor(_initial: T, _equals?: (a: T, b: T) => boolean) {
    throw new Error('Signal: not implemented (see plans/dirtytalk-engine/01-signal.md)');
  }
  get value(): T { throw new Error('not implemented'); }
  set value(_next: T) { throw new Error('not implemented'); }
  peek(): T { throw new Error('not implemented'); }
  subscribe(_cb: (value: T) => void): () => void { throw new Error('not implemented'); }
}
```

### `src/space.ts` — FINAL (interface only; no implementations live here)

```ts
/**
 * The algebra of "what changed" and "what I care about."
 *
 * Both are values of type `Region`. Implementations live in consuming
 * libraries (e.g. RectSpace in insomni, PathSetSpace in blac).
 *
 * Contracts:
 *   - `union(empty(), r)` equals `r`.
 *   - `intersects(empty(), _)` returns false.
 *   - All operations must be pure: same inputs, same output, no side effects.
 */
export interface Space<Region> {
  empty(): Region;
  isEmpty(r: Region): boolean;
  union(a: Region, b: Region): Region;
  intersects(interest: Region, dirty: Region): boolean;
}
```

### `src/scheduler.ts` — STUB

```ts
export interface Scheduler {
  request(flush: () => void): void;
  cancel?(): void;
}

const NOT_IMPLEMENTED = 'not implemented (see plans/dirtytalk-engine/01-schedulers.md)';

export class SyncScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
}

export class ManualScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  pump(): void { throw new Error(NOT_IMPLEMENTED); }
}

export class MicrotaskScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  cancel(): void { throw new Error(NOT_IMPLEMENTED); }
}

export class RAFScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  cancel(): void { throw new Error(NOT_IMPLEMENTED); }
}
```

### `src/dirty-channel.ts` — STUB

```ts
import type { Space } from './space';
import type { Scheduler } from './scheduler';

export class DirtyChannel<Region> {
  constructor(_space: Space<Region>, _scheduler: Scheduler) {
    throw new Error('DirtyChannel: not implemented (see plans/dirtytalk-engine/01-dirty-channel.md)');
  }

  mark(_r: Region): void { throw new Error('not implemented'); }

  subscribe(
    _interest: () => Region,
    _cb: (dirty: Region) => void,
  ): () => void {
    throw new Error('not implemented');
  }
}
```

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** Run `git status` from repo root. If dirty, **stop and report** — do not proceed. Run `ls packages/dirtytalk-engine` — must not exist.
2. **Implement.** Create all owned files per spec above. Do not edit anything outside the package directory.
3. **Verify (typecheck + lint).**
   - From repo root: `vp install` (picks up the new workspace member).
   - `cd packages/dirtytalk-engine && vp run typecheck` — must pass.
   - `vp run lint` — must pass (the stubs use `_` prefix for unused params; oxlint should be happy).
4. **Verify (build).** `vp run build` from inside the package. Must produce `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`, plus the `primitives.*` siblings. Then `vp run verify` (publint) — must be clean.
5. **Test.** `vp run test` — must report 0 tests found (intentional). Not an error.
6. **Cleanup.** Delete `dist/` before commit (`vp run clean`). Leave `node_modules/` alone.
7. **Commit.** Single commit with message:

   ```
   feat(dirtytalk-engine): scaffold @dirtytalk/engine package
   ```

   Body (wrap at 72): one short paragraph noting that this lands package metadata, build config, and stubs only — implementations follow in phase 1.

   **No co-author trailer.** Per `~/.claude/CLAUDE.md`, do not add Claude as co-author.

---

## Acceptance criteria

- [ ] `packages/dirtytalk-engine/` exists with the owned files listed.
- [ ] `vp run typecheck` passes inside the package.
- [ ] `vp run lint` passes inside the package.
- [ ] `vp run build` produces dual ESM+CJS outputs for both `index` and `primitives` entries, plus `.d.ts` and `.d.cts` for each.
- [ ] `vp run verify` (publint) passes.
- [ ] `vp run test` runs with 0 tests, exits 0.
- [ ] `git log -1 --stat` shows exactly the owned files, no others.
- [ ] No runtime dependencies in `package.json`.

---

## Pitfalls / non-obvious notes

- **`.d.cts` duplication.** Vite-plus emits `.d.ts` only; the build script must `cp` each to `.d.cts`. Copy the `for f in dist/*.d.ts; do cp "$f" "${f%.d.ts}.d.cts"; done` line from `packages/blac-core/package.json` verbatim.
- **`environment: 'node'`** in vitest. Engine has zero DOM coupling. Don't pull in jsdom.
- **Stubs throw, don't return.** This ensures Phase 1 agents can `import` them safely at type-check time but any accidental use blows up loudly.
- **Do not write a README in this task.** That's `01-readme.md`'s job (Phase 1, parallel).
- **`src/index.ts` is final, not a stub.** It references symbols that exist (the stub classes/types are real exports). Don't put it in the "to be filled in" list.
- **No tests in this commit.** Phase 1 agents own their test files. Adding any `.test.ts` here pre-empts them and risks merge friction.
- **`pnpm-workspace.yaml`** already includes `packages/*` — no edit needed.
