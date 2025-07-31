import { StorageAdapter } from './types';

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // Silently return null on read errors (e.g., security restrictions)
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Re-throw to let plugin handle the error
      throw new Error(
        `Failed to save to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Removal errors are not critical
      console.warn(`Failed to remove from localStorage: ${key}`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
    }
  }
}

/**
 * Browser sessionStorage adapter
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      throw new Error(
        `Failed to save to sessionStorage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from sessionStorage: ${key}`, error);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage', error);
    }
  }
}

/**
 * In-memory storage adapter for testing or environments without storage
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Get all stored data (useful for debugging)
   */
  getAll(): Record<string, string> {
    return Object.fromEntries(this.store);
  }
}

/**
 * Async storage adapter wrapper
 */
export class AsyncStorageAdapter implements StorageAdapter {
  constructor(
    private asyncStorage: {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
      removeItem: (key: string) => Promise<void>;
      clear?: () => Promise<void>;
    },
  ) {}

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.asyncStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, value);
    } catch (error) {
      throw new Error(
        `Failed to save to AsyncStorage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from AsyncStorage: ${key}`, error);
    }
  }

  async clear(): Promise<void> {
    if (this.asyncStorage.clear) {
      try {
        await this.asyncStorage.clear();
      } catch (error) {
        console.warn('Failed to clear AsyncStorage', error);
      }
    }
  }
}

/**
 * Get the default storage adapter based on environment
 */
export function getDefaultStorage(): StorageAdapter {
  // Browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalStorageAdapter();
  }

  // Fallback to in-memory
  return new InMemoryStorageAdapter();
}
