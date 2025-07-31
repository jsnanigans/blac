import { StorageAdapter } from './types';

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('LocalStorage setItem error:', error);
      throw error;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('LocalStorage clear error:', error);
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
      console.error('SessionStorage getItem error:', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('SessionStorage setItem error:', error);
      throw error;
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('SessionStorage removeItem error:', error);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('SessionStorage clear error:', error);
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
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    if (this.asyncStorage.clear) {
      try {
        await this.asyncStorage.clear();
      } catch (error) {
        console.error('AsyncStorage clear error:', error);
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
