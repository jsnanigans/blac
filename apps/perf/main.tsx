import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { createRoot, Root } from 'react-dom/client';
import './bootstrap.css';
import './main.css';

interface DataItem {
  id: number;
  label: string;
  selected: boolean;
  removed: boolean;
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  details?: Record<string, any>;
}

interface RenderMetric {
  component: string;
  renderCount: number;
  duration: number;
  timestamp: number;
}

interface BlocMetric {
  operation: string;
  stateSize: number;
  emitDuration: number;
  listenerCount: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: RenderMetric[] = [];
  private blocMetrics: BlocMetric[] = [];
  private observers: Set<(metrics: any) => void> = new Set();
  private rendersSinceLastStateUpdate = 0;
  private lastStateUpdateTime = 0;

  logOperation(
    operation: string,
    startTime: number,
    details?: Record<string, any>,
  ): void {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      details,
    };
    this.metrics.push(metric);
    console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`, details || '');
    this.notifyObservers();
  }

  logRender(component: string, renderCount: number, duration: number): void {
    this.rendersSinceLastStateUpdate++;
    const metric: RenderMetric = {
      component,
      renderCount,
      duration,
      timestamp: Date.now(),
    };
    this.renderMetrics.push(metric);
    console.log(
      `[RENDER] ${component} #${renderCount}: ${duration.toFixed(2)}ms (Total renders since last state update: ${this.rendersSinceLastStateUpdate})`,
    );
    this.notifyObservers();
  }

  logBlocOperation(
    operation: string,
    stateSize: number,
    emitDuration: number,
    listenerCount: number,
  ): void {
    const renderCountAtStateUpdate = this.rendersSinceLastStateUpdate;
    this.rendersSinceLastStateUpdate = 0; // Reset counter after state update
    this.lastStateUpdateTime = Date.now();

    const metric: BlocMetric = {
      operation,
      stateSize,
      emitDuration,
      listenerCount,
      timestamp: Date.now(),
    };
    this.blocMetrics.push(metric);
    console.log(
      `[BLOC] ${operation} - State size: ${stateSize}, Emit: ${emitDuration.toFixed(2)}ms, Listeners: ${listenerCount}, Renders since last update: ${renderCountAtStateUpdate}`,
    );
    this.notifyObservers();
  }

  getMetrics() {
    return {
      operations: this.metrics,
      renders: this.renderMetrics,
      bloc: this.blocMetrics,
    };
  }

  calculateStats() {
    const totalOperationTime = this.metrics.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const totalRenderTime = this.renderMetrics.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const totalBlocEmitTime = this.blocMetrics.reduce(
      (sum, m) => sum + m.emitDuration,
      0,
    );

    const blocOverhead = totalBlocEmitTime;
    const renderOverhead = totalRenderTime - totalOperationTime;

    return {
      totalOperationTime,
      totalRenderTime,
      totalBlocEmitTime,
      blocOverhead,
      renderOverhead,
      averageOperationTime: this.metrics.length
        ? totalOperationTime / this.metrics.length
        : 0,
      averageRenderTime: this.renderMetrics.length
        ? totalRenderTime / this.renderMetrics.length
        : 0,
      totalRenders: this.renderMetrics.reduce(
        (sum, m) => sum + m.renderCount,
        0,
      ),
      rendersSinceLastStateUpdate: this.rendersSinceLastStateUpdate,
      timeSinceLastStateUpdate: this.lastStateUpdateTime
        ? Date.now() - this.lastStateUpdateTime
        : 0,
    };
  }

  subscribe(callback: (metrics: any) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers() {
    const metrics = this.getMetrics();
    this.observers.forEach((callback) => callback(metrics));
  }

  clear() {
    this.metrics = [];
    this.renderMetrics = [];
    this.blocMetrics = [];
    this.rendersSinceLastStateUpdate = 0;
    this.lastStateUpdateTime = 0;
    this.notifyObservers();
  }
}

const perfMonitor = new PerformanceMonitor();

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
  const buildStart = performance.now();
  const data = new Array<DataItem>(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
      selected: false,
      removed: false,
    };
  }
  perfMonitor.logOperation(`buildData(${count})`, buildStart, {
    itemCount: count,
  });
  return data;
}

