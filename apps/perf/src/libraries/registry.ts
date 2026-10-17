import type {
  ListLibrary,
  PureStateLibrary,
  RerenderLibrary,
} from '../shared/types';
import { BlacPropRows, BlacSubRows } from './blac/list';
import { blacPureState } from './blac/pure-state';
import { blacRerender } from './blac/rerender';
import { contextRerender } from './react-context/rerender';
import { ReduxPropRows, ReduxSubRows } from './redux-toolkit/list';
import { reduxToolkitPureState } from './redux-toolkit/pure-state';
import { reduxRerender } from './redux-toolkit/rerender';
import { ZustandPropRows, ZustandSubRows } from './zustand/list';
import { zustandPureState } from './zustand/pure-state';
import {
  zustandNoSelectorRerender,
  zustandSelectorRerender,
} from './zustand/rerender';

// Each library runs the list suite twice, once per row architecture, because
// the two have opposite cost profiles:
//
//   "(sub rows)"  — each row reads its item and the selection from the store.
//                   Only affected rows re-render, but mount pays one
//                   subscription per row.
//   "(prop rows)" — the parent reads everything and passes props down. Cheap
//                   mount, but every change re-renders the parent and compares
//                   every row.
//
// Compare like with like: "(sub rows)" against "(sub rows)".
export const listLibraries: ListLibrary[] = [
  { name: 'Blac (sub rows)', rows: 'sub rows', Component: BlacSubRows },
  { name: 'Zustand (sub rows)', rows: 'sub rows', Component: ZustandSubRows },
  {
    name: 'Redux Toolkit (sub rows)',
    rows: 'sub rows',
    Component: ReduxSubRows,
  },
  { name: 'Blac (prop rows)', rows: 'prop rows', Component: BlacPropRows },
  {
    name: 'Zustand (prop rows)',
    rows: 'prop rows',
    Component: ZustandPropRows,
  },
  {
    name: 'Redux Toolkit (prop rows)',
    rows: 'prop rows',
    Component: ReduxPropRows,
  },
];

export const rerenderLibraries: RerenderLibrary[] = [
  blacRerender,
  zustandSelectorRerender,
  zustandNoSelectorRerender,
  contextRerender,
  reduxRerender,
];

export const pureStateLibraries: PureStateLibrary[] = [
  blacPureState,
  zustandPureState,
  reduxToolkitPureState,
];
