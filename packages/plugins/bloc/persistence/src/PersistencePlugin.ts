import {
  BlocPlugin,
  PluginCapabilities,
  ErrorContext,
  BlocBase,
  StandardSchemaV1,
} from '@blac/core';
import { PersistenceOptions, StorageAdapter, StorageMetadata } from './types';
import { getDefaultStorage } from './storage-adapters';

/**
 * BlaC persistence plugin for automatic state persistence
 */
export class PersistencePlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'persistence';
  readonly version = '2.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  private storage: StorageAdapter;
  private key: string;
  private metadataKey: string;
  private serialize: (state: TState) => string;
  private deserialize: (data: string) => TState;
  private debounceMs: number;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private isHydrating = false;
  private isSaving = false;
  private options: PersistenceOptions<TState>;
  private schema?: StandardSchemaV1<any, TState> | null;
  private validateOnSave: boolean;
  private validateOnRestore: boolean;
  private bloc?: BlocBase<TState>;

  constructor(options: PersistenceOptions<TState>) {
    this.options = options;
    this.key = options.key;
    this.metadataKey = `${options.key}__metadata`;
    this.storage = options.storage || getDefaultStorage();
    this.serialize = options.serialize || ((state) => JSON.stringify(state));
    this.deserialize = options.deserialize || ((data) => JSON.parse(data));
    this.debounceMs = options.debounceMs ?? 100;
    this.schema = options.schema;
    this.validateOnSave = options.validation?.onSave ?? true;
    this.validateOnRestore = options.validation?.onRestore ?? true;
  }

  async onAttach(bloc: BlocBase<TState>): Promise<void> {
    this.bloc = bloc;

    if (this.isHydrating) {
      return; // Prevent concurrent hydration
    }

    this.isHydrating = true;

    try {
      // Try migrations first
      if (this.options.migrations) {
        const migrated = await this.tryMigrations();
        if (migrated) {
          // Use protected emit method through type assertion
          (bloc as any).emit(migrated);
          return;
        }
      }

      // Try to restore state from storage
      const storedData = await Promise.resolve(this.storage.getItem(this.key));
      if (storedData) {
        let state: TState | Partial<TState>;

        // Handle encryption
        if (this.options.encrypt) {
          const decrypted = await Promise.resolve(
            this.options.encrypt.decrypt(storedData),
          );
          state = this.deserialize(decrypted);
        } else {
          state = this.deserialize(storedData);
        }

        // Validate restored state
        if (this.validateOnRestore) {
          const schema = this.getSchema(bloc);
          if (schema) {
            const result = schema['~standard'].validate(state);

            if (result instanceof Promise) {
              throw new Error(
                'Async validation not supported in persistence plugin',
              );
            }

            if ('issues' in result) {
              const error = new Error(
                `Persisted state validation failed: ${result.issues?.length || 0} issue(s)`,
              );
              this.handleError(error, 'load');
              return; // Don't restore invalid state
            }

            // Use validated state (may have coerced values)
            state = result.value;
          }
        }

        // Validate version if specified
        if (this.options.version) {
          const metadata = await this.loadMetadata();
          if (metadata && metadata.version !== this.options.version) {
            console.warn(
              `Version mismatch for ${this.key}: stored=${metadata.version}, current=${this.options.version}`,
            );
            // You might want to handle version migration here
          }
        }

        // Handle selective persistence
        if (this.options.select && this.options.merge) {
          const mergedState = this.options.merge(
            state as Partial<TState>,
            bloc.state,
          );
          // Use protected emit method through type assertion
          (bloc as any).emit(mergedState);
        } else {
          // Restore full state
          // Use protected emit method through type assertion
          (bloc as any).emit(state);
        }
      }
    } catch (error) {
      this.handleError(error as Error, 'load');
    } finally {
      this.isHydrating = false;
    }
  }

  onDetach(): void {
    // Clear any pending save
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  onStateChange(previousState: TState, currentState: TState): void {
    // Don't save while hydrating
    if (this.isHydrating) {
      return;
    }

    // Debounce saves
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }

    if (this.debounceMs > 0) {
      this.saveTimer = setTimeout(() => {
        void this.saveState(currentState);
      }, this.debounceMs);
    } else {
      void this.saveState(currentState);
    }
  }

  onError(error: Error, context: ErrorContext): void {
    console.error(`Persistence plugin error during ${context.phase}:`, error);
  }

  /**
   * Get effective schema (plugin schema or bloc schema)
   */
  private getSchema(bloc: BlocBase<TState>): StandardSchemaV1<any, TState> | undefined {
    // If plugin explicitly sets schema to null, disable validation
    if (this.schema === null) {
      return undefined;
    }

    // If plugin provides schema, use it (override bloc's schema)
    if (this.schema !== undefined) {
      return this.schema;
    }

    // Otherwise, try to get bloc's schema
    return bloc.schema as StandardSchemaV1<any, TState> | undefined;
  }

  private async saveState(state: TState): Promise<void> {
    if (this.isSaving) {
      // Queue another save after current one completes
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
      this.saveTimer = setTimeout(() => {
        void this.saveState(state);
      }, this.debounceMs || 10);
      return;
    }

    this.isSaving = true;

    try {
      let dataToStore: string;

      // Handle selective persistence
      let stateToSave = this.options.select
        ? (this.options.select(state) ?? state)
        : state;

      // Validate before saving
      if (this.validateOnSave && this.bloc) {
        const schema = this.getSchema(this.bloc);
        if (schema) {
          const result = schema['~standard'].validate(stateToSave);

          if (result instanceof Promise) {
            throw new Error(
              'Async validation not supported in persistence plugin',
            );
          }

          if ('issues' in result) {
            const error = new Error(
              `State validation failed before save: ${result.issues?.length || 0} issue(s)`,
            );
            this.handleError(error, 'save');
            return; // Don't save invalid state
          }

          // Use validated state
          stateToSave = result.value as TState;
        }
      }

      // Serialize state (ensure it's the full type, not partial)
      const serialized = this.serialize(stateToSave as TState);

      // Handle encryption
      if (this.options.encrypt) {
        dataToStore = await Promise.resolve(
          this.options.encrypt.encrypt(serialized),
        );
      } else {
        dataToStore = serialized;
      }

      // Save state
      await Promise.resolve(this.storage.setItem(this.key, dataToStore));

      // Save metadata if version is specified
      if (this.options.version) {
        await this.saveMetadata({
          version: this.options.version,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.handleError(error as Error, 'save');
    } finally {
      this.isSaving = false;
    }
  }

  private async tryMigrations(): Promise<TState | null> {
    if (!this.options.migrations) return null;

    for (const migration of this.options.migrations) {
      try {
        const oldData = await Promise.resolve(
          this.storage.getItem(migration.from),
        );
        if (oldData) {
          const parsed = JSON.parse(oldData);
          let migrated = migration.transform
            ? migration.transform(parsed)
            : parsed;

          // Validate migrated data if schema provided
          if (migration.schema) {
            const result = migration.schema['~standard'].validate(migrated);

            if (result instanceof Promise) {
              throw new Error(
                'Async validation not supported in persistence migrations',
              );
            }

            if ('issues' in result) {
              throw new Error(
                `Migration validation failed: ${result.issues?.length || 0} issue(s)`,
              );
            }

            // Use validated migrated data
            migrated = result.value;
          }

          // Save migrated data to new key directly (bypass saveState to avoid timing issues)
          const serialized = this.serialize(migrated);
          await Promise.resolve(this.storage.setItem(this.key, serialized));

          // Remove old data
          await Promise.resolve(this.storage.removeItem(migration.from));

          return migrated;
        }
      } catch (error) {
        this.handleError(error as Error, 'migrate');
      }
    }

    return null;
  }

  private async loadMetadata(): Promise<StorageMetadata | null> {
    try {
      const data = await Promise.resolve(
        this.storage.getItem(this.metadataKey),
      );
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveMetadata(metadata: StorageMetadata): Promise<void> {
    try {
      await Promise.resolve(
        this.storage.setItem(this.metadataKey, JSON.stringify(metadata)),
      );
    } catch {
      // Metadata save failure is not critical
    }
  }

  private handleError(
    error: Error,
    operation: 'save' | 'load' | 'migrate',
  ): void {
    if (this.options.onError) {
      this.options.onError(error, operation);
    } else {
      console.error(`PersistencePlugin ${operation} error:`, error);
    }
  }

  /**
   * Clear stored state
   */
  async clear(): Promise<void> {
    try {
      await Promise.resolve(this.storage.removeItem(this.key));
      await Promise.resolve(this.storage.removeItem(this.metadataKey));
    } catch (error) {
      this.handleError(error as Error, 'save');
    }
  }
}
