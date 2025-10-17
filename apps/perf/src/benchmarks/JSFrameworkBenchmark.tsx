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
  isSelected?: boolean;
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
}> {
  constructor() {
    super({
      data: [],
    });
  }

  // Generator function that yields IDs in order
  *iterIds() {
    for (const item of this.state.data) {
      yield item.id;
    }
  }

  run = (): void => {
    const data = buildData(1000);
    this.emit({
      data,
    });
  };

  runLots = (): void => {
    const data = buildData(10000);
    this.emit({
      data,
    });
  };

  add = (): void => {
    const addData = buildData(1000);
    // Optimize: concat is faster than spread for large arrays
    const newData = this.state.data.concat(addData);
    this.patch({
      data: newData,
    });
  };

  update = (): void => {
    // Optimize: create new array and only spread changed items
    const updatedData = this.state.data.slice();
    for (let i = 0; i < updatedData.length; i += 10) {
      updatedData[i] = {
        ...updatedData[i],
        label: updatedData[i].label + ' !!!',
      };
    }
    this.patch({
      data: updatedData,
    });
  };

  select = (id: number): void => {
    const updatedData = this.state.data.map((item) => {
      if (item.id === id) {
        return { ...item, isSelected: true };
      }
      if (item.isSelected) {
        return { ...item, isSelected: false };
      }
      return item;
    });

    this.patch({
      data: updatedData,
    });
  };

  remove = (id: number): void => {
    // Optimize: find index then slice/splice avoids full array iteration
    const index = this.state.data.findIndex((item) => item.id === id);
    if (index !== -1) {
      const newData = [
        ...this.state.data.slice(0, index),
        ...this.state.data.slice(index + 1),
      ];
      this.patch({
        data: newData,
      });
    }
  };

  clear = (): void => {
    this.emit({
      data: [],
    });
  };

  swapRows = (): void => {
    // Optimize: single slice and swap in place
    if (this.state.data.length > 998) {
      const newData = this.state.data.slice();
      const tmp = newData[1];
      newData[1] = newData[998];
      newData[998] = tmp;
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

const Row: React.FC<RowProps> = ({ item }) => {
  // Dependency selector: only subscribe to this specific item and selection state
  const [, { remove, select }] = useBloc(DemoBloc);
  console.log(item);

  // Track row renders
  useEffect(() => {
    trackRowRender();
  });

  return (
    <tr className={item.isSelected ? 'danger' : ''}>
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
};

const RowList: React.FC = () => {
  const [{ data }, bloc] = useBloc(DemoBloc, {
    dependencies: (bl) => bl.iterIds(),
  });

  useEffect(() => {
    console.log('[RowList] Rendered with', bloc.state.data.length, 'items');
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
