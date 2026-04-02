import { Cubit, acquire, release } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect, useRef } from 'react';
import { SCENARIO_CONFIGS } from '../../shared/rerender-scenarios';
import type {
  DeepNestedState,
  RerenderBenchmarkProps,
  WideState,
} from '../../shared/types';
import { createDeepNestedState, createWideState } from '../../shared/types';

class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
  updateField0 = () => this.patch({ field0: this.state.field0 + 1 });
  updateField15 = () => this.patch({ field15: this.state.field15 + 1 });
}

class NestedBloc extends Cubit<DeepNestedState> {
  constructor() {
    super(createDeepNestedState());
  }
  updateTheme = () => {
    const s = this.state;
    this.emit({
      user: {
        ...s.user,
        settings: {
          ...s.user.settings,
          theme: s.user.settings.theme === 'dark' ? 'light' : 'dark',
        },
      },
    });
  };
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
  const [state] = useBloc(WideBloc);
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
  const [state] = useBloc(NestedBloc);
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

function MixedMediumConsumer({
  index,
  startField,
  renderCounts,
}: {
  index: number;
  startField: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(WideBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const v0 = state[`field${startField}` as keyof WideState] as number;
  const v1 = state[`field${startField + 1}` as keyof WideState] as number;
  const v2 = state[`field${startField + 2}` as keyof WideState] as number;
  const v3 = state[`field${startField + 3}` as keyof WideState] as number;
  return (
    <div data-consumer={index}>
      {v0},{v1},{v2},{v3}
    </div>
  );
}

function MixedWideConsumer({
  index,
  renderCounts,
}: {
  index: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(WideBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    sum += state[`field${i}` as keyof WideState] as number;
  }
  return <div data-consumer={index}>{sum}</div>;
}

export const BlacRerenderBenchmark: React.FC<RerenderBenchmarkProps> = ({
  scenario,
  onReady,
}) => {
  const renderCountsRef = useRef<number[]>(
    Array.from({ length: SCENARIO_CONFIGS[scenario].consumerCount }, () => 0),
  );

  const wideBlocRef = useRef(acquire(WideBloc));
  const nestedBlocRef = useRef(acquire(NestedBloc));

  useEffect(() => {
    return () => {
      release(WideBloc);
      release(NestedBloc);
    };
  }, []);

  useEffect(() => {
    const config = SCENARIO_CONFIGS[scenario];
    renderCountsRef.current = Array.from(
      { length: config.consumerCount },
      () => 0,
    );

    const wideBloc = wideBlocRef.current;
    const nestedBloc = nestedBlocRef.current;

    let triggerFn: () => void;
    switch (scenario) {
      case 'singleField':
      case 'manyConsumers':
      case 'mixedReads':
        triggerFn = () => wideBloc.updateField0();
        break;
      case 'unrelatedUpdate':
        triggerFn = () => wideBloc.updateField15();
        break;
      case 'nestedPaths':
        triggerFn = () => nestedBloc.updateTheme();
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
      <div>
        {paths.map((path, i) => (
          <NestedConsumer
            key={path}
            index={i}
            path={path}
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
            renderCounts={renderCounts}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
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
    </div>
  );
};
