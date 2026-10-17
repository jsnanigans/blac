import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import React from 'react';
import { Provider, shallowEqual, useSelector } from 'react-redux';
import {
  WIDE_FIELDS,
  createNestedState,
  createWideState,
  fieldKey,
  readNested,
  type NestedState,
  type RerenderLibrary,
  type WideState,
} from '../../shared/types';

const wideSlice = createSlice({
  name: 'wide',
  initialState: createWideState(),
  reducers: {
    bump(state, action: PayloadAction<number>) {
      state[fieldKey(action.payload)] += 1;
    },
  },
});

const nestedSlice = createSlice({
  name: 'nested',
  initialState: createNestedState(),
  reducers: {
    toggleTheme(state) {
      const settings = state.user.settings;
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    },
  },
});

interface RootState {
  wide: WideState;
  nested: NestedState;
}

export const reduxRerender: RerenderLibrary = {
  name: 'Redux Toolkit',
  create() {
    const store = configureStore({
      reducer: { wide: wideSlice.reducer, nested: nestedSlice.reducer },
      middleware: (getDefault) =>
        getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    return {
      Provider: ({ children }) => <Provider store={store}>{children}</Provider>,
      useField: (field) =>
        useSelector((s: RootState) => s.wide[fieldKey(field)]),
      useFields: (start, count) =>
        useSelector(
          (s: RootState) =>
            Array.from(
              { length: count },
              (_, i) => s.wide[fieldKey(start + i)],
            ),
          shallowEqual,
        ),
      useFieldSum: () =>
        useSelector((s: RootState) => {
          let sum = 0;
          for (let i = 0; i < WIDE_FIELDS; i++) sum += s.wide[fieldKey(i)];
          return sum;
        }),
      useNested: (path) =>
        useSelector((s: RootState) => readNested(s.nested, path)),
      bump: (field) => store.dispatch(wideSlice.actions.bump(field)),
      toggleTheme: () => store.dispatch(nestedSlice.actions.toggleTheme()),
    };
  },
};
