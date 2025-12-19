# Plan: Move Static Methods to Standalone Functions

## Overview

Move static methods from `StateContainer` to standalone functions for a more functional, tree-shakeable API.

## Current Static Methods

| Method | Category | Action |
|--------|----------|--------|
| `__excludeFromDevTools` | Property | Keep as static |
| `enableStackTrace` | Property | Keep as static |
| `getRegistry()` | Registry | Move to function |
| `setRegistry()` | Registry | Move to function |
| `register()` | Registry | Move to function |
| `acquire()` | Instance | Move to function |
| `borrow()` | Instance | Move to function |
| `borrowSafe()` | Instance | Move to function |
| `ensure()` | Instance | Move to function |
| `release()` | Instance | Move to function |
| `getAll()` | Instance | Move to function |
| `forEach()` | Instance | Move to function |
| `clear()` | Instance | Move to function |
| `clearAllInstances()` | Registry | Move to function |
| `getStats()` | Registry | Move to function |
| `getRefCount()` | Instance | Move to function |
| `hasInstance()` | Instance | Move to function |
| `waitUntil()` | Instance | Already a function |

## New API Design

### Before (static methods)
```typescript
const bloc = UserBloc.acquire();
const other = UserBloc.borrow();
UserBloc.release();
const safe = UserBloc.borrowSafe();
const exists = UserBloc.hasInstance();
```

### After (standalone functions)
```typescript
import { acquire, borrow, release, borrowSafe, hasInstance } from '@blac/core';

const bloc = acquire(UserBloc);
const other = borrow(UserBloc);
release(UserBloc);
const safe = borrowSafe(UserBloc);
const exists = hasInstance(UserBloc);
```

## File Structure

```
packages/blac/src/
├── registry/
│   ├── index.ts              # Barrel export
│   ├── acquire.ts            # acquire function
│   ├── borrow.ts             # borrow, borrowSafe functions
│   ├── ensure.ts             # ensure function
│   ├── release.ts            # release function
│   ├── queries.ts            # hasInstance, getRefCount, getAll, forEach
│   ├── management.ts         # clear, clearAll, register
│   └── config.ts             # getRegistry, setRegistry, getStats
├── waitUntil/                # Already exists
│   └── ...
└── index.ts                  # Update exports
```

## Function Signatures

### Instance Lifecycle

```typescript
// acquire.ts
function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  options?: {
    props?: ExtractProps<T>;
  }
): InstanceType<T>

// borrow.ts
function borrow<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string
): InstanceType<T>

function borrowSafe<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string
): { error: Error; instance: null } | { error: null; instance: InstanceType<T> }

// ensure.ts
function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string
): InstanceType<T>

// release.ts
function release<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  forceDispose?: boolean
): void
```

### Queries

```typescript
// queries.ts
function hasInstance<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string
): boolean

function getRefCount<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string
): number

function getAll<T extends StateContainerConstructor>(
  BlocClass: T
): InstanceType<T>[]

function forEach<T extends StateContainerConstructor>(
  BlocClass: T,
  callback: (instance: InstanceType<T>) => void
): void
```

### Management

```typescript
// management.ts
function clear<T extends StateContainerConstructor>(BlocClass: T): void
function clearAll(): void
function register<T extends StateContainerConstructor>(
  BlocClass: T,
  isolated?: boolean
): void
```

### Configuration

```typescript
// config.ts
function getRegistry(): StateContainerRegistry
function setRegistry(registry: StateContainerRegistry): void
function getStats(): { registeredTypes: number; totalInstances: number; typeBreakdown: Record<string, number> }
```

## Implementation Steps

### Phase 1: Create new functions (non-breaking)
1. Create `packages/blac/src/registry/` directory
2. Implement all functions delegating to `globalRegistry`
3. Export from `packages/blac/src/index.ts`
4. Both APIs work in parallel

### Phase 2: Update internal usages
1. Update `useBloc.ts` and `useBlocActions.ts` to use new functions
2. Update `waitUntil.ts` to use new functions
3. Update devtools-ui blocs

### Phase 3: Update tests and examples
1. Update test files to use new functions
2. Update example apps

### Phase 4: Remove static methods (breaking)
1. Remove static methods from `StateContainer`
2. Update CLAUDE.md documentation
3. Update any remaining references

## Migration Guide

```typescript
// Before
import { Cubit } from '@blac/core';

class UserBloc extends Cubit<UserState> { ... }

const bloc = UserBloc.acquire();
UserBloc.release();

// After
import { Cubit, acquire, release } from '@blac/core';

class UserBloc extends Cubit<UserState> { ... }

const bloc = acquire(UserBloc);
release(UserBloc);
```

## Benefits

1. **Tree-shakeable**: Unused functions won't be bundled
2. **Functional style**: Aligns with modern JS patterns
3. **Cleaner class definitions**: StateContainer is simpler
4. **Easier testing**: Functions are easier to mock
5. **Consistency**: Matches `waitUntil` pattern already in use

## Decisions

1. **No deprecated aliases** - clean break, remove static methods immediately
2. **Export registry access** - `getRegistry`/`setRegistry` are public API
3. **Keep current names** - no renaming during this refactor
