import type { IndexedDbPersistAdapter, PersistedRecord } from './types';

interface IndexedDbAdapterOptions {
  databaseName?: string;
  storeName?: string;
}

export class NativeIndexedDbAdapter implements IndexedDbPersistAdapter {
  private readonly databaseName: string;
  private readonly storeName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbAdapterOptions = {}) {
    this.databaseName = options.databaseName ?? 'blac-persist';
    this.storeName = options.storeName ?? 'blac-state';
  }

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async get<TPayload = unknown>(
    key: string,
  ): Promise<PersistedRecord<TPayload> | null> {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const result = await this.request<PersistedRecord<TPayload> | undefined>(
      store.get(key),
    );
    await this.transactionComplete(tx);
    return result ?? null;
  }

  async put<TPayload = unknown>(
    record: PersistedRecord<TPayload>,
  ): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).put(record);
    await this.transactionComplete(tx);
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).delete(key);
    await this.transactionComplete(tx);
  }

  async clear(): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).clear();
    await this.transactionComplete(tx);
  }

  private async open(): Promise<IDBDatabase> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available in this environment');
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error ?? new Error('Failed to open IndexedDB'));
        };
      });
    }

    return this.dbPromise;
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private transactionComplete(tx: IDBTransaction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      tx.onerror = () =>
        reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
  }
}

export function createNativeIndexedDbAdapter(
  options?: IndexedDbAdapterOptions,
): IndexedDbPersistAdapter {
  return new NativeIndexedDbAdapter(options);
}
