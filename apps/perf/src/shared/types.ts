import type React from 'react';

export interface StatResult {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  stddev: number;
  samples: number;
}

// ── List suite (js-framework-benchmark style) ──

export interface DataItem {
  id: number;
  label: string;
  /** Used only by implementations that keep the selection on the row. */
  selected?: boolean;
}

/** Actions every list implementation exposes to the runner. */
export interface ListAPI {
  run: () => void;
  runLots: () => void;
  add: () => void;
  updateEvery10th: () => void;
  updateRow: (id: number) => void;
  select: (id: number) => void;
  swapRows: () => void;
  remove: (id: number) => void;
  clear: () => void;
  idAt: (index: number) => number;
}

export type RowArchitecture = 'sub rows' | 'prop rows';

export interface ListLibrary {
  name: string;
  rows: RowArchitecture;
  Component: React.ComponentType<{ onReady: (api: ListAPI) => void }>;
}

export interface ListOpResult {
  op: string;
  time: StatResult;
  render: StatResult;
}

export interface ListResults {
  library: string;
  rows: RowArchitecture;
  ops: ListOpResult[];
}

// ── Re-render suite ──

export type NestedPath = 'name' | 'age' | 'theme' | 'lang';

/**
 * One mounted store, with a hook per consumer shape. Each hook reads only
 * what its consumer renders, in the library's idiomatic way.
 */
export interface RerenderStore {
  Provider?: React.ComponentType<{ children: React.ReactNode }>;
  useField(field: number): number;
  useFields(start: number, count: number): readonly number[];
  useFieldSum(): number;
  useNested(path: NestedPath): string | number;
  bump: (field: number) => void;
  toggleTheme: () => void;
  dispose?: () => void;
}

export interface RerenderLibrary {
  name: string;
  create: () => RerenderStore;
}

export interface RerenderScenarioResult {
  scenario: string;
  renders: StatResult;
  optimalRenders: number;
  time: StatResult;
}

export interface RerenderResults {
  library: string;
  scenarios: RerenderScenarioResult[];
}

// ── Pure-state suite ──

export interface PureOp<H = unknown> {
  /** Builds this op's stores and data; runs before every sample, untimed. */
  setup: () => H;
  run: (handle: H) => void;
  teardown?: (handle: H) => void;
}

export interface PureStateLibrary {
  name: string;
  ops: Record<string, PureOp>;
  /**
   * Create `n` minimal live instances and return a function that releases
   * them. Used to measure retained bytes per instance.
   */
  retain?: (n: number) => () => void;
}

export interface PureStateResult {
  library: string;
  op: string;
  time: StatResult;
  /** Back-to-back op calls per timed sample; `time` is per call. */
  repetitions: number;
}

export interface RetainedMemoryResult {
  library: string;
  instances: number;
  bytesPerInstance: StatResult;
}

// ── Shared state shapes ──

export const WIDE_FIELDS = 20;

export type WideState = Record<`field${number}`, number>;

export const fieldKey = (i: number): `field${number}` => `field${i}`;

export function createWideState(): WideState {
  const state: WideState = {};
  for (let i = 0; i < WIDE_FIELDS; i++) state[fieldKey(i)] = 0;
  return state;
}

export interface NestedState {
  user: {
    profile: { name: string; age: number };
    settings: { theme: string; lang: string };
  };
}

export function createNestedState(): NestedState {
  return {
    user: {
      profile: { name: 'Alice', age: 30 },
      settings: { theme: 'dark', lang: 'en' },
    },
  };
}

export function readNested(s: NestedState, path: NestedPath): string | number {
  switch (path) {
    case 'name':
      return s.user.profile.name;
    case 'age':
      return s.user.profile.age;
    case 'theme':
      return s.user.settings.theme;
    case 'lang':
      return s.user.settings.lang;
  }
}

export function toggledTheme(s: NestedState): NestedState {
  return {
    user: {
      ...s.user,
      settings: {
        ...s.user.settings,
        theme: s.user.settings.theme === 'dark' ? 'light' : 'dark',
      },
    },
  };
}
