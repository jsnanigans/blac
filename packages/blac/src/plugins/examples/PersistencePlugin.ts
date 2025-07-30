import { BlocPlugin, PluginCapabilities, ErrorContext } from '../core/types';
import { BlocBase } from '../../BlocBase';

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Example bloc-specific persistence plugin
 */
export class PersistencePlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'persistence';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false
  };
  
  private storage: StorageAdapter;
  private key: string;
  private serialize: (state: TState) => string;
  private deserialize: (data: string) => TState;
  private saveDebounceMs: number;
  private saveTimer?: any;
  
  constructor(options: {
    key: string;
    storage?: StorageAdapter;
    serialize?: (state: TState) => string;
    deserialize?: (data: string) => TState;
    saveDebounceMs?: number;
  }) {
    this.key = options.key;
    this.storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : new InMemoryStorage());
    this.serialize = options.serialize || ((state) => JSON.stringify(state));
    this.deserialize = options.deserialize || ((data) => JSON.parse(data));
    this.saveDebounceMs = options.saveDebounceMs ?? 100;
  }
  
  onAttach(bloc: BlocBase<TState>): void {
    // Try to restore state from storage
    try {
      const savedData = this.storage.getItem(this.key);
      if (savedData) {
        const restoredState = this.deserialize(savedData);
        // Use internal method to set initial state
        (bloc as any)._state = restoredState;
        (bloc as any)._oldState = restoredState;
      }
    } catch (error) {
      console.error(`Failed to restore state from storage for key '${this.key}':`, error);
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
    // Debounce saves to avoid excessive writes
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      try {
        const serialized = this.serialize(currentState);
        this.storage.setItem(this.key, serialized);
      } catch (error) {
        console.error(`Failed to persist state for key '${this.key}':`, error);
      }
    }, this.saveDebounceMs);
  }
  
  onError(error: Error, context: ErrorContext): void {
    console.error(`Persistence plugin error during ${context.phase}:`, error);
  }
}

/**
 * Simple in-memory storage for testing
 */
class InMemoryStorage implements StorageAdapter {
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
}