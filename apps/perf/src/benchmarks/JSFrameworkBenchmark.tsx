import { Cubit, borrow } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { memo, useMemo } from 'react';

/**
 * JS Framework Benchmark style test
 * Based on https://github.com/krausest/js-framework-benchmark
 */

interface DataItem {
  id: number;
  label: string;
}

const A = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
  'important',
  'inexpensive',
  'cheap',
  'expensive',
  'fancy',
];

const C = [
  'red',
  'yellow',
  'blue',
  'green',
  'pink',
  'brown',
  'purple',
  'brown',
  'white',
  'black',
  'orange',
];

const N = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard',
];

const random = (max: number): number => Math.round(Math.random() * 1000) % max;

let nextId = 1;
function buildData(count: number): DataItem[] {
  return Array.from<DataItem>({ length: count }, () => ({
    id: nextId++,
    label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
  }));
}

class DemoBloc extends Cubit<{
  data: DataItem[];
  selected: number | null;
}> {
  constructor() {
    super({
      data: [],
      selected: null,
    });
  }

  run = (): void => {
    const data = buildData(1000);
    this.emit({
      data,
      selected: null,
    });
  };

  runLots = (): void => {
    const data = buildData(10000);
    this.emit({
      data,
      selected: null,
    });
  };

  add = (): void => {
    const addData = buildData(1000);
    this.patch({
      data: [...this.state.data, ...addData],
    });
  };

  updateEveryTenth = (): void => {
    const newData = this.state.data.slice(0);
    for (let i = 0, len = newData.length; i < len; i += 10) {
      const r = newData[i];
      newData[i] = { id: r.id, label: r.label + ' !!!' };
    }
    this.patch({
      data: newData,
    });
  };

  select = (id: number): void => {
    this.patch({
      selected: id,
    });
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
    this.emit({
      data: [],
      selected: null,
    });
  };

  swapRows = (): void => {
    const d = this.state.data.slice(0);
    if (d.length > 998) {
      const tmp = d[1];
      d[1] = d[998];
      d[998] = tmp;

      return this.patch({ data: d });
    }
    this.patch({ data: d });
  };
}

interface RowProps {
  item: DataItem;
  isSelected: boolean;
}

const Row: React.FC<RowProps> = memo(({ item, isSelected }) => {
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
});

interface ButtonProps {
  id: string;
  cb: () => void;
  title: string;
}

const Button: React.FC<ButtonProps> = ({ id, cb, title }) => (
  <div className="col-sm-6 smallpad">
    <button
      type="button"
      className="btn btn-primary btn-block"
      id={id}
      onClick={cb}
    >
      {title}
    </button>
  </div>
);

const Jumbotron: React.FC = () => {
  const bloc = useMemo(() => borrow(DemoBloc), []);

  return (
    <div className="jumbotron">
      <div className="row">
        <div className="col-md-6">
          <h1>React + BlaC keyed</h1>
        </div>
        <div className="col-md-6">
          <div className="row">
            <Button id="run" title="Create 1,000 rows" cb={() => bloc.run()} />
            <Button
              id="runlots"
              title="Create 10,000 rows"
              cb={() => bloc.runLots()}
            />
            <Button id="add" title="Append 1,000 rows" cb={() => bloc.add()} />
            <Button
              id="update"
              title="Update every 10th row"
              cb={() => bloc.updateEveryTenth()}
            />
            <Button id="clear" title="Clear" cb={() => bloc.clear()} />
            <Button
              id="swaprows"
              title="Swap Rows"
              cb={() => bloc.swapRows()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const JSFrameworkBenchmark: React.FC = () => {
  const [state] = useBloc(DemoBloc);

  return (
    <div className="container">
      <Jumbotron />
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
      <span
        className="preloadicon glyphicon glyphicon-remove"
        aria-hidden="true"
      />
    </div>
  );
};
