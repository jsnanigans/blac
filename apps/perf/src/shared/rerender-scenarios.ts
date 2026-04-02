import type { RerenderScenario } from './types';

export interface ScenarioConfig {
  scenario: RerenderScenario;
  consumerCount: number;
  optimalRenders: number;
  description: string;
}

export const SCENARIO_CONFIGS: Record<RerenderScenario, ScenarioConfig> = {
  singleField: {
    scenario: 'singleField',
    consumerCount: 20,
    optimalRenders: 1,
    description: '20 fields, 20 consumers each reading 1 field, update field0',
  },
  manyConsumers: {
    scenario: 'manyConsumers',
    consumerCount: 100,
    optimalRenders: 5,
    description: '20 fields, 100 consumers (5 per field), update field0',
  },
  nestedPaths: {
    scenario: 'nestedPaths',
    consumerCount: 4,
    optimalRenders: 1,
    description: 'Nested state, 4 consumers on different paths, update theme',
  },
  mixedReads: {
    scenario: 'mixedReads',
    consumerCount: 15,
    optimalRenders: 7,
    description:
      '15 consumers with varied read widths (1/4/20 fields), update field0',
  },
  unrelatedUpdate: {
    scenario: 'unrelatedUpdate',
    consumerCount: 10,
    optimalRenders: 0,
    description: '10 consumers reading fields 0-9, update field15 (unread)',
  },
};

export const ALL_RERENDER_SCENARIOS: RerenderScenario[] = [
  'singleField',
  'manyConsumers',
  'nestedPaths',
  'mixedReads',
  'unrelatedUpdate',
];
