---
outline: [2, 3]
---

# Framework Adapter

Utilities for building framework integrations

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Class:** [`DependencyManager`](#dependencymanager)

## Classes

### DependencyManager

Manages subscriptions to state container dependencies. Provides efficient sync mechanism to add/remove subscriptions as dependencies change between callback invocations.

```typescript
export declare class DependencyManager
```

**Methods:**

#### `add`

Add a single dependency subscription.

```typescript
add(dep: StateContainerInstance, onChange: () => void): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dep` | `StateContainerInstance` |  |
| `onChange` | `() => void` |  |

#### `cleanup`

Clean up all active subscriptions.

```typescript
cleanup(): void;
```

#### `getDependencies`

Get the current set of dependencies.

```typescript
getDependencies(): Set<StateContainerInstance>;
```

#### `has`

Check if a dependency is currently subscribed.

```typescript
has(dep: StateContainerInstance): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dep` | `StateContainerInstance` |  |

#### `sync`

Sync subscriptions with a new set of dependencies. Adds subscriptions for new deps, removes subscriptions for stale deps.

```typescript
sync(newDeps: Set<StateContainerInstance>, onChange: () => void, exclude?: StateContainerInstance): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `newDeps` | `Set<StateContainerInstance>` | The new set of dependencies to subscribe to |
| `onChange` | `() => void` | Callback to invoke when any dependency changes |
| `exclude` | `StateContainerInstance` | Optional instance to exclude from subscriptions (e.g., primary bloc) |

**Returns:** true if the dependency set changed, false if unchanged

---

