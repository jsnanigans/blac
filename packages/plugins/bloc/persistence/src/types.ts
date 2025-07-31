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
  migrations?: {
    from: string;
    transform?: (oldData: any) => T;
  }[];

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
}

/**
 * Storage metadata
 */
export interface StorageMetadata {
  version?: number;
  timestamp: number;
  checksum?: string;
}
