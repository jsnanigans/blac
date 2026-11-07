// Differential fuzz of render-time dependency tracking without React.
//
// Each probe mirrors one `useBloc` consumer: `trackRender` over the state with
// a per-probe `ProxyCache`, then `registerConsumerPaths` + `setInterest` at
// "commit". After every mutation a probe that was not woken must still render
// the same output as its reader on the raw state; a woken probe re-renders and
// its tracked output must equal the raw output (proxy transparency).
//
// Scale up locally: FUZZ_SEEDS=2000 FUZZ_STEPS=80 vp test run fuzz.core
import { describe, it, expect } from 'vite-plus/test';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import {
  trackRender,
  ProxyCache,
  type PathSubscription,
} from '@dirtytalk/structural';
import {
  genMutation,
  genReader,
  genState,
  rng,
  serialize,
  type Reader,
  type Rng,
} from './gen';

blacTestSetup();

const SEEDS = Number(process.env.FUZZ_SEEDS ?? 150);
const STEPS = Number(process.env.FUZZ_STEPS ?? 40);
const FIRST_SEED = Number(process.env.FUZZ_SEED ?? 1);

type Tree = Record<string, unknown>;

class FuzzCubit extends Cubit<Tree> {
  set(next: Tree) {
    this.emit(next);
  }
  merge(partial: Tree) {
    this.patch(partial as never);
  }
}

let probeSeq = 0;

class Probe {
  readonly id = `probe-${probeSeq++}`;
  readonly cache = new ProxyCache();
  readonly sub: PathSubscription;
  out = '';
  woken = false;
  paths: Set<number> = new Set();

  constructor(
    readonly bloc: FuzzCubit,
    readonly reader: Reader,
  ) {
    this.sub = bloc.subscribePaths(() => {
      this.woken = true;
    });
    this.render();
  }

  render(): void {
    const t = trackRender(this.bloc.state, this.bloc.interner, this.cache);
    this.out = serialize(this.reader.read(t.value));
    t.disarm();
    this.paths = t.paths as Set<number>;
    this.bloc.registerConsumerPaths(this.id, t.paths);
    this.sub.setInterest(t.paths);
    this.woken = false;
  }

  unmount(): void {
    this.sub.unsubscribe();
    this.bloc.unregisterConsumer(this.id);
  }

  describePaths(): string[] {
    return [...this.paths].map((id) =>
      JSON.stringify(this.bloc.interner.lookup(id)),
    );
  }
}

const flush = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

async function runSeed(
  seed: number,
): Promise<{ wakes: number; wasted: number }> {
  const r: Rng = rng(seed);
  // A class per seed: interners and getter caches are per constructor.
  const Bloc = class extends FuzzCubit {};
  const bloc = new Bloc(genState(r));
  let probes = Array.from(
    { length: 6 },
    () => new Probe(bloc, genReader(r, bloc.state)),
  );
  const log: string[] = [];
  let wakes = 0;
  let wasted = 0;

  for (let step = 0; step < STEPS; step++) {
    const m = genMutation(r, bloc.state);
    log.push(m.label);
    if (m.kind === 'emit') bloc.set(m.next(bloc.state));
    else bloc.merge(m.patch(bloc.state));
    await flush();

    for (const p of probes) {
      const expected = serialize(p.reader.read(bloc.state));
      if (p.woken) {
        wakes++;
        const before = p.out;
        p.render();
        if (p.out === before) wasted++;
        expect(
          p.out,
          `seed ${seed} step ${step}: tracked != raw for [${p.reader.label}]`,
        ).toBe(expected);
      } else if (expected !== p.out) {
        throw new Error(
          [
            `STALE seed=${seed} step=${step}`,
            `reader: ${p.reader.label}`,
            `paths: ${p.describePaths().join(', ')}`,
            `rendered: ${p.out}`,
            `expected: ${expected}`,
            `mutations: ${log.join(' -> ')}`,
          ].join('\n'),
        );
      }
    }

    // Churn: an unrelated re-render (proxy reuse) and mount/unmount.
    if (r.chance(0.3)) r.pick(probes).render();
    if (r.chance(0.15)) {
      const gone = r.pick(probes);
      gone.unmount();
      probes = probes.filter((p) => p !== gone);
      probes.push(new Probe(bloc, genReader(r, bloc.state)));
    }
  }
  for (const p of probes) p.unmount();
  return { wakes, wasted };
}

describe('dependency tracking fuzz (core)', () => {
  it(`${SEEDS} seeds x ${STEPS} steps never leave a consumer stale`, async () => {
    let wakes = 0;
    let wasted = 0;
    for (let seed = FIRST_SEED; seed < FIRST_SEED + SEEDS; seed++) {
      const res = await runSeed(seed);
      wakes += res.wakes;
      wasted += res.wasted;
    }
    if (process.env.FUZZ_STATS) {
      console.log(
        `wakes=${wakes} wasted=${wasted} (${((100 * wasted) / wakes).toFixed(1)}%)`,
      );
    }
  }, 120_000);
});
