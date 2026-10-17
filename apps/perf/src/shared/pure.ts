import type { PureOp } from './types';

/** Types an op's handle from its `setup`. */
export const op = <H>(o: PureOp<H>): PureOp => o as PureOp;

export interface PureCategory {
  name: string;
  ops: string[];
  /** False when the libraries have no equivalent work to compare. */
  compare: boolean;
}

export const PURE_CATEGORIES: PureCategory[] = [
  {
    name: 'List updates (no subscribers)',
    ops: ['create 1k', 'append 1k', 'update every 10th', 'clear'],
    compare: true,
  },
  {
    name: 'Update patterns',
    ops: [
      'redundant emit',
      'redundant patch',
      'patch 1 of 20 fields',
      'nested object update',
      'batch rapid updates',
      'same-tick burst 1000 (tracked consumer)',
    ],
    compare: true,
  },
  {
    name: 'Notification',
    ops: [
      'notify 100 subscribers',
      'subscriber with computed filter',
      'multi-store coordination',
      '1 of 1,000 row subscribers',
    ],
    compare: true,
  },
  {
    name: 'Reads',
    ops: [
      'read 20 fields (baseline)',
      'getter track simple',
      'getter track wide aggregate',
    ],
    compare: true,
  },
  {
    name: 'Registry lifecycle (Blac only)',
    ops: ['acquire/release cycle', 'instance create/dispose'],
    compare: false,
  },
];

export const PURE_OPS = PURE_CATEGORIES.flatMap((c) => c.ops);

export const ROWS = 1000;
/** Row updates per `1 of 1,000 row subscribers` sample. */
export const ROW_UPDATES = 100;
