# 03 — Bundle and packaging

## 1. Both packages exceed their size budgets

```
@blac/core  (ESM, brotli)              8.35 kB  limit 7.8 kB  (+548 B)
@blac/react (ESM, brotli, excl. peers) 5.4 kB   limit 3.5 kB  (+1.9 kB)
```

`size-limit` is configured but not wired into `verify`, `release:check`, or CI,
so the budgets are advisory. Add `pnpm size` to `release:check` and to the
workspace `verify` script so a regression fails the build.

## 2. The plugin system cannot be tree-shaken away

`StateContainerRegistry.ts:7` imports `createPluginManager`, and
`getPluginManager` is defined at the bottom of the same module (`:887`). Every
consumer that imports `Cubit` transitively pulls `PluginManager` (about 500
lines, 14 context methods, environment detection) into the bundle even when no
plugin is installed. The `@blac/core/plugins` subpath adds no benefit because
the barrel already exports the same symbols.

### Fix

Move `getPluginManager` and the lazy singleton into `src/plugins.ts`. The
registry never needs a reference to the plugin manager; the manager subscribes
to the registry, not the other way around. Then keep `getPluginManager` out of
the main barrel so it is only reachable via `@blac/core/plugins`.

## 3. Subpath exports duplicate the barrel

`debug`, `plugins`, `watch`, `types` all re-export symbols that are also in
`index.ts`. That doubles the public surface with no size or isolation benefit.
Pick one strategy:

- **Lean barrel**: `@blac/core` exports `Cubit`, `StateContainer`, `acquire`,
  `release`, `configureBlac`, `blac`, `watch`, types. Everything introspective
  (`globalRegistry`, `getStats`, `getRefIds`, `getInstancesMap`, symbols) lives
  only under `/debug` and `/plugins`. This is the option that helps size.
- **No subpaths** except `/testing`. Simpler, but keeps the fat barrel.

Whichever you pick, `api-extractor` should produce a report per entry and the
report should be committed (see [07 §4](./07-tests-and-tooling.md)).

## 4. Dev / prod conditions

The dist keeps `process.env.NODE_ENV` checks verbatim (12 `console.*` calls in
the registry chunk, the `APPLY_DEPS` collision scan, the args-mismatch
`structuralKey`, the emit-rate breaker). Bundlers with a define replace them;
plain ESM in the browser, Deno, and some test runners do not, and then
`process` is undefined and throws.

### Fix

Ship two builds and select with export conditions:

```json
"exports": {
  ".": {
    "import": {
      "types": "./dist/index.d.ts",
      "development": "./dist/index.dev.js",
      "default": "./dist/index.js"
    }
  }
}
```

`vp pack` can emit both with a `define` for `process.env.NODE_ENV`. The prod
build then has zero `console.*` and zero `process` references, and the dev
build keeps every warning.

## 5. `install()` logs unconditionally

`PluginManager.ts:139` and `:165` `console.log` on install/uninstall, and the
environment-mismatch path also logs. This is noise in production consoles and
test output. Gate behind the dev build or a `silent` option.

## 6. `dependencies` on `@dirtytalk/structural` is a workspace range

`"@dirtytalk/structural": "workspace:^"` publishes as `^0.0.8`. Because
structural is `0.x`, `^0.0.8` resolves to exactly `0.0.8`, so every structural
patch forces a core release. Either move structural to `>=0.1.0` semantics,
or version them together with a changeset `fixed` group so they cannot drift.

## 7. Build script fragility

Core `build` runs `vp pack && tsc -p tsconfig.build.json && for f in dist/*.d.ts; do cp ...`.
React does the equivalent with two hard-coded `cp`. A new entry point in
either package silently ships without a `.d.cts`. Use `vp pack`'s `dts`
option (currently `dts: false`) or `tsc` with `declarationDir` plus a small
script that mirrors every `.d.ts` to `.d.cts`.

## 8. `sideEffects: false` is not quite true

`StateContainerRegistry.ts` creates `globalRegistry` at module scope and the
registry constructor subscribes a `disposed` listener. `config.ts` creates
`globalConfig`. These are benign, but `sideEffects: false` tells bundlers they
may drop the module if its exports are unused, which would be fine today. If
you ever add module-level plugin installation or devtools auto-connect it
will silently disappear. Keep the flag, but keep module scope free of anything
that must run.

## 9. Stale aliases and setup files

Root `vite.config.ts`, `packages/blac-react/vite.config.ts`,
`vitest.config.compiler.ts`, `apps/examples/*`, and `packages/devtools-ui/tsconfig.json`
alias `@blac/preact` and `@blac/adapter`, and the root config lists
`packages/blac-preact/vitest-setup.ts` as a setup file. Neither package exists.
Remove the aliases and the setup entry; running `vp test` from the root with
the root config currently fails on the missing setup file.
