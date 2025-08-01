# Persistence Plugin Architecture Improvements

## Current Issues

The persistence plugin's subscription architecture has several fundamental issues that compromise safety, maintainability, and correctness:

1. **Direct Internal Access**: Plugin directly manipulates private fields (`_state`, `_observer`)
2. **Race Conditions**: Flag-based concurrency control (`isHydrating`, `isSaving`)
3. **Ordering Violations**: Debounced saves can persist states out of order
4. **Silent Failures**: Errors during persistence are logged but not surfaced
5. **No Validation**: External state loaded without verification
6. **Tight Coupling**: Plugin implementation depends on internal bloc structure

## Proposed Improvements

### 1. Plugin API Contract

**Problem**: Direct field access violates encapsulation and least privilege principles  
**Solution**: Create controlled API methods for state manipulation

```typescript
interface PluginStateAPI<TState> {
  updateState(newState: TState, metadata: StateUpdateMetadata): void;
  getState(): TState;
  subscribeToChanges(handler: StateChangeHandler<TState>): Unsubscribe;
}

interface StateUpdateMetadata {
  source: 'plugin' | 'hydration' | 'migration';
  version?: number;
  timestamp: number;
}
```

### 2. State Machine for Operations

**Problem**: Boolean flags create race conditions during concurrent operations  
**Solution**: Implement proper state machine with atomic transitions

```typescript
enum PersistenceState {
  IDLE = 'IDLE',
  HYDRATING = 'HYDRATING',
  READY = 'READY',
  SAVING = 'SAVING',
  ERROR = 'ERROR',
}

class PersistenceStateMachine {
  private state: PersistenceState = PersistenceState.IDLE;

  transition(from: PersistenceState, to: PersistenceState): boolean {
    // Atomic compare-and-swap
    if (this.state === from) {
      this.state = to;
      return true;
    }
    return false;
  }
}
```

### 3. Event Sourcing for State Changes

**Problem**: Debouncing can cause out-of-order persistence  
**Solution**: Track all state changes with versions

```typescript
interface StateChange<TState> {
  version: number;
  timestamp: number;
  previousState: TState;
  newState: TState;
  metadata?: Record<string, unknown>;
}

class StateChangeLog<TState> {
  private changes: StateChange<TState>[] = [];
  private version = 0;

  append(change: Omit<StateChange<TState>, 'version'>): void {
    this.changes.push({ ...change, version: ++this.version });
  }

  getLatest(): StateChange<TState> | undefined {
    return this.changes[this.changes.length - 1];
  }
}
```

### 4. Explicit Error States

**Problem**: Failures are silent, users lose data without knowing  
**Solution**: Make persistence status observable

```typescript
interface PersistenceStatus {
  state: PersistenceState;
  lastSaveTime?: number;
  lastSaveVersion?: number;
  lastError?: PersistenceError;
  retryCount: number;
}

interface PersistenceError {
  type: 'save' | 'load' | 'migrate' | 'validate';
  message: string;
  timestamp: number;
  recoverable: boolean;
}

// Expose status to UI
class PersistencePlugin<TState> {
  getStatus(): PersistenceStatus {
    /* ... */
  }
  onStatusChange(handler: (status: PersistenceStatus) => void): Unsubscribe {
    /* ... */
  }
}
```

### 5. Validation Pipeline

**Problem**: No verification of loaded state integrity  
**Solution**: Mandatory validation before state mutations

```typescript
interface StateValidator<TState> {
  validate(state: unknown): state is TState;
  sanitize?(state: Partial<TState>): TState;
  getSchema?(): JsonSchema;
}

class PersistencePlugin<TState> {
  constructor(
    options: PersistenceOptions<TState> & {
      validator: StateValidator<TState>;
    },
  ) {
    // Validation required
  }

  private async loadState(): Promise<TState | null> {
    const raw = await this.storage.getItem(this.key);
    if (!raw) return null;

    const parsed = this.deserialize(raw);
    if (!this.validator.validate(parsed)) {
      throw new ValidationError('Invalid persisted state', parsed);
    }

    return parsed;
  }
}
```

### 6. Write-Ahead Logging

**Problem**: State can be lost during save failures  
**Solution**: Implement WAL pattern for durability

```typescript
class WriteAheadLog<TState> {
  private pending: StateChange<TState>[] = [];

  async append(change: StateChange<TState>): Promise<void> {
    // Write to WAL first
    await this.storage.setItem(
      `${this.key}.wal`,
      JSON.stringify([...this.pending, change]),
    );
    this.pending.push(change);
  }

  async commit(): Promise<void> {
    // Write actual state
    const latest = this.pending[this.pending.length - 1];
    await this.storage.setItem(this.key, JSON.stringify(latest.newState));

    // Clear WAL
    this.pending = [];
    await this.storage.removeItem(`${this.key}.wal`);
  }

  async recover(): Promise<StateChange<TState>[]> {
    // Recover from WAL on startup
    const wal = await this.storage.getItem(`${this.key}.wal`);
    return wal ? JSON.parse(wal) : [];
  }
}
```

## Implementation Priority

1. **Plugin API Contract** (High) - Foundation for other improvements
2. **Validation Pipeline** (High) - Critical for data integrity
3. **State Machine** (Medium) - Eliminates race conditions
4. **Error States** (Medium) - Improves user experience
5. **Event Sourcing** (Low) - Enhanced reliability
6. **Write-Ahead Logging** (Low) - For mission-critical applications

## Migration Strategy

1. Create new `PluginStateAPI` interface in core
2. Implement backward compatibility layer
3. Update PersistencePlugin to use new API
4. Deprecate direct field access
5. Remove compatibility layer in next major version

## Benefits

- **Safety**: Validation prevents corrupted state
- **Reliability**: Proper concurrency control and error handling
- **Observability**: Status monitoring for debugging
- **Maintainability**: Clear API boundaries
- **Correctness**: Ordered persistence with event sourcing
