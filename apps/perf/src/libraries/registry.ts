import type { LibraryDefinition } from '../shared/types';
import {
  BlacFrameworkBenchmark,
  BlacPropDrilledFrameworkBenchmark,
} from './blac/FrameworkBenchmark';
import { blacPureState } from './blac/pure-state';
import {
  ReduxToolkitFrameworkBenchmark,
  ReduxToolkitPerRowFrameworkBenchmark,
} from './redux-toolkit/FrameworkBenchmark';
import { reduxToolkitPureState } from './redux-toolkit/pure-state';
import {
  ZustandFrameworkBenchmark,
  ZustandPerRowFrameworkBenchmark,
} from './zustand/FrameworkBenchmark';
import { zustandPureState } from './zustand/pure-state';

// Each library is registered twice for the React benchmark, once per row
// architecture, because the two have opposite cost profiles and comparing
// across them is meaningless:
//
//   "(prop rows)" — parent holds `selected` and passes `isSelected` down.
//                   Cheap mount, but a select re-renders the parent and diffs
//                   every row.
//   "(sub rows)"  — each row subscribes and reads `selected` itself.
//                   Only affected rows re-render, but mount pays one
//                   subscription per row.
//
// Compare like with like: "(prop rows)" against "(prop rows)".
// Pure-state results are identical for both variants of a library, so only the
// "(sub rows)" entry carries a `pureState` — otherwise every pure-state op
// would be measured and reported twice.
export const libraries: LibraryDefinition[] = [
  {
    name: 'Blac (sub rows)',
    Component: BlacFrameworkBenchmark,
    pureState: blacPureState,
  },
  {
    name: 'Blac (prop rows)',
    Component: BlacPropDrilledFrameworkBenchmark,
  },
  {
    name: 'Zustand (sub rows)',
    Component: ZustandPerRowFrameworkBenchmark,
    pureState: zustandPureState,
  },
  {
    name: 'Zustand (prop rows)',
    Component: ZustandFrameworkBenchmark,
  },
  {
    name: 'Redux Toolkit (sub rows)',
    Component: ReduxToolkitPerRowFrameworkBenchmark,
    pureState: reduxToolkitPureState,
  },
  {
    name: 'Redux Toolkit (prop rows)',
    Component: ReduxToolkitFrameworkBenchmark,
  },
];
