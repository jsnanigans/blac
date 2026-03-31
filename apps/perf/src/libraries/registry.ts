import type { LibraryDefinition } from '../shared/types';
import { BlacFrameworkBenchmark } from './blac/FrameworkBenchmark';
import { blacPureState } from './blac/pure-state';
import { ReduxToolkitFrameworkBenchmark } from './redux-toolkit/FrameworkBenchmark';
import { reduxToolkitPureState } from './redux-toolkit/pure-state';
import { ZustandFrameworkBenchmark } from './zustand/FrameworkBenchmark';
import { zustandPureState } from './zustand/pure-state';

export const libraries: LibraryDefinition[] = [
  {
    name: 'Blac',
    Component: BlacFrameworkBenchmark,
    pureState: blacPureState,
  },
  {
    name: 'Zustand',
    Component: ZustandFrameworkBenchmark,
    pureState: zustandPureState,
  },
  {
    name: 'Redux Toolkit',
    Component: ReduxToolkitFrameworkBenchmark,
    pureState: reduxToolkitPureState,
  },
];
