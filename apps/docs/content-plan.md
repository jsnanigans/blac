# BlaC Documentation Content Plan

## Structure Overview

```
/guide/          - Introduction and core concepts
/core/           - @blac/core package documentation
/react/          - @blac/react package documentation
/api/            - Auto-generated API reference (do not edit)
```

---

## Guide Section (`/guide/`)

### `/guide/introduction`

What is BlaC and why use it.

- What is BlaC (one paragraph)
- Key features list (type-safe, event-driven, auto-tracking, devtools)
- Not just a state manager: its a Pattern that allows you to forget about state management so that you can focus on building features.
- React integration: great performance, DX and flexibility. Enables complete separation of concerns in layers: [UI (react) | Business Logic (Blac) | Data (API/DB)]
- Focus on Testability: business logic can be tested in isolation without UI (no more react component or react hooks testing nightmares)
- Cubit pattern overview
- Link to getting started

---

## Core Section (`/core/`)

### `/core/getting-started`

Installation and first steps with @blac/core.

- Installation (`pnpm add @blac/core`)
- Basic Cubit example (counter)
- Link to React integration

### `/core/cubit`

Complete Cubit documentation.

- Purpose: simple state mutations
- Constructor and initial state (must be object)
- Arrow functions requirement for React
- State update methods: `emit()`, `update()`, `patch()`
- `patch()` shallow merge warning with example
- Computed getters
- Code example: form state

### `/core/configuration`

Class configuration with `@blac()` decorator.

- Decorator options: `isolated`, `keepAlive`, `excludeFromDevTools`
- Union type constraint (one option only)
- Function syntax alternative
- When to use each option

### `/core/instance-management`

Standalone functions for instance access.

- `acquire()` - ownership semantics
- `borrow()` - borrowing (throws)
- `borrowSafe()` - borrowing (returns result)
- `ensure()` - B2B communication
- `release()` - releasing ownership
- Utility functions: `hasInstance`, `getRefCount`, `getAll`, `forEach`, `clear`, `clearAll`, `getStats`
- Comparison table

### `/core/system-events`

Lifecycle events within a state container.

- `onSystemEvent()` method
- Available events: `stateChanged`, `propsUpdated`, `dispose`
- Payload types
- Example: cleanup on dispose

### `/core/logging`

Debugging and logging configuration.

- `configureLogger()` global setup
- Log levels: ERROR, WARN, INFO, DEBUG
- `createLogger()` for custom loggers
- Individual functions: `debug()`, `info()`, `warn()`, `error()`

### `/core/plugins`

Plugin system for extending BlaC.

- `BlacPlugin` interface
- Lifecycle hooks: `onInstall`, `onInstanceCreated`, `onStateChanged`, `onInstanceDisposed`, `onUninstall`
- `PluginContext` methods
- `globalRegistry.on()` for simple listeners
- Use cases: devtools, analytics, persistence

---

## React Section (`/react/`)

### `/react/getting-started`

Installation and first React integration.

- Installation (`pnpm add @blac/core @blac/react`)
- Basic `useBloc` example
- Auto-tracking explanation (one paragraph)

### `/react/use-bloc`

Complete useBloc hook documentation.

- Signature and return value `[state, bloc, ref]`
- Options table: `props`, `instanceId`, `dependencies`, `autoTrack`, `disableGetterCache`, `onMount`, `onUnmount`
- Examples for each option

### `/react/dependency-tracking`

How auto-tracking works and optimization.

- Proxy-based tracking explanation
- State property tracking
- Getter tracking
- Cross-bloc dependency tracking (`borrow()` in getters)
- Tracking modes: auto, manual, none
- Code examples for each mode

### `/react/use-bloc-actions`

Actions-only hook for components that don't read state.

- Purpose: no state subscription
- Signature
- Options (subset of useBloc)
- When to use
- Performance benefit

### `/react/shared-vs-isolated`

Instance sharing patterns.

- Shared instances (default): multiple components, same state
- Isolated instances (`@blac({ isolated: true })`): per-component state
- `instanceId` for named shared instances
- When to use each

### `/react/bloc-communication`

Patterns for inter-bloc communication.

- Pattern 1: Constructor dependencies (acquire + release)
- Pattern 2: Event handler borrowing (borrow())
- Pattern 3: Getter dependencies (auto-tracked)
- Pattern 4: Lazy/on-demand (ensure())
- Pattern 5: Shared services (keepAlive)
- Comparison table
- Real-world example: messenger app

### `/react/performance`

Performance optimization guide.

- Optimal property access (access only what you render)
- Avoiding destructuring and spreading
- Component splitting pattern
- Using `useBlocActions` for action-only components
- Getter caching behavior
- Manual dependencies when needed
- Common mistakes list

### `/react/overview`

Quick reference for React patterns.

- Shared vs isolated summary
- Tracking modes summary
- Link to detailed pages

---

## API Reference (`/api/`)

**Note: Auto-generated. Do not edit directly.**

- `/api/core` - @blac/core API
- `/api/core/registry` - Registry API
- `/api/core/plugins` - Plugin API
- `/api/core/adapter` - Framework adapter API
- `/api/core/logging` - Logging API
- `/api/core/utilities` - Utility functions
- `/api/react` - @blac/react API

---

## Content Guidelines

1. **Be concise** - No fluff, get to the point
2. **Code first** - Lead with code examples, explain after
3. **Consistent examples** - Use Counter, Todo, User, Form patterns throughout
4. **Link related pages** - Cross-reference where relevant
5. **No placeholder content** - Every page must have real content
6. **Arrow functions** - Always use arrow functions in examples (React compatibility)
