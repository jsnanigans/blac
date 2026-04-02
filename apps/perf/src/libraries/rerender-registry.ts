import type { RerenderLibraryDefinition } from '../shared/types';
import { BlacRerenderBenchmark } from './blac/RerenderBenchmark';
import { ZustandSelectorRerenderBenchmark } from './zustand/RerenderBenchmark';
import { ZustandNoSelectorRerenderBenchmark } from './zustand-no-selector/RerenderBenchmark';
import { ContextRerenderBenchmark } from './react-context/RerenderBenchmark';
import { ReduxRerenderBenchmark } from './redux-toolkit/RerenderBenchmark';

export const rerenderLibraries: RerenderLibraryDefinition[] = [
  { name: 'Blac', Component: BlacRerenderBenchmark },
  { name: 'Zustand (selector)', Component: ZustandSelectorRerenderBenchmark },
  {
    name: 'Zustand (no selector)',
    Component: ZustandNoSelectorRerenderBenchmark,
  },
  { name: 'React Context', Component: ContextRerenderBenchmark },
  { name: 'Redux Toolkit', Component: ReduxRerenderBenchmark },
];
