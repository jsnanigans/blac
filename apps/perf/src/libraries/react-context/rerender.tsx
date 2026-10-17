import React, { createContext, useContext, useState } from 'react';
import {
  WIDE_FIELDS,
  createNestedState,
  createWideState,
  fieldKey,
  readNested,
  toggledTheme,
  type NestedState,
  type RerenderLibrary,
  type WideState,
} from '../../shared/types';

const WideCtx = createContext<WideState>(createWideState());
const NestedCtx = createContext<NestedState>(createNestedState());

type SetState<S> = React.Dispatch<React.SetStateAction<S>>;

// Every consumer of a context re-renders on any change to its value.
export const contextRerender: RerenderLibrary = {
  name: 'React Context',
  create() {
    const setters: {
      wide?: SetState<WideState>;
      nested?: SetState<NestedState>;
    } = {};

    function Provider({ children }: { children: React.ReactNode }) {
      const [wide, setWide] = useState(createWideState);
      const [nested, setNested] = useState(createNestedState);
      setters.wide = setWide;
      setters.nested = setNested;
      return (
        <WideCtx.Provider value={wide}>
          <NestedCtx.Provider value={nested}>{children}</NestedCtx.Provider>
        </WideCtx.Provider>
      );
    }

    return {
      Provider,
      useField: (field) => useContext(WideCtx)[fieldKey(field)],
      useFields: (start, count) => {
        const s = useContext(WideCtx);
        return Array.from({ length: count }, (_, i) => s[fieldKey(start + i)]);
      },
      useFieldSum: () => {
        const s = useContext(WideCtx);
        let sum = 0;
        for (let i = 0; i < WIDE_FIELDS; i++) sum += s[fieldKey(i)];
        return sum;
      },
      useNested: (path) => readNested(useContext(NestedCtx), path),
      bump: (field) =>
        setters.wide?.((s) => ({
          ...s,
          [fieldKey(field)]: s[fieldKey(field)] + 1,
        })),
      toggleTheme: () => setters.nested?.(toggledTheme),
    };
  },
};
