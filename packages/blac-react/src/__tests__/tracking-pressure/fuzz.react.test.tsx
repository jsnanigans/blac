// Differential fuzz through the real `useBloc`: state proxies, getters,
// cross-bloc `.track()` deps (including one dep tracked by two getters),
// `select`, StrictMode, unrelated parent re-renders and mount/unmount churn.
// After every mutation each mounted component's last render must equal its
// reader run on the raw state.
//
// Scale up locally: FUZZ_SEEDS=500 FUZZ_STEPS=40 vp test run fuzz.react
import { describe, it, expect } from 'vite-plus/test';
import { StrictMode, useState, type ReactNode } from 'react';
import { render, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../../useBloc';
import {
  genMutation,
  genReader,
  genState,
  rng,
  serialize,
  type Reader,
} from './gen';

blacTestSetup();

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 40);
const STEPS = Number(process.env.FUZZ_STEPS ?? 25);
const FIRST_SEED = Number(process.env.FUZZ_SEED ?? 1);
const READERS = 6;

type Tree = Record<string, unknown>;
type Mode = 'state' | 'getter' | 'dep' | 'dep-pair' | 'select';
const MODES: Mode[] = ['state', 'getter', 'dep', 'dep-pair', 'select'];

class FuzzCubit extends Cubit<Tree> {
  set(next: Tree) {
    this.emit(next);
  }
  merge(partial: Tree) {
    this.patch(partial as never);
  }
}

function makeClasses(readers: Reader[], initial: Tree) {
  const Bloc = class extends FuzzCubit {
    constructor() {
      super(initial);
    }
  };
  const Host = class extends Cubit<{ n: number }> {
    dep = this.depend(Bloc);
    constructor() {
      super({ n: 0 });
    }
  };
  readers.forEach((reader, i) => {
    Object.defineProperty(Bloc.prototype, `g${i}`, {
      get(this: FuzzCubit) {
        return reader.read(this.state);
      },
    });
    Object.defineProperty(Host.prototype, `d${i}`, {
      get(this: InstanceType<typeof Host>) {
        const [s] = this.dep.track();
        return reader.read(s);
      },
    });
  });
  return { Bloc, Host };
}

async function runSeed(seed: number): Promise<void> {
  const r = rng(seed);
  const initial = genState(r);
  const readers = Array.from({ length: READERS }, () => genReader(r, initial));
  const { Bloc, Host } = makeClasses(readers, initial);
  const outputs = new Map<string, string>();
  let bloc!: FuzzCubit;
  let setSpecs!: (fn: (s: Spec[]) => Spec[]) => void;
  let rerender!: () => void;

  type Spec = { key: string; mode: Mode; reader: number; other: number };
  let keySeq = 0;
  const spec = (): Spec => ({
    key: `c${keySeq++}`,
    mode: r.pick(MODES),
    reader: r.int(READERS),
    other: r.int(READERS),
  });

  const expectedFor = (s: Spec): string => {
    const raw = bloc.state;
    if (s.mode === 'dep-pair') {
      return serialize([
        readers[s.reader].read(raw),
        readers[s.other].read(raw),
      ]);
    }
    return serialize(readers[s.reader].read(raw));
  };

  // One component per mode; a spec keeps its mode for its whole life.
  const read = (s: Spec, st: unknown) => readers[s.reader].read(st);
  function useSelectView(s: Spec) {
    const [, b] = useBloc(Bloc, { select: (st) => [serialize(read(s, st))] });
    return read(s, b.state);
  }
  function useStateView(s: Spec) {
    return read(s, useBloc(Bloc)[0]);
  }
  function useGetterView(s: Spec) {
    return (useBloc(Bloc)[1] as unknown as Tree)[`g${s.reader}`];
  }
  function useDepView(s: Spec) {
    return (useBloc(Host)[1] as unknown as Tree)[`d${s.reader}`];
  }
  function useDepPairView(s: Spec) {
    const host = useBloc(Host)[1] as unknown as Tree;
    return [host[`d${s.reader}`], host[`d${s.other}`]];
  }
  const views: Record<Mode, (s: Spec) => unknown> = {
    select: useSelectView,
    state: useStateView,
    getter: useGetterView,
    dep: useDepView,
    'dep-pair': useDepPairView,
  };
  const components = Object.fromEntries(
    MODES.map((mode) => [
      mode,
      ({ s }: { s: Spec }) => {
        outputs.set(s.key, serialize(views[mode](s)));
        return null;
      },
    ]),
  ) as Record<Mode, (props: { s: Spec }) => null>;

  function Grab() {
    const [, b] = useBloc(Bloc, { select: () => [] });
    bloc = b as FuzzCubit;
    return null;
  }

  function App() {
    const [specs, set] = useState(() => Array.from({ length: 6 }, spec));
    const [, setTick] = useState(0);
    setSpecs = set;
    rerender = () => setTick((t) => t + 1);
    return (
      <>
        <Grab />
        {specs.map((s) => {
          const View = components[s.mode];
          return <View key={s.key} s={s} />;
        })}
      </>
    );
  }

  let specsNow: Spec[] = [];
  const Track = ({ children }: { children: ReactNode }) => children;
  const strict = r.chance(0.5);
  const tree = strict ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <Track>
      <App />
    </Track>
  );
  const view = render(tree);
  const log: string[] = [];

  for (let step = 0; step < STEPS; step++) {
    const m = genMutation(r, bloc.state);
    log.push(m.label);
    await act(async () => {
      if (m.kind === 'emit') bloc.set(m.next(bloc.state));
      else bloc.merge(m.patch(bloc.state));
    });
    await act(async () => {
      setSpecs((s) => (specsNow = s));
    });
    for (const s of specsNow) {
      const got = outputs.get(s.key);
      const want = expectedFor(s);
      if (got !== want) {
        const labels = [
          readers[s.reader].label,
          s.mode === 'dep-pair' ? readers[s.other].label : '',
        ];
        throw new Error(
          [
            `STALE seed=${seed} step=${step} mode=${s.mode} strict=${strict}`,
            `reader: ${labels.filter(Boolean).join(' || ')}`,
            `rendered: ${got}`,
            `expected: ${want}`,
            `mutations: ${log.join(' -> ')}`,
          ].join('\n'),
        );
      }
    }
    if (r.chance(0.3)) await act(async () => rerender());
    if (r.chance(0.2)) {
      await act(async () => {
        setSpecs((s) => {
          const drop = r.int(s.length);
          return [...s.filter((_, i) => i !== drop), spec()];
        });
      });
    }
  }
  view.unmount();
}

describe('dependency tracking fuzz (react)', () => {
  it(`${SEEDS} seeds x ${STEPS} steps never leave a component stale`, async () => {
    for (let seed = FIRST_SEED; seed < FIRST_SEED + SEEDS; seed++) {
      await runSeed(seed);
    }
    expect(true).toBe(true);
  }, 300_000);
});
