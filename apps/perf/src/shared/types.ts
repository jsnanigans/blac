import type { ProfilerOnRenderCallback } from 'react';

export interface DataItem {
  id: number;
  label: string;
}

export interface BenchmarkAPI {
  run: () => void;
  runLots: () => void;
  add: () => void;
  update: () => void;
  clear: () => void;
  swapRows: () => void;
  select: (id: number) => void;
  remove: (id: number) => void;
}

export type OperationName =
  | 'run'
  | 'runLots'
  | 'add'
  | 'update'
  | 'clear'
  | 'swapRows';

export const OPERATION_LABELS: Record<OperationName, string> = {
  run: 'Create 1,000 rows',
  runLots: 'Create 10,000 rows',
  add: 'Append 1,000 rows',
  update: 'Update every 10th row',
  clear: 'Clear',
  swapRows: 'Swap rows',
};

export interface ProfilerMetric {
  id: string;
  phase: Parameters<ProfilerOnRenderCallback>[1];
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

export interface TimingResult {
  endToEnd: number;
  profiler: ProfilerMetric[];
}

export interface StatResult {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  stddev: number;
  samples: number;
}

export interface OperationResult {
  operation: OperationName;
  endToEnd: StatResult;
  renderActual: StatResult;
  renderBase: StatResult;
}

export interface LibraryResults {
  library: string;
  operations: OperationResult[];
  timestamp: number;
}

export interface PureStateResult {
  library: string;
  operation: string;
  opsPerSecond: number;
  avgDuration: StatResult;
}

export interface WideState {
  field0: number;
  field1: number;
  field2: number;
  field3: number;
  field4: number;
  field5: number;
  field6: number;
  field7: number;
  field8: number;
  field9: number;
  field10: number;
  field11: number;
  field12: number;
  field13: number;
  field14: number;
  field15: number;
  field16: number;
  field17: number;
  field18: number;
  field19: number;
}

export function createWideState(): WideState {
  return {
    field0: 0,
    field1: 0,
    field2: 0,
    field3: 0,
    field4: 0,
    field5: 0,
    field6: 0,
    field7: 0,
    field8: 0,
    field9: 0,
    field10: 0,
    field11: 0,
    field12: 0,
    field13: 0,
    field14: 0,
    field15: 0,
    field16: 0,
    field17: 0,
    field18: 0,
    field19: 0,
  };
}

export interface NestedState {
  a: { b: { c: { value: number } } };
}

export function createNestedState(): NestedState {
  return { a: { b: { c: { value: 0 } } } };
}

export interface CounterState {
  count: number;
}

export interface PureStateBenchmark {
  name: string;
  setup: () => unknown;
  operations: Record<string, (handle: unknown) => void>;
  teardown?: (handle: unknown) => void;
}

export interface LibraryDefinition {
  name: string;
  Component: React.ComponentType<{ onReady: (api: BenchmarkAPI) => void }>;
  pureState: PureStateBenchmark;
}
