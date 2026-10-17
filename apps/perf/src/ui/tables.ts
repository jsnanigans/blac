import { LIST_OPS } from '../shared/list';
import { PURE_CATEGORIES } from '../shared/pure';
import { RERENDER_SCENARIOS } from '../shared/rerender';
import { cv, formatBytes, formatMs } from '../shared/stats';
import type {
  ListResults,
  PureStateResult,
  RerenderResults,
  RetainedMemoryResult,
  RowArchitecture,
  StatResult,
} from '../shared/types';

export interface Cell {
  /** Compared across the row; lower is better. */
  value: number;
  text: string;
  detail?: string;
}

export interface Table {
  title: string;
  note?: string;
  columns: string[];
  rows: { label: string; cells: (Cell | null)[] }[];
  /** Colour and rank cells against the row's best. */
  compare: boolean;
}

export interface Environment {
  date: string;
  userAgent: string;
  build: 'production' | 'development';
  crossOriginIsolated: boolean;
  exposedGc: boolean;
}

export const currentEnvironment = (): Environment => ({
  date: new Date().toISOString(),
  userAgent: navigator.userAgent,
  build: import.meta.env.DEV ? 'development' : 'production',
  crossOriginIsolated: globalThis.crossOriginIsolated === true,
  exposedGc: typeof globalThis.gc === 'function',
});

const timeCell = (s: StatResult): Cell => ({
  value: s.median,
  text: formatMs(s.median),
  detail: `±${cv(s).toFixed(0)}%`,
});

export const ratio = (cell: Cell, row: (Cell | null)[]): number => {
  const best = Math.min(...row.map((c) => c?.value ?? Infinity));
  return best > 0 ? cell.value / best : 1;
};

export function listTables(results: ListResults[]): Table[] {
  const groups: RowArchitecture[] = ['sub rows', 'prop rows'];
  return groups.flatMap((rows) => {
    const libs = results.filter((r) => r.rows === rows);
    if (libs.length === 0) return [];
    const ops = Object.keys(LIST_OPS).filter((op) =>
      libs.some((l) => l.ops.some((o) => o.op === op)),
    );
    const table = (
      title: string,
      pick: (o: ListResults['ops'][number]) => StatResult,
    ): Table => ({
      title,
      columns: libs.map((l) => l.library),
      compare: true,
      rows: ops.map((op) => ({
        label: LIST_OPS[op].label,
        cells: libs.map((l) => {
          const o = l.ops.find((x) => x.op === op);
          return o ? timeCell(pick(o)) : null;
        }),
      })),
    });
    return [
      {
        ...table(`List (${rows}): trigger to committed DOM`, (o) => o.time),
        note: 'Median, ± coefficient of variation.',
      },
      table(`List (${rows}): React render (Profiler)`, (o) => o.render),
    ];
  });
}

export function rerenderTables(results: RerenderResults[]): Table[] {
  if (results.length === 0) return [];
  const scenarios = Object.keys(RERENDER_SCENARIOS).filter((s) =>
    results.some((r) => r.scenarios.some((x) => x.scenario === s)),
  );
  const columns = results.map((r) => r.library);
  const find = (r: RerenderResults, s: string) =>
    r.scenarios.find((x) => x.scenario === s);
  return [
    {
      title: 'Re-render: renders per update',
      columns: ['Optimal', ...columns],
      compare: false,
      rows: scenarios.map((s) => {
        const optimal = RERENDER_SCENARIOS[s].optimalRenders;
        return {
          label: RERENDER_SCENARIOS[s].label,
          cells: [
            { value: optimal, text: String(optimal) },
            ...results.map((r): Cell | null => {
              const x = find(r, s);
              if (!x) return null;
              const n = x.renders.median;
              return { value: n, text: n === optimal ? `${n} ✓` : `${n} ✗` };
            }),
          ],
        };
      }),
    },
    {
      title: 'Re-render: trigger to committed DOM',
      columns,
      compare: true,
      rows: scenarios.map((s) => ({
        label: RERENDER_SCENARIOS[s].label,
        cells: results.map((r) => {
          const x = find(r, s);
          return x ? timeCell(x.time) : null;
        }),
      })),
    },
  ];
}

