/**
 * Tests for core testing helpers: args/deps support in createCubitStub.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Cubit } from './core/Cubit';
import { clearAll } from './registry';
import {
  blacTestSetup,
  createCubitStub,
  registerOverride,
  withTestRegistry,
} from './testing';

blacTestSetup();
afterEach(() => clearAll());

// A bloc that requires Args — init seeds state.
type UserArgs = { userId: string };
type UserState = { id: string | null };

class UserBloc extends Cubit<UserState, UserArgs> {
  constructor() {
    super({ id: null });
  }

  protected init(a: UserArgs): void {
    this.emit({ id: a.userId });
  }
}

// A bloc with deps that fires onDepsChanged.
type CanvasDeps = { el?: { id: number } };
type CanvasState = { ready: boolean };

class CanvasBloc extends Cubit<CanvasState, void, CanvasDeps> {
  changes: Array<[CanvasDeps, CanvasDeps]> = [];

  constructor() {
    super({ ready: false });
  }

  protected onDepsChanged(
    next: Readonly<CanvasDeps>,
    prev: Readonly<CanvasDeps>,
  ): void {
    this.changes.push([{ ...next }, { ...prev }]);
    if (next.el && next.el !== prev.el) this.emit({ ready: true });
  }
}

// A bloc that requires both args and deps.
type ProfileArgs = { name: string };
type ProfileDeps = { token?: string };
type ProfileState = { displayName: string; ready: boolean };

class ProfileBloc extends Cubit<ProfileState, ProfileArgs, ProfileDeps> {
  changes: Array<[ProfileDeps, ProfileDeps]> = [];

  constructor() {
    super({ displayName: '', ready: false });
  }

  protected init(a: ProfileArgs): void {
    this.emit({ ...this.state, displayName: a.name });
  }

  protected onDepsChanged(
    next: Readonly<ProfileDeps>,
    prev: Readonly<ProfileDeps>,
  ): void {
    this.changes.push([{ ...next }, { ...prev }]);
    if (next.token) this.emit({ ...this.state, ready: true });
  }
}

describe('createCubitStub — args support', () => {
  it('runs init when args are supplied, seeding state', () => {
    const stub = createCubitStub(UserBloc, { args: { userId: 'alice' } });
    expect(stub.state.id).toBe('alice');
  });

  it('does not run init when args are omitted (state stays at default)', () => {
    const stub = createCubitStub(UserBloc);
    expect(stub.state.id).toBeNull();
  });

  it('state override is applied after init', () => {
    // args seeds id = 'alice', then state override sets id = 'bob'
    const stub = createCubitStub(UserBloc, {
      args: { userId: 'alice' },
      state: { id: 'bob' },
    });
    expect(stub.state.id).toBe('bob');
  });
});

describe('createCubitStub — deps support', () => {
  it('pre-wires deps via the core merge path, firing onDepsChanged', () => {
    const el = { id: 42 };
    const stub = createCubitStub(CanvasBloc, { deps: { el } });

    expect(stub.deps.el).toBe(el);
    expect(stub.changes.length).toBe(1);
    expect(stub.changes[0][0]).toEqual({ el });
    expect(stub.changes[0][1]).toEqual({});
  });

  it('state reflects onDepsChanged emit (ready = true when el is provided)', () => {
    const stub = createCubitStub(CanvasBloc, { deps: { el: { id: 7 } } });
    expect(stub.state.ready).toBe(true);
  });

  it('does not fire onDepsChanged when deps are omitted', () => {
    const stub = createCubitStub(CanvasBloc);
    expect(stub.changes.length).toBe(0);
    expect(stub.deps).toEqual({});
  });
});

describe('createCubitStub — args + deps together', () => {
  it('runs init then wires deps, both taking effect', () => {
    const stub = createCubitStub(ProfileBloc, {
      args: { name: 'Alice' },
      deps: { token: 'secret' },
    });

    expect(stub.state.displayName).toBe('Alice');
    expect(stub.state.ready).toBe(true);
    expect(stub.deps.token).toBe('secret');
    expect(stub.changes.length).toBe(1);
  });
});

describe('registerOverride + withTestRegistry with args', () => {
  it('registers an args-seeded stub so the registry serves it', () => {
    withTestRegistry((registry) => {
      const stub = createCubitStub(UserBloc, { args: { userId: 'test-user' } });
      // No args → resolves to the default sentinel key, which the internal
      // tier below addresses directly.
      registerOverride(UserBloc, stub);

      const retrieved = registry.acquire(UserBloc, 'default', {
        canCreate: false,
      });
      expect(retrieved.state.id).toBe('test-user');
    });
  });
});
