import { Cubit } from '@blac/core';
import { buildData, type DataItem } from './data';

export interface Row {
  id: number;
  label: string;
  selected: boolean;
}

export interface BenchmarkState {
  order: number[];
  byId: Record<number, Row>;
}

function buildRows(items: DataItem[]): Pick<BenchmarkState, 'order' | 'byId'> {
  const order: number[] = [];
  const byId: Record<number, Row> = {};
  for (const item of items) {
    order.push(item.id);
    byId[item.id] = { id: item.id, label: item.label, selected: false };
  }
  return { order, byId };
}

export class BenchmarkBloc extends Cubit<BenchmarkState> {
  #selectedId: number | null = null;

  constructor() {
    super({ order: [], byId: {} });
  }

  run = (): void => {
    this.#selectedId = null;
    this.emit(buildRows(buildData(1000)));
  };

  runLots = (): void => {
    this.#selectedId = null;
    this.emit(buildRows(buildData(10000)));
  };

  add = (): void => {
    const newItems = buildData(1000);
    const byId = { ...this.state.byId };
    for (const item of newItems) {
      byId[item.id] = { id: item.id, label: item.label, selected: false };
    }
    this.patch({
      order: [...this.state.order, ...newItems.map((d) => d.id)],
      byId,
    });
  };

  updateEveryTenth = (): void => {
    const { order, byId: oldById } = this.state;
    const byId = { ...oldById };
    for (let i = 0, len = order.length; i < len; i += 10) {
      const id = order[i];
      const row = oldById[id];
      if (row) byId[id] = { ...row, label: row.label + ' !!!' };
    }
    this.patch({ byId });
  };

  select = (id: number): void => {
    const byId = { ...this.state.byId };
    const prevId = this.#selectedId;
    if (prevId !== null && byId[prevId]) {
      byId[prevId] = { ...byId[prevId], selected: false };
    }
    if (byId[id]) {
      byId[id] = { ...byId[id], selected: true };
    }
    this.#selectedId = id;
    this.patch({ byId });
  };

  remove = (id: number): void => {
    if (!this.state.byId[id]) return;
    const order = this.state.order.filter((rowId) => rowId !== id);
    const byId = { ...this.state.byId };
    delete byId[id];
    if (this.#selectedId === id) this.#selectedId = null;
    this.patch({ order, byId });
  };

  clear = (): void => {
    this.#selectedId = null;
    this.emit({ order: [], byId: {} });
  };

  swapRows = (): void => {
    const order = this.state.order.slice(0);
    if (order.length > 998) {
      const tmp = order[1];
      order[1] = order[998];
      order[998] = tmp;
    }
    this.patch({ order });
  };
}

export interface TimingEntry {
  label: string;
  endToEnd: number;
  bodyExecsDelta: number;
  patchesDelta: number;
}

const MAX_LOG_ENTRIES = 8;

export class TimingLogBloc extends Cubit<{ entries: TimingEntry[] }> {
  constructor() {
    super({ entries: [] });
  }

  logEntry = (entry: TimingEntry): void => {
    this.patch({
      entries: [entry, ...this.state.entries].slice(0, MAX_LOG_ENTRIES),
    });
  };
}
