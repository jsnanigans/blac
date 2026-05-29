// @vitest-environment jsdom
/**
 * Cross-unit integration test.
 *
 * Imports exclusively from the package barrels (./index and ./react) to prove
 * all five implementation units compose correctly at the published surface.
 */
import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import {
  ALL_PATHS,
  diffAlongSkeleton,
  pathsFromPatch,
  PathInterner,
  PathSet,
  PathSetSpace,
  StructuralContainer,
  trackRender,
} from './index';
import { useStructural } from './react';

// ---------------------------------------------------------------------------
// Test 1 — Core flow without React
// ---------------------------------------------------------------------------

describe('Integration: core flow without React', () => {
  interface TodoState {
    todos: Array<{ id: number; text: string; done: boolean }>;
    filter: 'all' | 'active';
  }

  class TodoStore extends StructuralContainer<TodoState> {}

  it('patch({ filter }) fires only the filter-interested subscriber', () => {
    const initial: TodoState = {
      todos: [{ id: 1, text: 'buy milk', done: false }],
      filter: 'all',
    };
    const store = new TodoStore(initial, { scheduler: new SyncScheduler() });

    const filterDirty: PathSet[] = [];
    const todosDirty: PathSet[] = [];

    const filterId = store.interner.intern('filter');
    const todosId = store.interner.intern('todos');

    const unsubFilter = store.subscribe(
      () => new Set([filterId]),
      (dirty) => filterDirty.push(dirty),
    );
    const unsubTodos = store.subscribe(
      () => new Set([todosId]),
      (dirty) => todosDirty.push(dirty),
    );

    store.patch({ filter: 'active' });

    expect(filterDirty).toHaveLength(1);
    expect(todosDirty).toHaveLength(0);

    unsubFilter();
    unsubTodos();
  });

  it('patch({ todos }) fires only the todos-interested subscriber', () => {
    const initial: TodoState = {
      todos: [{ id: 1, text: 'buy milk', done: false }],
      filter: 'all',
    };
    const store = new TodoStore(initial, { scheduler: new SyncScheduler() });

    const filterDirty: PathSet[] = [];
    const todosDirty: PathSet[] = [];

    const filterId = store.interner.intern('filter');
    const todosId = store.interner.intern('todos');

    const unsubFilter = store.subscribe(
      () => new Set([filterId]),
      (dirty) => filterDirty.push(dirty),
    );
    const unsubTodos = store.subscribe(
      () => new Set([todosId]),
      (dirty) => todosDirty.push(dirty),
    );

    store.patch({
      todos: [
        { id: 1, text: 'buy milk', done: true },
        { id: 2, text: 'walk dog', done: false },
      ],
    });

    expect(filterDirty).toHaveLength(0);
    expect(todosDirty).toHaveLength(1);

    unsubFilter();
    unsubTodos();
  });

  it('emit with two registered consumers uses diffAlongSkeleton — only filter subscriber fires', () => {
    const initial: TodoState = {
      todos: [{ id: 1, text: 'buy milk', done: false }],
      filter: 'all',
    };
    const store = new TodoStore(initial, { scheduler: new SyncScheduler() });

    const filterDirty: PathSet[] = [];
    const todosDirty: PathSet[] = [];

    const filterId = store.interner.intern('filter');
    const todosId = store.interner.intern('todos');

    // Register two consumers so emit goes through diffAlongSkeleton
    store.registerConsumerPaths('filter-consumer', new Set([filterId]));
    store.registerConsumerPaths('todos-consumer', new Set([todosId]));

    expect(store.consumerCount).toBe(2);

    const unsubFilter = store.subscribe(
      () => new Set([filterId]),
      (dirty) => filterDirty.push(dirty),
    );
    const unsubTodos = store.subscribe(
      () => new Set([todosId]),
      (dirty) => todosDirty.push(dirty),
    );

    // Only filter changes
    store.emit({
      todos: initial.todos,
      filter: 'active',
    });

    expect(filterDirty).toHaveLength(1);
    expect(todosDirty).toHaveLength(0);

    unsubFilter();
    unsubTodos();
  });

  it('trackRender records paths; pathsFromPatch and diffAlongSkeleton compose correctly', () => {
    // Demonstrate that the exported units work together at the package surface
    const interner = new PathInterner();
    const state = { filter: 'all' as const, count: 0 };

    const { value, paths } = trackRender(state, interner);
    // Reading .filter should record it
    void value.filter;
    const filterId = interner.intern('filter');
    expect((paths as Set<number>).has(filterId)).toBe(true);

    // pathsFromPatch produces the same id
    const patch = { filter: 'active' as const };
    const patchPaths = pathsFromPatch(patch, interner);
    expect((patchPaths as Set<number>).has(filterId)).toBe(true);

    // diffAlongSkeleton picks up the change
    const diff = diffAlongSkeleton(
      state,
      { ...state, filter: 'active' },
      paths,
      interner,
    );
    expect((diff as Set<number>).has(filterId)).toBe(true);

    // PathSetSpace is importable (smoke test)
    expect(PathSetSpace).toBeDefined();
    expect(ALL_PATHS).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Test 2 — React flow
// ---------------------------------------------------------------------------

describe('Integration: React flow with useStructural', () => {
  interface CounterState {
    count: number;
    label: string;
  }

  class CounterStore extends StructuralContainer<CounterState> {}

  it('re-renders only when observed path changes; render count = 3 (mount + 2 count patches)', () => {
    const c = new CounterStore(
      { count: 0, label: 'hello' },
      { scheduler: new SyncScheduler() },
    );

    let renderCount = 0;
    let visibleCount = -1;

    function Counter() {
      renderCount++;
      const [state] = useStructural(c);
      visibleCount = (state as CounterState).count;
      return React.createElement('span', null, String(visibleCount));
    }

    const { container } = render(React.createElement(Counter));

    // Initial mount: render 1
    expect(renderCount).toBe(1);
    expect(container.textContent).toBe('0');

    // patch count → re-render (render 2)
    act(() => {
      c.patch({ count: 1 });
    });
    expect(renderCount).toBe(2);
    expect(container.textContent).toBe('1');

    // patch label only → NO re-render
    act(() => {
      c.patch({ label: 'world' });
    });
    expect(renderCount).toBe(2);

    // patch count again → re-render (render 3)
    act(() => {
      c.patch({ count: 2 });
    });
    expect(renderCount).toBe(3);
    expect(container.textContent).toBe('2');

    // Final state reflected in DOM
    expect(visibleCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Two consumers, source-diff isolation
// ---------------------------------------------------------------------------

describe('Integration: two consumers with source-diff isolation', () => {
  interface UserState {
    profile: { name: string; email: string };
    preferences: { theme: 'light' | 'dark' };
  }

  class UserStore extends StructuralContainer<UserState> {}

  it('profile patch re-renders ProfileCard only; theme patch re-renders ThemeBadge only', () => {
    const initial: UserState = {
      profile: { name: 'Alice', email: 'alice@example.com' },
      preferences: { theme: 'light' },
    };
    const c = new UserStore(initial, { scheduler: new SyncScheduler() });

    let profileRenders = 0;
    let themeRenders = 0;

    function ProfileCard() {
      profileRenders++;
      const [state] = useStructural(c);
      // Access profile.name — records 'profile' and 'profile.name'
      return React.createElement(
        'span',
        null,
        (state as UserState).profile.name,
      );
    }

    function ThemeBadge() {
      themeRenders++;
      const [state] = useStructural(c);
      // Access preferences.theme — records 'preferences' and 'preferences.theme'
      return React.createElement(
        'span',
        null,
        (state as UserState).preferences.theme,
      );
    }

    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ProfileCard),
        React.createElement(ThemeBadge),
      ),
    );

    // Both mount → 1 render each
    expect(profileRenders).toBe(1);
    expect(themeRenders).toBe(1);

    // patch profile.name → ProfileCard re-renders, ThemeBadge does NOT
    act(() => {
      c.patch({ profile: { name: 'Bob' } } as Partial<UserState>);
    });
    expect(profileRenders).toBe(2);
    expect(themeRenders).toBe(1);

    // patch preferences.theme → ThemeBadge re-renders, ProfileCard does NOT
    act(() => {
      c.patch({ preferences: { theme: 'dark' } });
    });
    expect(profileRenders).toBe(2);
    expect(themeRenders).toBe(2);

    // emit with two consumers → diffAlongSkeleton runs; only profile changed
    act(() => {
      c.emit({
        profile: { name: 'newer', email: c.state.profile.email },
        preferences: c.state.preferences,
      });
    });
    expect(profileRenders).toBe(3);
    expect(themeRenders).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 3b — Sibling-leaf isolation under a shared parent
// ---------------------------------------------------------------------------

describe('Integration: sibling-leaf isolation under a shared parent', () => {
  interface UserState {
    user: { name: string; email: string; address: { city: string } };
  }

  class UserStore extends StructuralContainer<UserState> {}

  it('changing one leaf does not wake siblings, even when the patch spreads the whole parent', () => {
    const initial: UserState = {
      user: { name: 'Ada', email: 'ada@x.io', address: { city: 'Berlin' } },
    };
    const c = new UserStore(initial, { scheduler: new SyncScheduler() });

    let nameRenders = 0;
    let emailRenders = 0;
    let cityRenders = 0;

    function NameChip() {
      nameRenders++;
      const [s] = useStructural(c);
      return React.createElement('span', null, (s as UserState).user.name);
    }
    function EmailChip() {
      emailRenders++;
      const [s] = useStructural(c);
      return React.createElement('span', null, (s as UserState).user.email);
    }
    function CityChip() {
      cityRenders++;
      const [s] = useStructural(c);
      return React.createElement(
        'span',
        null,
        (s as UserState).user.address.city,
      );
    }

    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(NameChip),
        React.createElement(EmailChip),
        React.createElement(CityChip),
      ),
    );
    expect([nameRenders, emailRenders, cityRenders]).toEqual([1, 1, 1]);

    // Swap the address by spreading the WHOLE user (the over-broad pattern the
    // 08-tracking demo used). Value-diff means only city's leaf changed → only
    // CityChip wakes; name/email are untouched despite `user` getting a new ref.
    act(() => {
      c.patch({
        user: { ...c.state.user, address: { city: 'Lisbon' } },
      } as Partial<UserState>);
    });
    expect([nameRenders, emailRenders, cityRenders]).toEqual([1, 1, 2]);

    // Edit just the name (also over-spread) → only NameChip wakes.
    act(() => {
      c.patch({
        user: { ...c.state.user, name: 'Grace' },
      } as Partial<UserState>);
    });
    expect([nameRenders, emailRenders, cityRenders]).toEqual([2, 1, 2]);

    // Replacing user wholesale with a changed name still wakes NameChip (the
    // leaf resolves to a new value) but not EmailChip (email unchanged).
    act(() => {
      c.patch({
        user: {
          name: 'Hopper',
          email: 'ada@x.io',
          address: { city: 'Lisbon' },
        },
      } as Partial<UserState>);
    });
    expect([nameRenders, emailRenders, cityRenders]).toEqual([3, 1, 2]);
  });
});
