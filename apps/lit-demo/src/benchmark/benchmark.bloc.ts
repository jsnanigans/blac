import { Cubit } from '@blac/core';
import { buildData, type DataItem } from './data';

export interface BenchmarkState {
  data: DataItem[];
  indexById: Map<number, number>;
  selected: number | null;
}

function withIndex(
  data: DataItem[],
): Pick<BenchmarkState, 'data' | 'indexById'> {
  return { data, indexById: new Map(data.map((d, i) => [d.id, i])) };
}

export class BenchmarkBloc extends Cubit<BenchmarkState> {
  constructor() {
    super({ data: [], indexById: new Map(), selected: null });
  }

  run = (): void => {
    this.emit({ ...withIndex(buildData(1000)), selected: null });
  };

  runLots = (): void => {
    this.emit({ ...withIndex(buildData(10000)), selected: null });
  };

  add = (): void => {
    this.patch(withIndex([...this.state.data, ...buildData(1000)]));
  };

  updateEveryTenth = (): void => {
    const newData = this.state.data.slice(0);
    for (let i = 0, len = newData.length; i < len; i += 10) {
      const r = newData[i];
      newData[i] = { id: r.id, label: r.label + ' !!!' };
    }
    this.patch(withIndex(newData));
  };

  select = (id: number): void => {
    this.patch({ selected: id });
  };

  remove = (id: number): void => {
    const idx = this.state.data.findIndex((d) => d.id === id);
    this.patch(
      withIndex([
        ...this.state.data.slice(0, idx),
        ...this.state.data.slice(idx + 1),
      ]),
    );
  };

  clear = (): void => {
    this.emit({ data: [], indexById: new Map(), selected: null });
  };

  swapRows = (): void => {
    const d = this.state.data.slice(0);
    if (d.length > 998) {
      const tmp = d[1];
      d[1] = d[998];
      d[998] = tmp;
    }
    this.patch(withIndex(d));
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
