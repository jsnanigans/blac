import {
  BlocPlugin,
  PluginCapabilities,
  ErrorContext,
  BlocBase,
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
  private saveTimer?: any;
  private isHydrated = false;
  private options: PersistenceOptions<TState>;

  constructor(options: PersistenceOptions<TState>) {
    this.options = options;
    this.key = options.key;
    this.metadataKey = `${options.key}__metadata`;
    this.storage = options.storage || getDefaultStorage();
    this.serialize = options.serialize || ((state) => JSON.stringify(state));
    this.deserialize = options.deserialize || ((data) => JSON.parse(data));
    this.debounceMs = options.debounceMs ?? 100;
  }

  async onAttach(bloc: BlocBase<TState>): Promise<void> {
    try {
      // Try migrations first
      if (this.options.migrations) {
        const migrated = await this.tryMigrations();
        if (migrated) {
          (bloc as any)._state = migrated;
          this.isHydrated = true;
          return;
        }
      }

      // Try to restore state from storage
      const storedData = await Promise.resolve(this.storage.getItem(this.key));
      if (storedData) {
        let state: TState;

        // Handle encryption
        if (this.options.encrypt) {
          const decrypted = await Promise.resolve(
            this.options.encrypt.decrypt(storedData),
          );
          state = this.deserialize(decrypted);
        } else {
          state = this.deserialize(storedData);
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

        // Restore state
        (bloc as any)._state = state;
        this.isHydrated = true;
      }
    } catch (error) {
      this.handleError(error as Error, 'load');
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
    // Don't save if we just hydrated
    if (!this.isHydrated) {
      this.isHydrated = true;
      return;
    }

    // Debounce saves
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
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

  private async saveState(state: TState): Promise<void> {
    try {
      let dataToStore: string;

      // Serialize state
      const serialized = this.serialize(state);

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
          const migrated = migration.transform
            ? migration.transform(parsed)
            : parsed;

          // Save migrated data
          await this.saveState(migrated);

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

