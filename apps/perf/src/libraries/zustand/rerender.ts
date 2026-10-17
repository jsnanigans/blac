import { createStore, useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  WIDE_FIELDS,
  createNestedState,
  createWideState,
  fieldKey,
  readNested,
  toggledTheme,
  type NestedState,
  type RerenderLibrary,
  type RerenderStore,
  type WideState,
} from '../../shared/types';

const sumFields = (s: WideState): number => {
  let sum = 0;
  for (let i = 0; i < WIDE_FIELDS; i++) sum += s[fieldKey(i)];
  return sum;
};

const fieldsFrom = (s: WideState, start: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => s[fieldKey(start + i)]);

function createStores() {
  const wide = createStore<WideState>(createWideState);
  const nested = createStore<NestedState>(createNestedState);
  const actions: Pick<RerenderStore, 'bump' | 'toggleTheme'> = {
    bump: (field) =>
      wide.setState((s) => ({ [fieldKey(field)]: s[fieldKey(field)] + 1 })),
    toggleTheme: () => nested.setState(toggledTheme),
  };
  return { wide, nested, actions };
}

export const zustandSelectorRerender: RerenderLibrary = {
  name: 'Zustand (selector)',
  create() {
    const { wide, nested, actions } = createStores();
    return {
      ...actions,
      useField: (field) => useStore(wide, (s) => s[fieldKey(field)]),
      useFields: (start, count) =>
        useStore(
          wide,
          useShallow((s) => fieldsFrom(s, start, count)),
        ),
      useFieldSum: () => useStore(wide, sumFields),
      useNested: (path) => useStore(nested, (s) => readNested(s, path)),
    };
  },
};

export const zustandNoSelectorRerender: RerenderLibrary = {
  name: 'Zustand (no selector)',
  create() {
    const { wide, nested, actions } = createStores();
    return {
      ...actions,
      useField: (field) => useStore(wide)[fieldKey(field)],
      useFields: (start, count) => fieldsFrom(useStore(wide), start, count),
      useFieldSum: () => sumFields(useStore(wide)),
      useNested: (path) => readNested(useStore(nested), path),
    };
  },
};