export function pureTables(
  results: PureStateResult[],
  memory: RetainedMemoryResult[],
): Table[] {
  const libs = [...new Set(results.map((r) => r.library))];
  const tables: Table[] = [];
  for (const category of PURE_CATEGORIES) {
    const ops = category.ops.filter((op) => results.some((r) => r.op === op));
    if (ops.length === 0) continue;
    const columns = category.compare
      ? libs
      : libs.filter((l) =>
          results.some((r) => r.library === l && ops.includes(r.op)),
        );
    tables.push({
      title: `Pure state: ${category.name}`,
      columns,
      compare: category.compare,
      rows: ops.map((op) => ({
        label: op,
        cells: columns.map((lib) => {
          const r = results.find((x) => x.library === lib && x.op === op);
          if (!r) return null;
          const cell = timeCell(r.time);
          if (r.repetitions > 1) cell.detail += ` ×${r.repetitions}`;
          return cell;
        }),
      })),
    });
  }
  if (memory.length > 0) {
    tables.push({
      title: 'Retained memory per live instance',
      note: `Median of 5 readings over ${memory[0].instances} instances.`,
      columns: memory.map((m) => m.library),
      compare: true,
      rows: [
        {
          label: 'bytes / instance',
          cells: memory.map((m) => ({
            value: m.bytesPerInstance.median,
            text: formatBytes(m.bytesPerInstance.median),
          })),
        },
      ],
    });
  }
  return tables;
}

/** Rows where a Blac column is more than `threshold`× the best other column. */
export function blacGaps(tables: Table[], threshold = 1.25): string[] {
  const gaps: string[] = [];
  for (const t of tables) {
    if (!t.compare) continue;
    const blac = t.columns.findIndex((c) => c.startsWith('Blac'));
    if (blac === -1) continue;
    for (const row of t.rows) {
      const own = row.cells[blac];
      const others = row.cells.filter((c, i) => i !== blac && c !== null);
      if (!own || others.length === 0) continue;
      const best = Math.min(...others.map((c) => c?.value ?? Infinity));
      if (best > 0 && own.value / best > threshold) {
        gaps.push(
          `${t.title} — ${row.label}: ${(own.value / best).toFixed(2)}× (${own.text} vs ${formatMs(best)})`,
        );
      }
    }
  }
  return gaps;
}

const escape = (s: string): string => s.replace(/\|/g, '\\|');

export function toMarkdown(env: Environment, tables: Table[]): string {
  const lines = [
    '# State management benchmarks',
    '',
    `${env.date} · ${env.build} build · ` +
      `${env.crossOriginIsolated ? '5µs' : '100µs'} timer · ` +
      `gc ${env.exposedGc ? 'between samples' : 'not exposed'}`,
    '',
    `\`${env.userAgent}\``,
  ];
  for (const t of tables) {
    lines.push('', `## ${t.title}`, '');
    if (t.note) lines.push(t.note, '');
    lines.push(`| | ${t.columns.map(escape).join(' | ')} |`);
    lines.push(`|---|${t.columns.map(() => '---:').join('|')}|`);
    for (const row of t.rows) {
      const cells = row.cells.map((c) => {
        if (!c) return '—';
        const r = t.compare ? ratio(c, row.cells) : 1;
        const rank = t.compare
          ? r <= 1.05
            ? ' **best**'
            : ` ${r.toFixed(2)}×`
          : '';
        return `${c.text}${rank}${c.detail ? ` (${c.detail})` : ''}`;
      });
      lines.push(`| ${escape(row.label)} | ${cells.join(' | ')} |`);
    }
  }
  const gaps = blacGaps(tables);
  lines.push('', '## Blac more than 1.25× the best', '');
  lines.push(...(gaps.length > 0 ? gaps.map((g) => `- ${g}`) : ['None.']));
  return lines.join('\n') + '\n';
}
