import React, { createContext, useContext, useEffect } from 'react';
import type { NestedPath, RerenderStore } from './types';

type Consumer =
  | { kind: 'field'; field: number }
  | { kind: 'fields'; start: number }
  | { kind: 'sum' }
  | { kind: 'nested'; path: NestedPath };

export interface RerenderScenario {
  label: string;
  description: string;
  consumers: Consumer[];
  trigger: (store: RerenderStore) => void;
  /** Consumers whose rendered output changes, so must re-render. */
  optimalRenders: number;
}

const fields = (count: number, field: (i: number) => number): Consumer[] =>
  Array.from({ length: count }, (_, i) => ({ kind: 'field', field: field(i) }));

export const RERENDER_SCENARIOS: Record<string, RerenderScenario> = {
  singleField: {
    label: 'Single field (20 consumers)',
    description: '20 consumers each reading one of 20 fields; update field0',
    consumers: fields(20, (i) => i),
    trigger: (s) => s.bump(0),
    optimalRenders: 1,
  },
  manyConsumers: {
    label: 'Many consumers (100)',
    description: '100 consumers, 5 per field; update field0',
    consumers: fields(100, (i) => i % 20),
    trigger: (s) => s.bump(0),
    optimalRenders: 5,
  },
  nestedPaths: {
    label: 'Nested paths (4 consumers)',
    description: '4 consumers on different nested leaves; update theme',
    consumers: (['name', 'age', 'theme', 'lang'] as const).map((path) => ({
      kind: 'nested',
      path,
    })),
    trigger: (s) => s.toggleTheme(),
    optimalRenders: 1,
  },
  mixedReads: {
    label: 'Mixed read widths (15 consumers)',
    description: '5 read 1 field, 5 read 4 fields, 5 sum all 20; update field0',
    consumers: [
      ...fields(5, (i) => i),
      ...[0, 4, 8, 12, 16].map(
        (start): Consumer => ({ kind: 'fields', start }),
      ),
      ...Array.from({ length: 5 }, (): Consumer => ({ kind: 'sum' })),
    ],
    trigger: (s) => s.bump(0),
    optimalRenders: 7,
  },
  unrelatedUpdate: {
    label: 'Unrelated update (10 consumers)',
    description: '10 consumers reading fields 0-9; update field15',
    consumers: fields(10, (i) => i),
    trigger: (s) => s.bump(15),
    optimalRenders: 0,
  },
};

export interface RerenderAPI {
  trigger: () => void;
  /** Renders since the last call. */
  takeRenders: () => number;
}

interface Ctx {
  store: RerenderStore;
  counts: { renders: number };
}

const RerenderCtx = createContext<Ctx | null>(null);

function useCtx(): Ctx {
  const ctx = useContext(RerenderCtx);
  if (!ctx) throw new Error('Rerender consumer outside its tree');
  ctx.counts.renders++;
  return ctx;
}

function FieldConsumer({ field }: { field: number }) {
  return <div>{useCtx().store.useField(field)}</div>;
}

function FieldsConsumer({ start }: { start: number }) {
  return <div>{useCtx().store.useFields(start, 4).join(',')}</div>;
}

function SumConsumer() {
  return <div>{useCtx().store.useFieldSum()}</div>;
}

function NestedConsumer({ path }: { path: NestedPath }) {
  return <div>{useCtx().store.useNested(path)}</div>;
}

function renderConsumer(c: Consumer, key: number): React.ReactElement {
  switch (c.kind) {
    case 'field':
      return <FieldConsumer key={key} field={c.field} />;
    case 'fields':
      return <FieldsConsumer key={key} start={c.start} />;
    case 'sum':
      return <SumConsumer key={key} />;
    case 'nested':
      return <NestedConsumer key={key} path={c.path} />;
  }
}

export function RerenderTree({
  store,
  scenario,
  onReady,
}: {
  store: RerenderStore;
  scenario: RerenderScenario;
  onReady: (api: RerenderAPI) => void;
}) {
  const [ctx] = React.useState<Ctx>(() => ({ store, counts: { renders: 0 } }));
  useEffect(() => {
    onReady({
      trigger: () => scenario.trigger(store),
      takeRenders: () => {
        const n = ctx.counts.renders;
        ctx.counts.renders = 0;
        return n;
      },
    });
    return () => store.dispose?.();
  }, [ctx, store, scenario, onReady]);

  const Provider = store.Provider ?? React.Fragment;
  return (
    <RerenderCtx.Provider value={ctx}>
      <Provider>{scenario.consumers.map(renderConsumer)}</Provider>
    </RerenderCtx.Provider>
  );
}
