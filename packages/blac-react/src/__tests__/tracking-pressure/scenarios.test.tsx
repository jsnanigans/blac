// Targeted dependency-tracking scenarios: each reproduces a stale render the
// fuzz suites found (now fixed) or pins a known gap with `it.fails`, which
// flips to a failure once the gap is closed.
import { describe, it, expect } from 'vite-plus/test';
import { memo, useMemo } from 'react';
import { render, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../../useBloc';

blacTestSetup();

/** Mounts `read` as a tracked consumer of `Bloc`; returns the latest output and the bloc. */
function mount<B extends Cubit<any>>(
  Bloc: new () => B,
  read: (state: B['state'], bloc: B) => unknown,
) {
  const result = {
    out: undefined as unknown,
    renders: 0,
    bloc: undefined as unknown as B,
  };
  function Consumer() {
    const [state, bloc] = useBloc(Bloc as any);
    result.renders++;
    result.out = read(state as B['state'], bloc as B);
    return null;
  }
  function Grab() {
    const [, bloc] = useBloc(Bloc as any, { select: () => [] });
    result.bloc = bloc as B;
    return null;
  }
  render(
    <>
      <Consumer />
      <Grab />
    </>,
  );
  return result;
}

const change = (fn: () => void) => act(async () => fn());

class Store<S extends object> extends Cubit<S> {
  set = (next: S) => this.emit(next);
  merge = (partial: Partial<S>) => this.patch(partial as never);
}

describe('fixed: keys and shapes', () => {
  it('a key containing a dot (emails, file names)', async () => {
    class Users extends Store<{ byEmail: Record<string, number> }> {
      constructor() {
        super({ byEmail: { 'ann@x.com': 1 } });
      }
    }
    const r = mount(Users, (s) => s.byEmail['ann@x.com']);
    await change(() => r.bloc.set({ byEmail: { 'ann@x.com': 2 } }));
    expect(r.out).toBe(2);
  });

  it('a dictionary key that shadows an Object.prototype member', async () => {
    class Words extends Store<{ counts: Record<string, number> }> {
      constructor() {
        super({ counts: {} });
      }
    }
    const r = mount(Words, (s) =>
      typeof s.counts.constructor === 'number' ? s.counts.constructor : 0,
    );
    await change(() => r.bloc.set({ counts: { constructor: 3 } }));
    expect(r.out).toBe(3);
  });

  it('Object.hasOwn next to a sibling read', async () => {
    class Dict extends Store<{ dict: Record<string, number> }> {
      constructor() {
        super({ dict: { a: 1 } });
      }
    }
    const r = mount(Dict, (s) => [Object.hasOwn(s.dict, 'b'), s.dict.a]);
    await change(() => r.bloc.set({ dict: { a: 1, b: 2 } }));
    expect(r.out).toEqual([true, 1]);
  });

  it('`in` when a key is added with an undefined value', async () => {
    class Flags extends Store<{ flags: Record<string, boolean | undefined> }> {
      constructor() {
        super({ flags: { on: true } });
      }
    }
    const r = mount(Flags, (s) => ['beta' in s.flags, s.flags.on]);
    await change(() => r.bloc.set({ flags: { on: true, beta: undefined } }));
    expect(r.out).toEqual([true, true]);
  });

  it.each(['emit', 'patch'] as const)(
    'a parent that becomes null under an optional read (%s)',
    async (op) => {
      class Session extends Store<{ profile: { nick?: string } | null }> {
        constructor() {
          super({ profile: {} });
        }
      }
      const r = mount(Session, (s) =>
        s.profile ? (s.profile.nick ?? 'no nick') : 'logged out',
      );
      await change(() =>
        op === 'emit'
          ? r.bloc.set({ profile: null })
          : r.bloc.merge({ profile: null }),
      );
      expect(r.out).toBe('logged out');
    },
  );

  it('a value that flips between array and object', async () => {
    class Data extends Store<{ data: unknown }> {
      constructor() {
        super({ data: { first: undefined } });
      }
    }
    const r = mount(Data, (s) => {
      const d = s.data as Record<string, unknown> | unknown[];
      return Array.isArray(d) ? `list:${d.length}` : `first:${String(d.first)}`;
    });
    await change(() => r.bloc.set({ data: [] }));
    expect(r.out).toBe('list:0');
  });

  it('patch replacing an array with a plain object', async () => {
    class Sel extends Store<{ sel: unknown }> {
      constructor() {
        super({ sel: [1, 2] });
      }
    }
    const r = mount(Sel, (s) => (s.sel as unknown[]).length);
    await change(() => r.bloc.merge({ sel: { 0: 5 } }));
    expect(r.out).toBeUndefined();
  });
});

describe('fixed: cross-bloc deps', () => {
  class Prices extends Store<{ base: number; tax: number }> {
    constructor() {
      super({ base: 10, tax: 1 });
    }
  }

  it('one dep tracked by two getters', async () => {
    class Cart extends Cubit<{ qty: number }> {
      prices = this.depend(Prices);
      constructor() {
        super({ qty: 1 });
      }
      get base() {
        return this.prices.track()[0].base;
      }
      get tax() {
        return this.prices.track()[0].tax;
      }
    }
    const r = mount(Cart, (_, cart) => `${cart.base}+${cart.tax}`);
    const prices = mount(Prices, () => null).bloc;
    await change(() => prices.set({ base: 10, tax: 5 }));
    expect(r.out).toBe('10+5');
  });

  it('a getter switching dep instances by args', async () => {
    class Doc extends Cubit<{ title: string }, { id: string }> {
      constructor() {
        super({ title: '' });
      }
      override init(args: { id: string }) {
        this.emit({ title: `doc ${args.id}` });
      }
      set = (next: { title: string }) => this.emit(next);
    }
    class Tabs extends Store<{ active: string }> {
      docs = this.depend(Doc);
      constructor() {
        super({ active: 'a' });
      }
      get title(): string {
        return this.docs.track({ args: { id: this.state.active } })[0].title;
      }
    }
    const r = mount(Tabs, (_, tabs) => tabs.title);
    expect(r.out).toBe('doc a');
    await change(() => r.bloc.set({ active: 'b' }));
    expect(r.out).toBe('doc b');
    const docB = r.bloc.docs.untracked({ args: { id: 'b' } });
    const docA = r.bloc.docs.untracked({ args: { id: 'a' } });
    const before = r.renders;
    await change(() => docA.set({ title: 'stale tab' }));
    expect(r.renders).toBe(before);
    await change(() => docB.set({ title: 'renamed' }));
    expect(r.out).toBe('renamed');
  });
});

describe('proxy reuse across renders', () => {
  class List extends Store<{ items: { name: string }[]; count: number }> {
    constructor() {
      super({ items: [{ name: 'a' }], count: 0 });
    }
  }

  it('useMemo keyed on a reused sub-proxy still tracks the list', async () => {
    let out: string[] = [];
    let bloc!: List;
    function Names() {
      const [s, b] = useBloc(List);
      bloc = b;
      out = useMemo(() => s.items.map((i) => i.name), [s.items]);
      return <span>{s.count}</span>;
    }
    render(<Names />);
    await change(() => bloc.set({ ...bloc.state, count: 1 }));
    await change(() => bloc.set({ ...bloc.state, items: [{ name: 'b' }] }));
    expect(out).toEqual(['b']);
  });

  it('aliased objects are tracked per path', async () => {
    const shared = { x: 1 };
    class Alias extends Store<{ a: { x: number }; b: { x: number } }> {
      constructor() {
        super({ a: shared, b: shared });
      }
    }
    const r = mount(Alias, (s) => s.b.x);
    const before = r.renders;
    await change(() => r.bloc.set({ a: { x: 2 }, b: shared }));
    expect(r.renders).toBe(before);
    await change(() => r.bloc.set({ a: shared, b: { x: 3 } }));
    expect(r.out).toBe(3);
  });

  it('deep-frozen state still re-renders correctly', async () => {
    const freeze = <T,>(o: T): T => {
      Object.values(o as object).forEach(
        (v) => typeof v === 'object' && v !== null && freeze(v),
      );
      return Object.freeze(o);
    };
    class Frozen extends Store<{ user: { name: string; tags: string[] } }> {
      constructor() {
        super(freeze({ user: { name: 'a', tags: ['x'] } }));
      }
    }
    const r = mount(Frozen, (s) => `${s.user.name}:${s.user.tags.join()}`);
    await change(() =>
      r.bloc.set(freeze({ user: { name: 'a', tags: ['x', 'y'] } })),
    );
    expect(r.out).toBe('a:x,y');
  });
});

describe('known gaps', () => {
  // A bloc method reads raw `this.state`; only getters run against the
  // render's tracking proxy.
  it.fails('a bloc method called during render', async () => {
    class Counter extends Store<{ n: number }> {
      constructor() {
        super({ n: 1 });
      }
      double() {
        return this.state.n * 2;
      }
    }
    const r = mount(Counter, (_, c) => c.double());
    await change(() => r.bloc.set({ n: 2 }));
    expect(r.out).toBe(4);
  });

  // A memo child's reads through the parent's proxy count for the parent only
  // in renders where the child renders too; after a bail-out they are lost.
  it.fails('a memo child reading through a reused parent proxy', async () => {
    class Profile extends Store<{
      user: { name: string; email: string };
      count: number;
    }> {
      constructor() {
        super({ user: { name: 'a', email: 'a@x' }, count: 0 });
      }
    }
    let email = '';
    let bloc!: Profile;
    const Email = memo(({ user }: { user: { email: string } }) => {
      email = user.email;
      return null;
    });
    function Parent() {
      const [s, b] = useBloc(Profile);
      bloc = b;
      const user = s.user;
      return (
        <>
          {user.name}
          {s.count}
          <Email user={user} />
        </>
      );
    }
    render(<Parent />);
    await change(() => bloc.set({ ...bloc.state, count: 1 }));
    await change(() =>
      bloc.set({ ...bloc.state, user: { ...bloc.state.user, email: 'b@x' } }),
    );
    expect(email).toBe('b@x');
  });
});
