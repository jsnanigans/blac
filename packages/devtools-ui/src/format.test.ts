import type { LogEntry } from '@blac/devtools-connect/client';
import {
  ago,
  instanceCopy,
  instanceKey,
  keyLabel,
  logRows,
  monogram,
} from './format';

const entry = (
  key: number,
  id: string,
  at: number,
  kind: LogEntry['kind'] = 'changed',
): LogEntry => ({ key, kind, id, className: 'C', name: id, at });

describe('ago', () => {
  it('rounds to the largest unit', () => {
    expect(ago(0, 2000)).toBe('just now');
    expect(ago(0, 42_000)).toBe('42s ago');
    expect(ago(0, 125_000)).toBe('2m ago');
    expect(ago(0, 7_200_000)).toBe('2h ago');
  });
});

describe('logRows', () => {
  it('folds a burst of one instance and keeps others apart', () => {
    const rows = logRows([
      entry(1, 'a', 0, 'created'),
      entry(2, 'a', 100),
      entry(3, 'a', 600),
      entry(4, 'b', 700),
      entry(5, 'a', 800),
      entry(6, 'a', 3000),
    ]);

    expect(rows.map((r) => [r.entry.key, r.count])).toEqual([
      [6, 1],
      [5, 1],
      [4, 1],
      [3, 2],
      [1, 1],
    ]);
  });
});

describe('instance labels', () => {
  it('splits key and copy suffix', () => {
    const id = 'FormCubit:default#useBloc-12';
    expect(instanceKey({ id, className: 'FormCubit' })).toBe('default');
    expect(instanceCopy(id)).toBe('12');
    expect(instanceCopy('FormCubit:a')).toBeUndefined();
  });

  it('compacts JSON keys and builds monograms', () => {
    expect(keyLabel('{"id":"01a1e9fa-b135-754e-93d7-402213c41520"}')).toBe(
      'id 01a1e9fa…1520',
    );
    expect(keyLabel('main')).toBe('main');
    expect(monogram('ChatComposerCubit')).toBe('CC');
    expect(monogram('FeatureFlags')).toBe('FF');
    expect(monogram('TodoBloc')).toBe('TO');
  });
});
