import type { StandardSchemaV1 } from '@blac/core';

/**
 * Storage adapter interface for persistence
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  clear?(): void | Promise<void>;
}

/**
 * Serialization functions
 */
export interface SerializationOptions<T> {
  serialize?: (state: T) => string;
  deserialize?: (data: string) => T;
}

/**
 * Persistence plugin configuration
 */
export interface PersistenceOptions<T> extends SerializationOptions<T> {
  /**
   * Storage key for this bloc's state
   */
  key: string;

  /**
   * Storage adapter (defaults to localStorage if available)
   */
  storage?: StorageAdapter;

  /**
   * Debounce time in milliseconds for saving state
   * @default 100
   */
  debounceMs?: number;

  /**
   * Whether to migrate data from old keys
   */
  migrations?: PersistenceMigration<T>[];

  /**
   * Version for data schema
   */
  version?: number;

  /**
   * Whether to encrypt the stored data
   */
  encrypt?: {
    encrypt: (data: string) => string | Promise<string>;
    decrypt: (data: string) => string | Promise<string>;
  };

  /**
   * Called when persistence fails
   */
  onError?: (error: Error, operation: 'save' | 'load' | 'migrate') => void;

  /**
   * Selectively persist only parts of the state
   * Return the parts to persist, or undefined to persist everything
   */
  select?: (state: T) => Partial<T> | undefined;

  /**
   * Merge persisted partial state with current state
   * Used when select is provided
   */
  merge?: (persisted: Partial<T>, current: T) => T;

  /**
   * Schema for state validation
   * - If provided: Use this schema (overrides bloc's schema)
   * - If undefined: Use bloc's schema if available
   * - If null: Disable validation even if bloc has schema
   */
  schema?: StandardSchemaV1<any, T> | null;

  /**
   * When to validate persisted state
   */
  validation?: {
    /**
     * Validate before saving state
     * @default true (if schema exists)
     */
    onSave?: boolean;

    /**
     * Validate after restoring state
     * @default true (if schema exists)
     */
    onRestore?: boolean;
  };
}

/**
 * Migration configuration
 */
export interface PersistenceMigration<T> {
  /**
   * Old storage key to migrate from
   */
  from: string;

  /**
   * Transform function to convert old data to new format
   */
  transform?: (oldData: any) => T;

  /**
   * Optional schema to validate migration output
   */
  schema?: StandardSchemaV1<any, T>;
}

/**
 * Storage metadata
 */
export interface StorageMetadata {
  version?: number;
  timestamp: number;
  checksum?: string;
}
