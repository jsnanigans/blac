import React, { useEffect, useRef } from 'react';
import { createStore, useStore } from 'zustand';
import { SCENARIO_CONFIGS } from '../../shared/rerender-scenarios';
import type {
  DeepNestedState,
  RerenderBenchmarkProps,
  WideState,
} from '../../shared/types';
import { createDeepNestedState, createWideState } from '../../shared/types';

type WideStoreState = WideState & {
  updateField0: () => void;
  updateField15: () => void;
};

type NestedStoreState = DeepNestedState & {
  updateTheme: () => void;
};

function createWideZustandStore() {
  return createStore<WideStoreState>((set) => ({
    ...createWideState(),
    updateField0: () => set((s) => ({ field0: s.field0 + 1 })),
    updateField15: () => set((s) => ({ field15: s.field15 + 1 })),
  }));
}

function createNestedZustandStore() {
  return createStore<NestedStoreState>((set) => ({
    ...createDeepNestedState(),
    updateTheme: () =>
      set((s) => ({
        user: {
          ...s.user,
          settings: {
            ...s.user.settings,
            theme: s.user.settings.theme === 'dark' ? 'light' : 'dark',
          },
        },
      })),
  }));
}

function WideFieldConsumer({
  index,
  fieldIndex,
  store,
  renderCounts,
}: {
  index: number;
  fieldIndex: number;
  store: ReturnType<typeof createWideZustandStore>;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useStore(store);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value = state[`field${fieldIndex}` as keyof WideState] as number;
  return <div data-consumer={index}>{value}</div>;
}

function NestedConsumer({
  index,
  path,
  store,
  renderCounts,
}: {
  index: number;
  path: 'name' | 'age' | 'theme' | 'lang';
  store: ReturnType<typeof createNestedZustandStore>;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useStore(store);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  let value: unknown;
  switch (path) {
    case 'name':
      value = state.user.profile.name;
      break;
    case 'age':
      value = state.user.profile.age;
      break;
    case 'theme':
      value = state.user.settings.theme;
      break;
    case 'lang':
      value = state.user.settings.lang;
      break;
  }
  return <div data-consumer={index}>{String(value)}</div>;
}

function MixedConsumer({
  index,
  fieldIndex,
  store,
  renderCounts,
}: {
  index: number;
  fieldIndex: number | null;
  store: ReturnType<typeof createWideZustandStore>;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useStore(store);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value =
    fieldIndex !== null
      ? (state[`field${fieldIndex}` as keyof WideState] as number)
      : Object.keys(createWideState()).reduce(
          (sum, k) => sum + (state[k as keyof WideState] as number),
          0,
        );
  return <div data-consumer={index}>{value}</div>;
}

export const ZustandNoSelectorRerenderBenchmark: React.FC<
  RerenderBenchmarkProps
> = ({ scenario, onReady }) => {
  const renderCountsRef = useRef<number[]>(
    Array.from({ length: SCENARIO_CONFIGS[scenario].consumerCount }, () => 0),
  );
  const wideStoreRef = useRef(createWideZustandStore());
  const nestedStoreRef = useRef(createNestedZustandStore());

  useEffect(() => {
    const config = SCENARIO_CONFIGS[scenario];
    renderCountsRef.current = Array.from(
      { length: config.consumerCount },
      () => 0,
    );

    const wideStore = wideStoreRef.current;
    const nestedStore = nestedStoreRef.current;

    let triggerFn: () => void;
    switch (scenario) {
      case 'singleField':
      case 'manyConsumers':
      case 'mixedReads':
        triggerFn = () => wideStore.getState().updateField0();
        break;
      case 'unrelatedUpdate':
        triggerFn = () => wideStore.getState().updateField15();
        break;
      case 'nestedPaths':
        triggerFn = () => nestedStore.getState().updateTheme();
        break;
    }

    onReady({
      trigger: triggerFn,
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
  }, [scenario, onReady]);

  const wideStore = wideStoreRef.current;
  const nestedStore = nestedStoreRef.current;
  const renderCounts = renderCountsRef;

  if (scenario === 'nestedPaths') {
    const paths = ['name', 'age', 'theme', 'lang'] as const;
    return (
      <div>
        {paths.map((path, i) => (
          <NestedConsumer
            key={path}
            index={i}
            path={path}
            store={nestedStore}
            renderCounts={renderCounts}
          />
        ))}
      </div>
    );
  }

  if (scenario === 'singleField') {
    return (
      <div>
        {Array.from({ length: 20 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i}
            store={wideStore}
            renderCounts={renderCounts}
          />
        ))}
      </div>
    );
  }

  if (scenario === 'manyConsumers') {
    return (
      <div>
        {Array.from({ length: 100 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i % 20}
            store={wideStore}
            renderCounts={renderCounts}
          />
        ))}
      </div>
    );
  }

  if (scenario === 'unrelatedUpdate') {
    return (
      <div>
        {Array.from({ length: 10 }, (_, i) => (
          <WideFieldConsumer
            key={i}
            index={i}
            fieldIndex={i}
            store={wideStore}
            renderCounts={renderCounts}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {Array.from({ length: 5 }, (_, i) => (
        <MixedConsumer
          key={`narrow-${i}`}
          index={i}
          fieldIndex={i}
          store={wideStore}
          renderCounts={renderCounts}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <MixedConsumer
          key={`medium-${i}`}
          index={5 + i}
          fieldIndex={i * 4}
          store={wideStore}
          renderCounts={renderCounts}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <MixedConsumer
          key={`wide-${i}`}
          index={10 + i}
          fieldIndex={null}
          store={wideStore}
          renderCounts={renderCounts}
        />
      ))}
    </div>
  );
};
