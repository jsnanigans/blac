import type { LibraryDefinition } from '../shared/types';
import { BlacFrameworkBenchmark } from './blac/FrameworkBenchmark';
import { ReduxToolkitFrameworkBenchmark } from './redux-toolkit/FrameworkBenchmark';
import { reduxToolkitPureState } from './redux-toolkit/pure-state';
import { ZustandFrameworkBenchmark } from './zustand/FrameworkBenchmark';
import { zustandPureState } from './zustand/pure-state';

export const libraries: LibraryDefinition[] = [
  {
    // Blac no longer participates in the pure-state tab — the previous
    // suite microbenchmarked `@blac/core/tracking` internals that were
    // deleted in the dirtytalk migration. The migration-specific
    // benchmark lives in `src/migration-bench/run.ts`; results in
    // `plans/blac-core-migration/_perf-results.md`.
    name: 'Blac',
    Component: BlacFrameworkBenchmark,
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
