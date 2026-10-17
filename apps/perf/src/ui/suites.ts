import {
  measureRetainedMemory,
  runList,
  runPureState,
  runRerender,
  type Progress,
  type RunConfig,
} from '../harness/runners';
import {
  listLibraries,
  pureStateLibraries,
  rerenderLibraries,
} from '../libraries/registry';
import { LIST_OPS } from '../shared/list';
import { PURE_OPS } from '../shared/pure';
import { RERENDER_SCENARIOS } from '../shared/rerender';
import type {
  ListResults,
  PureStateResult,
  RerenderResults,
  RetainedMemoryResult,
} from '../shared/types';

const RETAINED_MEMORY = 'retained memory (slow, Chrome only)';

export type SuiteKey = 'list' | 'rerender' | 'pure';

export interface Suite {
  label: string;
  libraries: string[];
  itemsLabel: string;
  items: { key: string; label: string }[];
  defaults: RunConfig;
}

export const SUITES: Record<SuiteKey, Suite> = {
  list: {
    label: 'List',
    libraries: listLibraries.map((l) => l.name),
    itemsLabel: 'Operations',
    items: Object.entries(LIST_OPS).map(([key, o]) => ({
      key,
      label: o.label,
    })),
    defaults: { warmup: 5, samples: 20 },
  },
  rerender: {
    label: 'Re-render',
    libraries: rerenderLibraries.map((l) => l.name),
    itemsLabel: 'Scenarios',
    items: Object.entries(RERENDER_SCENARIOS).map(([key, s]) => ({
      key,
      label: s.label,
    })),
    defaults: { warmup: 5, samples: 20 },
  },
  pure: {
    label: 'Pure state',
    libraries: pureStateLibraries.map((l) => l.name),
    itemsLabel: 'Operations',
    items: [...PURE_OPS, RETAINED_MEMORY].map((key) => ({ key, label: key })),
    defaults: { warmup: 100, samples: 1000 },
  },
};

export const SUITE_KEYS = Object.keys(SUITES) as SuiteKey[];

export interface Selection {
  libs: Set<string>;
  items: Set<string>;
  config: RunConfig;
}

export interface Results {
  list: ListResults[];
  rerender: RerenderResults[];
  pure: PureStateResult[];
  memory: RetainedMemoryResult[];
}

export const NO_RESULTS: Results = {
  list: [],
  rerender: [],
  pure: [],
  memory: [],
};

export async function runSuite(
  key: SuiteKey,
  sel: Selection,
  host: HTMLElement,
  progress: Progress,
): Promise<Partial<Results>> {
  const items = SUITES[key].items
    .map((i) => i.key)
    .filter((k) => sel.items.has(k));
  const picked = <T extends { name: string }>(libs: T[]): T[] =>
    libs.filter((l) => sel.libs.has(l.name));

  switch (key) {
    case 'list': {
      const list: ListResults[] = [];
      for (const lib of picked(listLibraries)) {
        list.push(await runList(lib, items, sel.config, host, progress));
      }
      return { list };
    }
    case 'rerender': {
      const rerender: RerenderResults[] = [];
      for (const lib of picked(rerenderLibraries)) {
        rerender.push(
          await runRerender(lib, items, sel.config, host, progress),
        );
      }
      return { rerender };
    }
    case 'pure': {
      const pure: PureStateResult[] = [];
      const memory: RetainedMemoryResult[] = [];
      for (const lib of picked(pureStateLibraries)) {
        pure.push(...(await runPureState(lib, items, sel.config, progress)));
        if (!sel.items.has(RETAINED_MEMORY)) continue;
        const m = await measureRetainedMemory(lib, progress);
        if (m) memory.push(m);
      }
      return { pure, memory };
    }
  }
}
