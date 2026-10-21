import type { IndexedDbPersistAdapter, PersistedRecord } from './types';

const DEFAULT_PREFIX = 'blac-persist:';

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Synchronous adapter over `localStorage` / `sessionStorage`. */
export class WebStorageAdapter implements IndexedDbPersistAdapter {
  private readonly storage: Storage | undefined;
  private readonly prefix: string;

  constructor(options: { storage?: Storage; prefix?: string } = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
  }

  isAvailable(): boolean {
    return this.storage !== undefined;
  }

  private get store(): Storage {
    if (!this.storage) {
      throw new Error('Web storage is not available in this environment');
    }
    return this.storage;
  }

  get<TPayload = unknown>(key: string): PersistedRecord<TPayload> | null {
    const raw = this.store.getItem(this.prefix + key);
    return raw === null ? null : (JSON.parse(raw) as PersistedRecord<TPayload>);
  }

  put<TPayload = unknown>(record: PersistedRecord<TPayload>): void {
    this.store.setItem(this.prefix + record.id, JSON.stringify(record));
  }

  delete(key: string): void {
    this.store.removeItem(this.prefix + key);
  }

  clear(): void {
    const storage = this.store;
    const owned: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) owned.push(key);
    }
    for (const key of owned) storage.removeItem(key);
  }
}

export function createWebStorageAdapter(options?: {
  storage?: Storage;
  prefix?: string;
}): IndexedDbPersistAdapter {
  return new WebStorageAdapter(options);
}
