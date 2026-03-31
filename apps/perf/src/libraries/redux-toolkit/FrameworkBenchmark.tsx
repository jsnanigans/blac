import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import React, { memo, useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { buildData, resetId } from '../../shared/data';
import type { BenchmarkAPI, DataItem } from '../../shared/types';

interface DemoState {
  data: DataItem[];
  selected: number | null;
}

const initialState: DemoState = { data: [], selected: null };

const demoSlice = createSlice({
  name: 'demo',
  initialState,
  reducers: {
    run(state) {
      resetId();
      state.data = buildData(1000);
      state.selected = null;
    },
    runLots(state) {
      resetId();
      state.data = buildData(10000);
      state.selected = null;
    },
    add(state) {
      state.data.push(...buildData(1000));
    },
    updateEveryTenth(state) {
      for (let i = 0, len = state.data.length; i < len; i += 10) {
        state.data[i] = {
          id: state.data[i].id,
          label: state.data[i].label + ' !!!',
        };
      }
    },
    select(state, action: PayloadAction<number>) {
      state.selected = action.payload;
    },
    remove(state, action: PayloadAction<number>) {
      const idx = state.data.findIndex((d) => d.id === action.payload);
      if (idx !== -1) state.data.splice(idx, 1);
    },
    clear(state) {
      state.data = [];
      state.selected = null;
    },
    swapRows(state) {
      if (state.data.length > 998) {
        const tmp = state.data[1];
        state.data[1] = state.data[998];
        state.data[998] = tmp;
      }
    },
  },
});

type AppDispatch = ReturnType<typeof createDemoStore>['dispatch'];
type RootState = DemoState;

function createDemoStore() {
  return configureStore({
    reducer: demoSlice.reducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}

const Row: React.FC<{
  item: DataItem;
  isSelected: boolean;
}> = memo(({ item, isSelected }) => {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <tr className={isSelected ? 'danger' : ''}>
      <td className="col-md-1">{item.id}</td>
      <td className="col-md-4">
        <a onClick={() => dispatch(demoSlice.actions.select(item.id))}>
          {item.label}
        </a>
      </td>
      <td className="col-md-1">
        <a onClick={() => dispatch(demoSlice.actions.remove(item.id))}>
          <span className="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
      <td className="col-md-6" />
    </tr>
  );
});

const BenchmarkInner: React.FC<{
  onReady: (api: BenchmarkAPI) => void;
}> = ({ onReady }) => {
  const dispatch = useDispatch<AppDispatch>();
  const data = useSelector((state: RootState) => state.data);
  const selected = useSelector((state: RootState) => state.selected);

  useEffect(() => {
    onReady({
      run: () => dispatch(demoSlice.actions.run()),
      runLots: () => dispatch(demoSlice.actions.runLots()),
      add: () => dispatch(demoSlice.actions.add()),
      update: () => dispatch(demoSlice.actions.updateEveryTenth()),
      clear: () => dispatch(demoSlice.actions.clear()),
      swapRows: () => dispatch(demoSlice.actions.swapRows()),
      select: (id: number) => dispatch(demoSlice.actions.select(id)),
      remove: (id: number) => dispatch(demoSlice.actions.remove(id)),
    });
  }, [dispatch, onReady]);

  return (
    <div className="container">
      <table className="table table-hover table-striped test-data">
        <tbody>
          {data.map((item) => (
            <Row key={item.id} item={item} isSelected={selected === item.id} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ReduxToolkitFrameworkBenchmark: React.FC<{
  onReady: (api: BenchmarkAPI) => void;
}> = ({ onReady }) => {
  const storeRef = useRef(createDemoStore());

  return (
    <Provider store={storeRef.current}>
      <BenchmarkInner onReady={onReady} />
    </Provider>
  );
};
