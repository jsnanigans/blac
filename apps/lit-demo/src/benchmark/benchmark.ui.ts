import { component, type Ctx } from '../dev/component';
import { pulse } from '../dev/pulse';
import { devStats } from '../dev/devStats';
import { html, select, each } from '@blac/lit';
import { createRef, ref } from 'lit-html/directives/ref.js';
import {
  BenchmarkBloc,
  TimingLogBloc,
  type BenchmarkState,
} from './benchmark.bloc';
import { measureEndToEnd } from './timing';

type OperationName =
  | 'run'
  | 'runLots'
  | 'add'
  | 'updateEveryTenth'
  | 'clear'
  | 'swapRows';

const OPERATION_LABELS: Record<OperationName, string> = {
  run: 'Create 1,000 rows',
  runLots: 'Create 10,000 rows',
  add: 'Append 1,000 rows',
  updateEveryTenth: 'Update every 10th row',
  clear: 'Clear',
  swapRows: 'Swap rows',
};

const OPERATIONS: OperationName[] = [
  'run',
  'runLots',
  'add',
  'updateEveryTenth',
  'clear',
  'swapRows',
];

// Row is keyed only by `id` — never an index. ComponentDirective ignores a
// row's args after first mount, so an `index` arg goes stale once
// remove/swapRows reorder existing rows; `indexById` is read fresh via
// `select` on every render instead.
const BenchmarkRow = component<{ id: number }>(
  (ctx: Ctx<{ id: number }>) => {
    const b = ctx.use(BenchmarkBloc);
    const id = ctx.args!.id;
    return html`
      <tr
        class=${select(b, (s: BenchmarkState) =>
          s.selected === id ? 'selected' : '',
        )}
      >
        <td>${id}</td>
        <td ${pulse()}>
          <a @click=${() => b.select(id)}
            >${select(b, (s: BenchmarkState) => {
              const i = s.indexById.get(id);
              return i === undefined ? '' : s.data[i].label;
            })}</a
          >
        </td>
        <td><a @click=${() => b.remove(id)}>&times;</a></td>
      </tr>
    `;
  },
);

export const BenchmarkPage = component(BenchmarkBloc, (b, ctx) => {
  const logBloc = ctx.use(TimingLogBloc);
  const selectRef = createRef<HTMLInputElement>();
  const removeRef = createRef<HTMLInputElement>();

  const runTimed = async (label: string, fn: () => void) => {
    const before = devStats.snapshot();
    const endToEnd = await measureEndToEnd(fn);
    const after = devStats.snapshot();
    logBloc.logEntry({
      label,
      endToEnd,
      bodyExecsDelta: after.bodyExecs - before.bodyExecs,
      patchesDelta: after.patches - before.patches,
    });
  };

  return html`
    <div class="page">
      <div class="benchmark-controls">
        ${OPERATIONS.map(
          (op) => html`
            <button
              @click=${() => void runTimed(OPERATION_LABELS[op], () => b[op]())}
            >
              ${OPERATION_LABELS[op]}
            </button>
          `,
        )}
      </div>

      <div class="benchmark-forms">
        <form
          @submit=${(e: Event) => {
            e.preventDefault();
            const id = Number(selectRef.value?.value);
            if (!Number.isNaN(id)) void runTimed('Select row', () => b.select(id));
          }}
        >
          <input type="number" placeholder="row id" ${ref(selectRef)} />
          <button type="submit">Select row</button>
        </form>

        <form
          @submit=${(e: Event) => {
            e.preventDefault();
            const id = Number(removeRef.value?.value);
            if (!Number.isNaN(id)) void runTimed('Remove row', () => b.remove(id));
          }}
        >
          <input type="number" placeholder="row id" ${ref(removeRef)} />
          <button type="submit">Remove row</button>
        </form>
      </div>

      <table class="bench-log">
        <thead>
          <tr>
            <th>Operation</th>
            <th>End-to-end (ms)</th>
            <th>Body execs &Delta;</th>
            <th>Patches &Delta;</th>
          </tr>
        </thead>
        <tbody>
          ${each(
            select(logBloc, (s) => s.entries),
            (entry) => html`
              <tr>
                <td>${entry.label}</td>
                <td>${entry.endToEnd.toFixed(2)}</td>
                <td>${entry.bodyExecsDelta}</td>
                <td>${entry.patchesDelta}</td>
              </tr>
            `,
            (_entry, i) => i,
          )}
        </tbody>
      </table>

      <table class="benchmark-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${each(
            select(b, (s: BenchmarkState) => s.data),
            (item) => BenchmarkRow({ id: item.id }),
            (item) => item.id,
          )}
        </tbody>
      </table>
    </div>
  `;
});