function useRenderTracking(componentName: string): void {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  renderStartTime.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    const renderDuration = performance.now() - renderStartTime.current;
    perfMonitor.logRender(componentName, renderCount.current, renderDuration);
  });
}

class DemoBloc extends Cubit<DataItem[]> {
  constructor() {
    super([]);
  }

  private measureBlocOperation(operation: string, action: () => void): void {
    const emitStart = performance.now();
    const listenerCount = this._observer.size;
    action();
    const emitDuration = performance.now() - emitStart;
    perfMonitor.logBlocOperation(
      operation,
      this.state.length,
      emitDuration,
      listenerCount,
    );
  }

  run = (): void => {
    const start = performance.now();
    const data = buildData(1000);
    this.measureBlocOperation('run', () => this.emit(data));
    perfMonitor.logOperation('Create 1,000 rows', start, {
      rowCount: 1000,
      stateSize: data.length,
    });
  };

  runLots = (): void => {
    const start = performance.now();
    const data = buildData(10000);
    this.measureBlocOperation('runLots', () => this.emit(data));
    perfMonitor.logOperation('Create 10,000 rows', start, {
      rowCount: 10000,
      stateSize: data.length,
    });
  };

  add = (): void => {
    const start = performance.now();
    const addData = buildData(1000);
    const newState = [...this.state, ...addData];
    this.measureBlocOperation('add', () => this.emit(newState));
    perfMonitor.logOperation('Append 1,000 rows', start, {
      previousSize: this.state.length - 1000,
      newSize: this.state.length,
    });
  };

  update = (): void => {
    const start = performance.now();
    let visibleItemCounter = 0;
    let updatedCount = 0;
    const updatedData = this.state.map((item) => {
      if (item.removed) {
        return item;
      }
      if (visibleItemCounter % 10 === 0) {
        visibleItemCounter++;
        updatedCount++;
        return { ...item, label: item.label + ' !!!' };
      }
      visibleItemCounter++;
      return item;
    });
    this.measureBlocOperation('update', () => this.emit(updatedData));
    perfMonitor.logOperation('Update every 10th row', start, {
      totalRows: this.state.length,
      updatedRows: updatedCount,
    });
  };

  lastSelected: number = -1;
  select = (index: number): void => {
    const start = performance.now();
    const newData = [...this.state];

    if (this.lastSelected !== -1 && this.lastSelected !== index) {
      newData[this.lastSelected] = {
        ...newData[this.lastSelected],
        selected: false,
      };
    }

    const item = newData[index];
    newData[index] = { ...item, selected: !item.selected };

    this.lastSelected = index;
    this.measureBlocOperation('select', () => this.emit(newData));
    perfMonitor.logOperation('Select row', start, {
      index,
      previousSelected: this.lastSelected,
    });
  };

  remove = (index: number): void => {
    const start = performance.now();
    const newData = [...this.state];
    newData[index] = { ...newData[index], removed: true };
    this.measureBlocOperation('remove', () => this.emit(newData));
    perfMonitor.logOperation('Remove row', start, { index });
  };

  clear = (): void => {
    const start = performance.now();
    const previousSize = this.state.length;
    this.measureBlocOperation('clear', () => this.emit([]));
    perfMonitor.logOperation('Clear', start, {
      clearedRows: previousSize,
    });
  };

  swapRows = (): void => {
    const start = performance.now();
    const currentData = this.state.filter((item) => !item.removed);
    const swappableData = [...currentData];
    const tmp = swappableData[1];
    swappableData[1] = swappableData[998];
    swappableData[998] = tmp;
    this.measureBlocOperation('swapRows', () => this.emit(swappableData));
    perfMonitor.logOperation('Swap Rows', start, {
      visibleRows: currentData.length,
    });
  };
}

const GlyphIcon = (
  <span className="glyphicon glyphicon-remove" aria-hidden="true" />
);

interface RowProps {
  item: DataItem;
  index: number;
}

