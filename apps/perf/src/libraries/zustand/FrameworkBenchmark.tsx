import React, { memo, useEffect, useRef } from 'react';
import { createStore, useStore } from 'zustand';
import { buildData, resetId } from '../../shared/data';
import type { BenchmarkAPI, DataItem } from '../../shared/types';

interface DemoState {
  data: DataItem[];
  selected: number | null;
  run: () => void;
  runLots: () => void;
  add: () => void;
  updateEveryTenth: () => void;
  select: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  swapRows: () => void;
}

function createDemoStore() {
  return createStore<DemoState>((set) => ({
    data: [],
    selected: null,

    run: () => {
      resetId();
      set({ data: buildData(1000), selected: null });
    },

    runLots: () => {
      resetId();
      set({ data: buildData(10000), selected: null });
    },

    add: () => {
      set((state) => ({ data: [...state.data, ...buildData(1000)] }));
    },

    updateEveryTenth: () => {
      set((state) => {
        const newData = state.data.slice(0);
        for (let i = 0, len = newData.length; i < len; i += 10) {
          const r = newData[i];
          newData[i] = { id: r.id, label: r.label + ' !!!' };
        }
        return { data: newData };
      });
    },

    select: (id: number) => {
      set({ selected: id });
    },

    remove: (id: number) => {
      set((state) => {
        const idx = state.data.findIndex((d) => d.id === id);
        return {
          data: [...state.data.slice(0, idx), ...state.data.slice(idx + 1)],
        };
      });
    },

    clear: () => {
      set({ data: [], selected: null });
    },

    swapRows: () => {
      set((state) => {
        const d = state.data.slice(0);
        if (d.length > 998) {
          const tmp = d[1];
          d[1] = d[998];
          d[998] = tmp;
        }
        return { data: d };
      });
    },
  }));
}

const Row: React.FC<{
  item: DataItem;
  isSelected: boolean;
  store: ReturnType<typeof createDemoStore>;
}> = memo(({ item, isSelected, store }) => {
  const select = useStore(store, (s) => s.select);
  const remove = useStore(store, (s) => s.remove);

  return (
    <tr className={isSelected ? 'danger' : ''}>
      <td className="col-md-1">{item.id}</td>
      <td className="col-md-4">
        <a onClick={() => select(item.id)}>{item.label}</a>
      </td>
      <td className="col-md-1">
        <a onClick={() => remove(item.id)}>
          <span className="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
      <td className="col-md-6" />
    </tr>
  );
});

export const ZustandFrameworkBenchmark: React.FC<{
  onReady: (api: BenchmarkAPI) => void;
}> = ({ onReady }) => {
  const storeRef = useRef(createDemoStore());
  const store = storeRef.current;
  const data = useStore(store, (s) => s.data);
  const selected = useStore(store, (s) => s.selected);

  useEffect(() => {
    const s = store.getState();
    onReady({
      run: s.run,
      runLots: s.runLots,
      add: s.add,
      update: s.updateEveryTenth,
      clear: s.clear,
      swapRows: s.swapRows,
      select: s.select,
      remove: s.remove,
    });
  }, [store, onReady]);

  return (
    <div className="container">
      <table className="table table-hover table-striped test-data">
        <tbody>
          {data.map((item) => (
            <Row
              key={item.id}
              item={item}
              isSelected={selected === item.id}
              store={store}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
