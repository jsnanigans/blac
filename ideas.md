# Ideas & Improvements

Observations from reviewing all packages, examples, and docs.

## Documentation

### Missing pages

- **Migration guide (v1 → v2)**: No upgrade path documented. Users on v1 have no way to know what changed, what's deprecated, or how to migrate.
- **Tutorial / walkthrough**: The guide goes concept → reference but never walks someone through building a small app end-to-end. A "Build a todo app" or "Build a chat app" tutorial would bridge the gap between Quick Start and the reference pages.
- **FAQ / Troubleshooting**: Common pitfalls (e.g. "why is my component re-rendering?", "why is my instance disposed immediately?") are not addressed anywhere.

### Existing page improvements

- **Introduction**: Could include a brief comparison with other state management libraries (Zustand, Jotai, Redux Toolkit) — just a positioning table, not a full comparison. Helps tech leads evaluating BlaC.
- **Getting Started**: Step 4 (business logic) jumps to a new example (TodoCubit) instead of building on the Counter. Could be more cohesive.
- **API reference pages**: Some are auto-generated feeling (just listing exports). Could use more inline examples and "when to use" guidance. `api/core/adapter.md` in particular is very internal — unclear who it's for.
- **Plugin Authoring**: Missing a complete plugin example from scratch to installed. The analytics example is inline but never shows installation.

### Cross-linking

- Many pages end with "See also" links, but the graph is incomplete. For example:
  - `core/watch.md` doesn't link to `guide/patterns.md` (which now covers watch patterns)
  - `core/system-events.md` doesn't mention the persist plugin's hydration events
  - `plugins/persistence.md` doesn't link back to `core/system-events.md` for the hydration lifecycle

## Examples App

### Gaps

- No example demonstrates **error boundaries** or recovery patterns.
- No example shows **server-side rendering** or **SSR hydration** patterns.
- The **Bloc** pattern (as opposed to Cubit) is never demonstrated. If Bloc is intentionally not a first-class concept, the docs should say so explicitly.
- No example showing **multiple plugins** working together (e.g., persist + devtools + logging in one app).

### Polish

- Example 02 (async/feed) has all components in one file (`FeedDemo.tsx`). Breaking into separate files would better match the pattern the other examples establish.
- The messenger example is excellent but has no documentation or README explaining its architecture. It's the most complete real-world example but you have to read all the code to understand the patterns.

## Core Package

### API design

- `ensure()` and `borrow()` are exported as standalone functions, but `depend()` is only a method on StateContainer. This asymmetry could confuse users looking for `depend` as an import.
- `borrowSafe` returns `{ error, instance }` — the `error` field is a full Error object, but in practice you only check truthiness. Consider whether a simpler `instance | null` return would be more ergonomic (breaking change, but worth considering for v3).

### Developer experience

- Error messages when `borrow()` throws could include the class name and instance key to help debugging.
- The `@blac()` decorator requires TypeScript experimental decorators. The docs should mention this requirement and show the `tsconfig.json` setting needed.

## DevTools

### Documentation gaps (addressed in this PR)

- The in-app UI component (`BlacDevtoolsUi`) was completely undocumented.
- Picture-in-Picture mode was undocumented.
- The Alt+D keyboard shortcut was undocumented.
- Time-travel capability was undocumented.
- The Chrome extension setup was a single sentence.

### Feature ideas

- **State export/import**: Let users export the full state snapshot as JSON and import it later for reproducing bugs.
- **Performance tab**: Show render counts per component, state change frequency per instance, and highlight hot paths.
- **Dependency graph**: Visualize which blocs depend on which (from `depend()` declarations). This data is already available via `instance.dependencies`.

## Plugin System

- The `environment` option on plugin installation is a nice idea but the docs don't explain how BlaC determines the current environment. Is it `process.env.NODE_ENV`? A manual flag? This needs to be documented.
- No guidance on plugin ordering or whether installation order matters for lifecycle callbacks.

## React Package

- `configureBlacReact` is documented but there's no guidance on where to call it (before any `useBloc`? in a top-level file? in main.tsx?).
- The `ref` (third return value from `useBloc`) is barely documented. What is it? When would you use it?

## Preact Package

- Existed in the codebase with zero documentation until now.
- Should clarify compatibility — does it work with Preact's compat layer for React libraries? Or is it standalone?
