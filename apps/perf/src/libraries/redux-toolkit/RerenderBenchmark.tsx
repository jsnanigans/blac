import { configureStore, createSlice } from '@reduxjs/toolkit';
import React, { useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector, shallowEqual } from 'react-redux';
import { SCENARIO_CONFIGS } from '../../shared/rerender-scenarios';
import type {
  DeepNestedState,
  RerenderBenchmarkProps,
  WideState,
} from '../../shared/types';
import { createDeepNestedState, createWideState } from '../../shared/types';

const wideSlice = createSlice({
  name: 'wide',
  initialState: createWideState(),
  reducers: {
    updateField0(state) {
      state.field0 += 1;
    },
    updateField15(state) {
      state.field15 += 1;
    },
  },
});

const nestedSlice = createSlice({
  name: 'nested',
  initialState: createDeepNestedState(),
  reducers: {
    updateTheme(state) {
      state.user.settings.theme =
        state.user.settings.theme === 'dark' ? 'light' : 'dark';
    },
  },
});

type WideRootState = WideState;
type NestedRootState = DeepNestedState;

function createWideReduxStore() {
  return configureStore({
    reducer: wideSlice.reducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}

function createNestedReduxStore() {
  return configureStore({
    reducer: nestedSlice.reducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false, immutableCheck: false }),
  });
}

function WideFieldConsumer({
  index,
  fieldIndex,
  renderCounts,
}: {
  index: number;
  fieldIndex: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const fieldKey = `field${fieldIndex}` as keyof WideState;
  const value = useSelector((state: WideRootState) => state[fieldKey]);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{value as number}</div>;
}

function NestedConsumer({
  index,
  path,
  renderCounts,
}: {
  index: number;
  path: 'name' | 'age' | 'theme' | 'lang';
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const value = useSelector((state: NestedRootState) => {
    switch (path) {
      case 'name':
        return state.user.profile.name;
      case 'age':
        return state.user.profile.age;
      case 'theme':
        return state.user.settings.theme;
      case 'lang':
        return state.user.settings.lang;
    }
  });
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{String(value)}</div>;
}

function MixedMediumConsumer({
  index,
  startField,
  renderCounts,
}: {
  index: number;
  startField: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const values = useSelector(
    (state: WideRootState) => [
      state[`field${startField}` as keyof WideState] as number,
      state[`field${startField + 1}` as keyof WideState] as number,
      state[`field${startField + 2}` as keyof WideState] as number,
      state[`field${startField + 3}` as keyof WideState] as number,
    ],
    shallowEqual,
  );
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{values.join(',')}</div>;
}

function MixedWideConsumer({
  index,
  renderCounts,
}: {
  index: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useSelector((s: WideRootState) => s);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    sum += state[`field${i}` as keyof WideState] as number;
  }
  return <div data-consumer={index}>{sum}</div>;
}

type WideStore = ReturnType<typeof createWideReduxStore>;
type NestedStore = ReturnType<typeof createNestedReduxStore>;

function WideInner({
  scenario,
  renderCounts,
}: {
  scenario: string;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  if (scenario === 'singleField') {
    return (
      <>
        {Array.from({ length: 20 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i}
            renderCounts={renderCounts}
          />
        ))}
      </>
    );
  }
  if (scenario === 'manyConsumers') {
    return (
      <>
        {Array.from({ length: 100 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i % 20}
            renderCounts={renderCounts}
          />
        ))}
      </>
    );
  }
  if (scenario === 'unrelatedUpdate') {
    return (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i}
            renderCounts={renderCounts}
          />
        ))}
      </>
    );
  }
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <WideFieldConsumer
          key={`narrow-${i}`}
          index={i}
          fieldIndex={i}
          renderCounts={renderCounts}
        />
      ))}
      {[0, 4, 8, 12, 16].map((startField, i) => (
        <MixedMediumConsumer
          key={`medium-${i}`}
          index={5 + i}
          startField={startField}
          renderCounts={renderCounts}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <MixedWideConsumer
          key={`wide-${i}`}
          index={10 + i}
          renderCounts={renderCounts}
        />
      ))}
    </>
  );
}

function NestedInner({
  renderCounts,
}: {
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const paths = ['name', 'age', 'theme', 'lang'] as const;
  return (
    <>
      {paths.map((path, i) => (
        <NestedConsumer
          key={path}
          index={i}
          path={path}
          renderCounts={renderCounts}
        />
      ))}
    </>
  );
}

function DispatchInner({
  scenario,
  onReady,
  renderCounts,
}: {
  scenario: string;
  onReady: (api: { trigger: () => void }) => void;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    let triggerFn: () => void;
    switch (scenario) {
      case 'singleField':
      case 'manyConsumers':
      case 'mixedReads':
        triggerFn = () => dispatch(wideSlice.actions.updateField0());
        break;
      case 'unrelatedUpdate':
        triggerFn = () => dispatch(wideSlice.actions.updateField15());
        break;
      default:
        triggerFn = () => {};
    }
    onReady({ trigger: triggerFn });
  }, [scenario, dispatch, onReady]);

  return <WideInner scenario={scenario} renderCounts={renderCounts} />;
}

function NestedDispatchInner({
  onReady,
  renderCounts,
}: {
  onReady: (api: { trigger: () => void }) => void;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    onReady({ trigger: () => dispatch(nestedSlice.actions.updateTheme()) });
  }, [dispatch, onReady]);

  return <NestedInner renderCounts={renderCounts} />;
}

export const ReduxRerenderBenchmark: React.FC<RerenderBenchmarkProps> = ({
  scenario,
  onReady,
}) => {
  const renderCountsRef = useRef<number[]>(
    Array.from({ length: SCENARIO_CONFIGS[scenario].consumerCount }, () => 0),
  );
  const wideStoreRef = useRef<WideStore | null>(null);
  const nestedStoreRef = useRef<NestedStore | null>(null);

  if (!wideStoreRef.current) wideStoreRef.current = createWideReduxStore();
  if (!nestedStoreRef.current)
    nestedStoreRef.current = createNestedReduxStore();

  useEffect(() => {
    const config = SCENARIO_CONFIGS[scenario];
    renderCountsRef.current = Array.from(
      { length: config.consumerCount },
      () => 0,
    );
  }, [scenario]);

  const handleInnerReady = (inner: { trigger: () => void }) => {
    const config = SCENARIO_CONFIGS[scenario];
    onReady({
      trigger: inner.trigger,
      getRenderCounts: () => [...renderCountsRef.current],
      resetRenderCounts: () => {
        renderCountsRef.current = Array.from(
          { length: config.consumerCount },
          () => 0,
        );
      },
      getConsumerCount: () => config.consumerCount,
      getOptimalRenders: () => config.optimalRenders,
    });
  };

  const renderCounts = renderCountsRef;

  if (scenario === 'nestedPaths') {
    return (
      <Provider store={nestedStoreRef.current}>
        <NestedDispatchInner
          onReady={handleInnerReady}
          renderCounts={renderCounts}
        />
      </Provider>
    );
  }

  return (
    <Provider store={wideStoreRef.current}>
      <DispatchInner
        scenario={scenario}
        onReady={handleInnerReady}
        renderCounts={renderCounts}
      />
    </Provider>
  );
};
