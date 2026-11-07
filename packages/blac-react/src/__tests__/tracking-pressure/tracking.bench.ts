// Cost of dependency tracking per situation: recording reads during render,
// diffing on emit/patch, and dispatching to many consumers.
//
// Run: vp test bench --run tracking
import { bench, describe } from 'vite-plus/test';
import { Cubit } from '@blac/core';
import {
  trackRender,
  ProxyCache,
  type PathSubscription,
} from '@dirtytalk/structural';

type Item = {
  id: number;
  name: string;
  done: boolean;
  meta: { tags: string[] };
};
type Tree = Record<string, any>;

const items = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    name: `item ${i}`,
    done: false,
    meta: { tags: ['a'] },
  }));

class Store extends Cubit<Tree> {
  set(next: Tree) {
    this.emit(next);
  }
  merge(partial: Tree) {
    this.patch(partial as never);
  }
}

/** `n` consumers of `bloc`, consumer i rendering `read(state, i)` once. */
function consumers(
  bloc: Store,
  n: number,
  read: (s: Tree, i: number) => unknown,
) {
  const subs: PathSubscription[] = [];
  let woken = 0;
  for (let i = 0; i < n; i++) {
    const t = trackRender(bloc.state, bloc.interner);
    read(t.value, i);
    t.disarm();
    const sub = bloc.subscribePaths(() => woken++);
    sub.setInterest(t.paths);
    bloc.registerConsumerPaths(`c${i}`, t.paths);
    subs.push(sub);
  }
  return { woken: () => woken };
}

const flush = () => Promise.resolve();

describe('record: one render', () => {
  const list = { items: items(1000) };
  const wide = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`k${i}`, i]),
  );
  let deep: Tree = { v: 1 };
  for (let i = 0; i < 12; i++) deep = { child: deep };
  const interner = new Store({}).interner;
  const cache = new ProxyCache();

  bench('list map 1k rows x 2 fields', () => {
    const t = trackRender(list, interner);
    t.value.items.map((i) => i.name + i.done);
    t.disarm();
  });
  bench('list map 1k rows x 2 fields (reused ProxyCache)', () => {
    const t = trackRender(list, interner, cache);
    t.value.items.map((i) => i.name + i.done);
    t.disarm();
  });
  bench('wide object, 1k field reads', () => {
    const t = trackRender(wide, interner);
    for (let i = 0; i < 1000; i++) void t.value[`k${i}`];
    t.disarm();
  });
  bench('Object.keys + values of 1k-key dict', () => {
    const t = trackRender({ dict: wide }, interner);
    for (const k of Object.keys(t.value.dict)) void t.value.dict[k];
    t.disarm();
  });
  bench('12-deep chain read', () => {
    const t = trackRender(deep, interner);
    let v: Tree = t.value;
    while (v.child) v = v.child;
    void v.v;
    t.disarm();
  });
  bench('find + includes + filter on 1k rows', () => {
    const t = trackRender(list, interner);
    t.value.items.find((i) => i.id === 999);
    void t.value.items.filter((i) => i.done).length;
    t.value.items.includes(list.items[3]);
    t.disarm();
  });
});

describe('diff + dispatch: 1k row consumers', () => {
  const rowBloc = new Store({ items: items(1000), filter: 'all' });
  const rows = consumers(rowBloc, 1000, (s, i) => s.items[i].name);
  let n = 0;

  bench('emit: one row renamed', async () => {
    const next = rowBloc.state.items.slice();
    next[n % 1000] = { ...next[n % 1000], name: `renamed ${n++}` };
    rowBloc.set({ ...rowBloc.state, items: next });
    await flush();
  });
  bench('emit: unrelated field', async () => {
    rowBloc.set({ ...rowBloc.state, filter: `f${n++}` });
    await flush();
  });
  bench('patch: unrelated field', async () => {
    rowBloc.merge({ filter: `p${n++}` });
    await flush();
  });
  bench('patch: replace list atomically', async () => {
    rowBloc.merge({ items: items(1000) });
    await flush();
  });
  void rows;
});

describe('diff: shape flips', () => {
  const flipBloc = new Store({
    profile: Object.fromEntries(items(500).map((i) => [`f${i.id}`, i])),
  });
  consumers(flipBloc, 500, (s, i) => s.profile?.[`f${i}`]?.name);
  const full = flipBloc.state.profile;
  let on = false;

  bench('emit: parent with 500 readers below toggles null', async () => {
    flipBloc.set({ profile: on ? full : null });
    on = !on;
    await flush();
  });
});
