import { Cubit, acquire, release } from '@blac/core';
import { useBloc } from '@blac/react';
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

class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
  bump = (field: number): void => {
    const key = fieldKey(field);
    this.patch({ [key]: this.state[key] + 1 });
  };
}

class NestedBloc extends Cubit<NestedState> {
  constructor() {
    super(createNestedState());
  }
  toggleTheme = (): void => this.emit(toggledTheme(this.state));
}

// Consumers read plain state; auto-tracking records exactly those paths.
export const blacRerender: RerenderLibrary = {
  name: 'Blac',
  create() {
    // Held for the mount so consumers share one live instance.
    const wide = acquire(WideBloc);
    const nested = acquire(NestedBloc);
    return {
      useField: (field) => useBloc(WideBloc)[0][fieldKey(field)],
      useFields: (start, count) => {
        const [s] = useBloc(WideBloc);
        return Array.from({ length: count }, (_, i) => s[fieldKey(start + i)]);
      },
      useFieldSum: () => {
        const [s] = useBloc(WideBloc);
        let sum = 0;
        for (let i = 0; i < WIDE_FIELDS; i++) sum += s[fieldKey(i)];
        return sum;
      },
      useNested: (path) => readNested(useBloc(NestedBloc)[0], path),
      bump: wide.bump,
      toggleTheme: nested.toggleTheme,
      dispose: () => {
        release(WideBloc);
        release(NestedBloc);
      },
    };
  },
};
