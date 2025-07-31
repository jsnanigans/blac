// Main plugin
export { PersistencePlugin } from './PersistencePlugin';

// Types
export type {
  StorageAdapter,
  SerializationOptions,
  PersistenceOptions,
  StorageMetadata,
} from './types';

// Storage adapters
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  InMemoryStorageAdapter,
  AsyncStorageAdapter,
  getDefaultStorage,
} from './storage-adapters';
