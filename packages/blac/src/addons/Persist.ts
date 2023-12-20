import { BlocBase, BlocInstanceId } from '../BlocBase';
import { Cubit } from '../Cubit';
import BlacAddon, { BlacAddonEmit, BlacAddonInit } from './BlacAddon';

export function Persist(
  options: {
    /**
     * @default 'blac'
     */
    localStoragePrefix?: string;
    /**
     * @default the bloc's id
     */
    localStorageKey?: string;
    /**
     * Used when the value is not found in localStorage
     */
    defaultValue?: unknown;
  } = {},
): BlacAddon {
  const {
    localStoragePrefix = 'blac',
    localStorageKey,
    defaultValue,
  } = options;

  const getFromLocalStorage = (id: string | BlocInstanceId): unknown => {
    console.log(localStoragePrefix, id);
    const value = localStorage.getItem(`${localStoragePrefix}:${id}`);
    if (!value) {
      return defaultValue;
    }

    try {
      const p = JSON.parse(JSON.parse(value));
      return p.persist;
    } catch (e) {
      return value;
    }
  };

  const onInit: BlacAddonInit = (e) => {
    const id = localStorageKey ?? e.id;

    const value = getFromLocalStorage(id);
    if (typeof value !== undefined) {
      e.emit(value);
    }
  };

  let currentCachedValue = '';
  const onEmit: BlacAddonEmit = ({ newState, cubit }) => {
    const id = localStorageKey ?? cubit.id;

    const newValue = JSON.stringify(`{"persist": ${newState}}`);

    if (newValue !== currentCachedValue) {
      localStorage.setItem(`${localStoragePrefix}:${id}`, newValue);
      currentCachedValue = newValue;
    }
  };

  return {
    name: 'Persist',
    onInit,
    onEmit,
  };
}
