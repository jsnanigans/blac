import { Cubit, borrow } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { memo, useEffect, useMemo } from 'react';
import { buildData, resetId } from '../../shared/data';
import type { BenchmarkAPI, DataItem } from '../../shared/types';

interface DemoState {
  data: DataItem[];
  selected: number | null;
}

class DemoBloc extends Cubit<DemoState> {
  constructor() {
    super({ data: [], selected: null });
  }

  run = (): void => {
    resetId();
    this.emit({ data: buildData(1000), selected: null });
  };

  runLots = (): void => {
    resetId();
    this.emit({ data: buildData(10000), selected: null });
  };

  add = (): void => {
    this.patch({ data: [...this.state.data, ...buildData(1000)] });
  };

  updateEveryTenth = (): void => {
    const newData = this.state.data.slice(0);
    for (let i = 0, len = newData.length; i < len; i += 10) {
      const r = newData[i];
      newData[i] = { id: r.id, label: r.label + ' !!!' };
    }
    this.patch({ data: newData });
  };

  select = (id: number): void => {
    this.patch({ selected: id });
  };

  remove = (id: number): void => {
    const idx = this.state.data.findIndex((d) => d.id === id);
    this.patch({
      data: [
        ...this.state.data.slice(0, idx),
        ...this.state.data.slice(idx + 1),
      ],
    });
  };

  clear = (): void => {
    this.emit({ data: [], selected: null });
  };

  swapRows = (): void => {
    const d = this.state.data.slice(0);
    if (d.length > 998) {
      const tmp = d[1];
      d[1] = d[998];
      d[998] = tmp;
    }
    this.patch({ data: d });
  };
}

const Row: React.FC<{ item: DataItem; isSelected: boolean }> = memo(
  ({ item, isSelected }) => {
    const bloc = useMemo(() => borrow(DemoBloc), []);

    return (
      <tr className={isSelected ? 'danger' : ''}>
        <td className="col-md-1">{item.id}</td>
        <td className="col-md-4">
          <a onClick={() => bloc.select(item.id)}>{item.label}</a>
        </td>
        <td className="col-md-1">
          <a onClick={() => bloc.remove(item.id)}>
            <span className="glyphicon glyphicon-remove" aria-hidden="true" />
          </a>
        </td>
        <td className="col-md-6" />
      </tr>
    );
  },
);

export const BlacFrameworkBenchmark: React.FC<{
  onReady: (api: BenchmarkAPI) => void;
}> = ({ onReady }) => {
  const [state] = useBloc(DemoBloc);
  const bloc = useMemo(() => borrow(DemoBloc), []);

  useEffect(() => {
    onReady({
      run: bloc.run,
      runLots: bloc.runLots,
      add: bloc.add,
      update: bloc.updateEveryTenth,
      clear: bloc.clear,
      swapRows: bloc.swapRows,
      select: bloc.select,
      remove: bloc.remove,
    });
  }, [bloc, onReady]);

  return (
    <div className="container">
      <table className="table table-hover table-striped test-data">
        <tbody>
          {state.data.map((item) => (
            <Row
              key={item.id}
              item={item}
              isSelected={state.selected === item.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
