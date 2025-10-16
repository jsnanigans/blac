import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React from 'react';

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
  const data = new Array<DataItem>(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
    };
  }
  return data;
}

class DemoBloc extends Cubit<{
  selected: number[];
  data: DataItem[];
}> {
  constructor() {
    super({
      selected: [],
      data: [],
    });
  }

  run = (): void => {
    const data = buildData(1000);
    this.emit({
      selected: [],
      data,
    });
  };

  runLots = (): void => {
    const data = buildData(10000);
    this.emit({
      selected: [],
      data,
    });
  };

  add = (): void => {
    const addData = buildData(1000);
    const newState = [...this.state.data, ...addData];
    this.patch({
      data: newState,
    });
  };

  update = (): void => {
    const updatedData = this.state.data.map((item, i) => {
      if (i % 10 === 0) {
        return { ...item, label: item.label + ' !!!' };
      }
      return item;
    });
    this.patch({
      data: updatedData,
    });
  };

  select = (id: number): void => {
    const currentSelected = this.state.selected;
    const newSelected = currentSelected.includes(id) ? [] : [id];
    this.patch({ selected: newSelected });
  };

  remove = (id: number): void => {
    const newData = this.state.data.filter((item) => item.id !== id);
    this.patch({ data: newData });
  };

  clear = (): void => {
    this.emit({
      selected: [],
      data: [],
    });
  };

  swapRows = (): void => {
    const currentData = [...this.state.data];
    const swappableData = [...currentData];
    if (swappableData.length > 998) {
      const tmp = swappableData[1];
      swappableData[1] = swappableData[998];
      swappableData[998] = tmp;
    }
    this.patch({ data: swappableData });
  };
}

const GlyphIcon = (
  <span className="glyphicon glyphicon-remove" aria-hidden="true" />
);

interface RowProps {
  item: DataItem;
  isSelected?: boolean;
  remove: (id: number) => void;
  select: (id: number) => void;
}

const Row: React.FC<RowProps> = React.memo(
  ({ item, isSelected, remove, select }) => {
    return (
      <tr className={isSelected ? 'danger' : ''}>
        <td className="col-md-1">{item.id}</td>
        <td className="col-md-4">
          <a onClick={() => select(item.id)}>{item.label}</a>
        </td>
        <td className="col-md-1">
          <a onClick={() => remove(item.id)}>{GlyphIcon}</a>
        </td>
        <td className="col-md-6"></td>
      </tr>
    );
  }
);

const RowList: React.FC = () => {
  const [{ data, selected }, { remove, select }] = useBloc(DemoBloc);

  const rows = data.map((item) => (
    <Row
      key={item.id}
      item={item}
      isSelected={selected.includes(item.id)}
      remove={remove}
      select={select}
    />
  ));

  return <>{rows}</>;
};

interface ButtonProps {
  id: string;
  title: string;
  cb: () => void;
}

const Button: React.FC<ButtonProps> = ({ id, title, cb }) => (
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

export const JSFrameworkBenchmark: React.FC = () => {
  const [, { run, runLots, add, update, clear, swapRows }] = useBloc(DemoBloc);

  return (
    <div className="container">
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>React + BlaC</h1>
          </div>
          <div className="col-md-6">
            <div className="row">
              <Button id="run" title="Create 1,000 rows" cb={() => run()} />
              <Button
                id="runlots"
                title="Create 10,000 rows"
                cb={() => runLots()}
              />
              <Button id="add" title="Append 1,000 rows" cb={() => add()} />
              <Button
                id="update"
                title="Update every 10th row"
                cb={() => update()}
              />
              <Button id="clear" title="Clear" cb={() => clear()} />
              <Button id="swaprows" title="Swap Rows" cb={() => swapRows()} />
            </div>
          </div>
        </div>
      </div>
      <table className="table table-hover table-striped test-data">
        <tbody>
          <RowList />
        </tbody>
      </table>
      <span
        className="preloadicon glyphicon glyphicon-remove"
        aria-hidden="true"
      ></span>
    </div>
  );
};
