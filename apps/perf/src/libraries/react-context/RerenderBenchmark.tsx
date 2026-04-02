import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SCENARIO_CONFIGS } from '../../shared/rerender-scenarios';
import type {
  DeepNestedState,
  RerenderBenchmarkProps,
  WideState,
} from '../../shared/types';
import { createDeepNestedState, createWideState } from '../../shared/types';

const WideStateContext = createContext<WideState>(createWideState());
const NestedStateContext = createContext<DeepNestedState>(
  createDeepNestedState(),
);

function WideFieldConsumer({
  index,
  fieldIndex,
  renderCounts,
}: {
  index: number;
  fieldIndex: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useContext(WideStateContext);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value = state[`field${fieldIndex}` as keyof WideState] as number;
  return <div data-consumer={index}>{value}</div>;
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
  const state = useContext(NestedStateContext);
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
  renderCounts,
}: {
  index: number;
  fieldIndex: number | null;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const state = useContext(WideStateContext);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value =
    fieldIndex !== null
      ? (state[`field${fieldIndex}` as keyof WideState] as number)
      : (Object.keys(createWideState()) as (keyof WideState)[]).reduce(
          (sum, k) => sum + (state[k] as number),
          0,
        );
  return <div data-consumer={index}>{value}</div>;
}

function WideConsumers({
  count,
  fieldIndexFn,
  renderCounts,
}: {
  count: number;
  fieldIndexFn: (i: number) => number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <WideFieldConsumer
          key={i}
          index={i}
          fieldIndex={fieldIndexFn(i)}
          renderCounts={renderCounts}
        />
      ))}
    </>
  );
}

export const ContextRerenderBenchmark: React.FC<RerenderBenchmarkProps> = ({
  scenario,
  onReady,
}) => {
  const renderCountsRef = useRef<number[]>(
    Array.from({ length: SCENARIO_CONFIGS[scenario].consumerCount }, () => 0),
  );
  const [wideState, setWideState] = useState<WideState>(createWideState);
  const [nestedState, setNestedState] = useState<DeepNestedState>(
    createDeepNestedState,
  );

  useEffect(() => {
    const config = SCENARIO_CONFIGS[scenario];
    renderCountsRef.current = Array.from(
      { length: config.consumerCount },
      () => 0,
    );

    let triggerFn: () => void;
    switch (scenario) {
      case 'singleField':
      case 'manyConsumers':
      case 'mixedReads':
        triggerFn = () =>
          setWideState((prev) => ({ ...prev, field0: prev.field0 + 1 }));
        break;
      case 'unrelatedUpdate':
        triggerFn = () =>
          setWideState((prev) => ({ ...prev, field15: prev.field15 + 1 }));
        break;
      case 'nestedPaths':
        triggerFn = () =>
          setNestedState((prev) => ({
            user: {
              ...prev.user,
              settings: {
                ...prev.user.settings,
                theme: prev.user.settings.theme === 'dark' ? 'light' : 'dark',
              },
            },
          }));
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

  const renderCounts = renderCountsRef;

  if (scenario === 'nestedPaths') {
    const paths = ['name', 'age', 'theme', 'lang'] as const;
    return (
      <NestedStateContext.Provider value={nestedState}>
        {paths.map((path, i) => (
          <NestedConsumer
            key={path}
            index={i}
            path={path}
            renderCounts={renderCounts}
          />
        ))}
      </NestedStateContext.Provider>
    );
  }

  if (scenario === 'singleField') {
    return (
      <WideStateContext.Provider value={wideState}>
        <WideConsumers
          count={20}
          fieldIndexFn={(i) => i}
          renderCounts={renderCounts}
        />
      </WideStateContext.Provider>
    );
  }

  if (scenario === 'manyConsumers') {
    return (
      <WideStateContext.Provider value={wideState}>
        <WideConsumers
          count={100}
          fieldIndexFn={(i) => i % 20}
          renderCounts={renderCounts}
        />
      </WideStateContext.Provider>
    );
  }

  if (scenario === 'unrelatedUpdate') {
    return (
      <WideStateContext.Provider value={wideState}>
        <WideConsumers
          count={10}
          fieldIndexFn={(i) => i}
          renderCounts={renderCounts}
        />
      </WideStateContext.Provider>
    );
  }

  return (
    <WideStateContext.Provider value={wideState}>
      {Array.from({ length: 5 }, (_, i) => (
        <WideFieldConsumer
          key={`narrow-${i}`}
          index={i}
          fieldIndex={i}
          renderCounts={renderCounts}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <MixedConsumer
          key={`medium-${i}`}
          index={5 + i}
          fieldIndex={i * 4}
          renderCounts={renderCounts}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <MixedConsumer
          key={`wide-${i}`}
          index={10 + i}
          fieldIndex={null}
          renderCounts={renderCounts}
        />
      ))}
    </WideStateContext.Provider>
  );
};