const Row: React.FC<RowProps> = React.memo(({ item, index }) => {
  useRenderTracking(`Row-${item.id}`);
  const [, { remove, select }] = useBloc(DemoBloc, {
    selector: (state: DataItem[]) => {
      const currentItem = state.find(i => i.id === item.id);
      return currentItem ? [currentItem.id, currentItem.label, currentItem.selected, currentItem.removed] : [null];
    },
  });
  
  if (item.removed) return null;

  return (
    <tr className={item.selected ? 'danger' : ''}>
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
});

const RowList: React.FC = () => {
  useRenderTracking('RowList');
  const [allData] = useBloc(DemoBloc, {
    selector: (s: DataItem[]) => [s.length],
  });

  const renderStart = performance.now();
  const visibleRows = allData.filter((item) => !item.removed).length;

  const rows = allData.map((item, index) => (
    <Row key={item.id} item={item} index={index} />
  ));

  useEffect(() => {
    const renderDuration = performance.now() - renderStart;
    perfMonitor.logOperation('RowList render batch', renderStart, {
      totalRows: allData.length,
      visibleRows,
      renderDuration,
    });
  });

  return rows;
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

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState(perfMonitor.getMetrics());
  const [stats, setStats] = useState(perfMonitor.calculateStats());

  useEffect(() => {
    const unsubscribe = perfMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setStats(perfMonitor.calculateStats());
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className="performance-dashboard"
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '300px',
        zIndex: 1000,
      }}
    >
      <h4 style={{ margin: '0 0 10px 0' }}>Performance Monitor</h4>

      <div style={{ marginBottom: '10px' }}>
        <strong>Summary:</strong>
        <div>Total Operations: {stats.totalOperationTime.toFixed(2)}ms</div>
        <div>Total Renders: {stats.totalRenders}</div>
        <div>Total Render Time: {stats.totalRenderTime.toFixed(2)}ms</div>
        <div>Bloc Overhead: {stats.blocOverhead.toFixed(2)}ms</div>
        <div>React Overhead: {stats.renderOverhead.toFixed(2)}ms</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>React Efficiency:</strong>
        <div>
          Renders since last state update: {stats.rendersSinceLastStateUpdate}
        </div>
        <div>
          Time since last state update:{' '}
          {(stats.timeSinceLastStateUpdate / 1000).toFixed(1)}s
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Averages:</strong>
        <div>Avg Operation: {stats.averageOperationTime.toFixed(2)}ms</div>
        <div>Avg Render: {stats.averageRenderTime.toFixed(2)}ms</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Recent Operations:</strong>
        {metrics.operations.slice(-5).map((op, i) => (
          <div key={i} style={{ fontSize: '11px', marginLeft: '10px' }}>
            {op.operation}: {op.duration.toFixed(2)}ms
          </div>
        ))}
      </div>

      <button
        onClick={() => perfMonitor.clear()}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#666',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        Clear Metrics
      </button>
    </div>
  );
};

const Main: React.FC = () => {
  useRenderTracking('Main');
  const [, { run, runLots, add, update, clear, swapRows }] = useBloc(DemoBloc);

  const handleOperation = useCallback((operation: () => void, name: string) => {
    console.group(`[OPERATION] ${name}`);
    const start = performance.now();
    operation();
    console.log(
      `[OPERATION] ${name} completed in ${(performance.now() - start).toFixed(2)}ms`,
    );
    console.groupEnd();
  }, []);

  return (
    <div className="container">
      <PerformanceDashboard />
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>React + Blac Performance Monitor</h1>
          </div>
          <div className="col-md-6">
            <div className="row">
              <Button
                id="run"
                title="Create 1,000 rows"
                cb={() => handleOperation(run, 'Create 1,000')}
              />
              <Button
                id="runlots"
                title="Create 10,000 rows"
                cb={() => handleOperation(runLots, 'Create 10,000')}
              />
              <Button
                id="add"
                title="Append 1,000 rows"
                cb={() => handleOperation(add, 'Append 1,000')}
              />
              <Button
                id="update"
                title="Update every 10th row"
                cb={() => handleOperation(update, 'Update 10th')}
              />
              <Button
                id="clear"
                title="Clear"
                cb={() => handleOperation(clear, 'Clear')}
              />
              <Button
                id="swaprows"
                title="Swap Rows"
                cb={() => handleOperation(swapRows, 'Swap')}
              />
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

const container = document.getElementById('main');

if (container) {
  const root: Root = createRoot(container);
  root.render(<Main />);
} else {
  console.error("Failed to find the root element with ID 'main'");
}

