import { Cubit } from "@blac/core";
import { useBloc } from "@blac/react";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import './bootstrap.css';
import './main.css';

interface DataItem {
  id: number;
  label: string;
  selected: boolean;
  removed: boolean;
}

const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

const random = (max: number): number => Math.round(Math.random() * 1000) % max;

let nextId = 1;
function buildData(count: number): DataItem[] {
  const data = new Array<DataItem>(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
      selected: false,
      removed: false,
    };
  }
  return data;
}

// State management with Blac (Cubit)
class DemoBloc extends Cubit<DataItem[]> {
  constructor() {
    super([]);
  }

  run = (): void => {
    const data = buildData(1000);
    this.emit(data);
  };

  runLots = (): void => {
    const data = buildData(10000);
    this.emit(data);
  };

  add = (): void => {
    const addData = buildData(1000);
    this.emit([...this.state, ...addData]);
  };

  update = (): void => {
    let visibleItemCounter = 0;
    const updatedData = this.state.map(item => {
      if (item.removed) {
        return item;
      }
      if (visibleItemCounter % 10 === 0) {
        visibleItemCounter++;
        return { ...item, label: item.label + " !!!" };
      }
      visibleItemCounter++;
      return item;
    });
    this.emit(updatedData);
  };

  lastSelected: number = -1; 
  select = (index: number): void => {
    const newData = [...this.state];

    if (this.lastSelected !== -1 && this.lastSelected !== index) {
      newData[this.lastSelected] = { ...newData[this.lastSelected], selected: false };
    }

    const item = newData[index];
    newData[index] = { ...item, selected: !item.selected };

    this.lastSelected = index;
    this.emit(newData);
  };

  remove = (index: number): void => {
    const newData = [...this.state];
    newData[index] = { ...newData[index], removed: true };
    this.emit(newData);
  };

  clear = (): void => {
    this.emit([]);
  };

  swapRows = (): void => {
    const currentData = this.state.filter(item => !item.removed);
    const swappableData = [...currentData];
    const tmp = swappableData[1];
    swappableData[1] = swappableData[998];
    swappableData[998] = tmp;
    this.emit(swappableData);
  };
}

const GlyphIcon = <span className="glyphicon glyphicon-remove" aria-hidden="true" />;

interface RowProps {
  index: number;
}

const Row: React.FC<RowProps> = ({ index }) => {
  const [allData, { remove, select }] = useBloc(DemoBloc);
  const item = allData[index];
  if (item.removed) return null;

  return (
    <tr className={item.selected ? "danger" : ""}>
      <td className="col-md-1">{item.id}</td>
      <td className="col-md-4">
        <a onClick={() => select(index)}>{item.label}</a>
      </td>
      <td className="col-md-1">
        <a onClick={() => remove(index)}>{GlyphIcon}</a>
      </td>
      <td className="col-md-6"></td>
    </tr>
  );
};

const RowList: React.FC = () => {
  const [allData] = useBloc(DemoBloc, {
    selector: (s: DataItem[]) => [[s.length]]
  });
  
  return allData.map((item, index) => (
    <Row 
      key={item.id} 
      index={index}
    />
  )); 
};

interface ButtonProps {
  id: string;
  title: string;
  cb: () => void;
}

const Button: React.FC<ButtonProps> = ({ id, title, cb }) => (
  <div className="col-sm-6 smallpad">
    <button type="button" className="btn btn-primary btn-block" id={id} onClick={cb}>
      {title}
    </button>
  </div>
);

const Main: React.FC = () => {
  const [, { run, runLots, add, update, clear, swapRows }] = useBloc(DemoBloc);
  return (
    <div className="container">
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>React + Blac</h1>
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
      <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  );
};

const container = document.getElementById("main");

if (container) {
  const root: Root = createRoot(container);
  root.render(<Main />);
} else {
  console.error("Failed to find the root element with ID 'main'");
}
