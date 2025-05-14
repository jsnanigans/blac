import { BlocBase, BlocInstanceId } from '../BlocBase';
import BlacAddon, { BlacAddonEmit, BlacAddonInit } from './BlacAddon';

type StorageType = 'localStorage' | 'sessionStorage';

function getStorage(type: StorageType): Storage {
  switch (type) {
    case 'localStorage':
      return localStorage;
    case 'sessionStorage':
      return sessionStorage;
    default:
      return localStorage;
  }
}

/**
 * Persist addon
 *
 * @param options
 * @returns BlacAddon
 */
export function Persist(
  options: {
    /**
     * @default 'blac'
     */
    keyPrefix?: string;
    /**
     * @default the bloc's id
     */
    keyName?: string;
    /**
     * Used when the value is not found in storage
     */
    defaultValue?: unknown;

    /**
     * @default 'localStorage'
     * @see StorageType
     */
    storageType?: StorageType;
  } = {},
): BlacAddon {
  const {
    keyPrefix = 'blac',
    keyName,
    defaultValue,
    storageType = 'localStorage',
  } = options;

  const fullKey = (id: string | BlocInstanceId) => `${keyPrefix}:${id}`;

  const getFromLocalStorage = (id: string | BlocInstanceId): unknown => {
    const value = getStorage(storageType).getItem(fullKey(id));
    if (typeof value !== 'string') {
      return defaultValue;
    }

    try {
      const p = JSON.parse(value) as { v: unknown };
      if (typeof p.v !== 'undefined') {
        return p.v;
      } else {
        return defaultValue;
      }
    } catch (e) {
      return defaultValue;
    }
  };

  const onInit: BlacAddonInit = (e: BlocBase<any>) => {
    const id = keyName ?? e._id;

    const value = getFromLocalStorage(id);
    if (typeof value !== undefined) {
      e._pushState(value, null);
    }
  };

  let currentCachedValue = '';
  const onEmit: BlacAddonEmit = ({ newState, cubit }) => {
    const id = keyName ?? cubit._id;

    const newValue = JSON.stringify({ v: newState });

    if (newValue !== currentCachedValue) {
      getStorage(storageType).setItem(fullKey(id), newValue);
      currentCachedValue = newValue;
    }
  };

  return {
    name: 'Persist',
    onInit,
    onEmit,
  };
}
