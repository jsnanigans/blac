import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect } from 'react';

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
  data: DataItem[];
  selected: DataItem | null;
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

  update = (): void => {
    const updatedData = this.state.data.map((item, index) => {
      if (index % 10 === 0) {
        return { ...item, label: item.label + ' !!!' };
      }
      return item;
    });
    this.patch({
      data: updatedData,
    });
  };

  select = (item: DataItem): void => {
    this.patch({
      selected: item,
    });
  };

  remove = (item: DataItem): void => {
    this.patch({
      data: this.state.data.filter((i) => i !== item),
    });
  };

  clear = (): void => {
    this.emit({
      data: [],
      selected: null,
    });
  };

  swapRows = (): void => {
    if (this.state.data.length > 998) {
      const newData = [...this.state.data];
      [newData[1], newData[998]] = [newData[998], newData[1]];
      this.patch({ data: newData });
    }
  };
}

const GlyphIcon = (
  <span className="glyphicon glyphicon-remove" aria-hidden="true" />
);

// Debounced render counter
let rowRenderCount = 0;
let rowRenderTimeout: NodeJS.Timeout | null = null;

const trackRowRender = () => {
  rowRenderCount++;

  if (rowRenderTimeout) {
    clearTimeout(rowRenderTimeout);
  }

  rowRenderTimeout = setTimeout(() => {
    console.log(`[RENDER SUMMARY] ${rowRenderCount} rows rendered`);
    rowRenderCount = 0;
  }, 100); // Debounce for 100ms
};

interface RowProps {
  item: DataItem;
}

const Row: React.FC<RowProps> = React.memo(({ item }) => {
  const [{ selected }, { remove, select }] = useBloc(DemoBloc, {
    dependencies: (bloc) => [bloc.state.selected === item],
  });

  useEffect(() => {
    trackRowRender();
  });

  return (
    <tr className={item === selected ? 'danger' : ''}>
      <td className="col-md-1">{item.id}</td>
      <td className="col-md-4">
        <a onClick={() => select(item)}>{item.label}</a>
      </td>
      <td className="col-md-1">
        <a onClick={() => remove(item)}>{GlyphIcon}</a>
      </td>
      <td className="col-md-6"></td>
    </tr>
  );
});

const RowList: React.FC = () => {
  const [{ data }] = useBloc(DemoBloc, {});

  useEffect(() => {
    console.log('[RowList] Rendered with');
  });

  return (
    <>
      {data.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </>
  );
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

  useEffect(() => {
    console.log('[JSFrameworkBenchmark] Component rendered');
  });

  return (
    <div className="container">
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>React + BlaC</h1>
          </div>
          <div className="col-md-6">
            <div className="row">
              <Button id="run" title="Create 1,000 rows" cb={run} />
              <Button id="runlots" title="Create 10,000 rows" cb={runLots} />
              <Button id="add" title="Append 1,000 rows" cb={add} />
              <Button id="update" title="Update every 10th row" cb={update} />
              <Button id="clear" title="Clear" cb={clear} />
              <Button id="swaprows" title="Swap Rows" cb={swapRows} />
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
