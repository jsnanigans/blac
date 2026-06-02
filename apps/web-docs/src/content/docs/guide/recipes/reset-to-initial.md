---
title: Reset to Initial State
description: Restore every field to its defaults in one atomic emit by storing the initial state in the constructor or seeding it from args in init.
---

**Use when:** a form, wizard, or filter panel needs a "Clear" or "Cancel" button
that restores every field to its defaults in one action.
**Don't use when:** the reset is partial (only some fields) — prefer `patch` with
the specific defaults rather than a full state replace.

## Pattern

Store the initial state once in the constructor and call `emit` with it to restore
it in one atomic update.

```ts twoslash
import { Cubit } from '@blac/core';

interface FilterState {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'price' | 'rating' | 'newest';
}
// ---cut---
const DEFAULT_FILTER: FilterState = {
  query: '',
  category: 'all',
  minPrice: 0,
  maxPrice: 10_000,
  sortBy: 'newest',
};

class FilterCubit extends Cubit<FilterState> {
  // Keep the initial state immutable — emit makes a reference check so we
  // must not mutate this object in place.
  private readonly initial: FilterState;

  constructor(initial: FilterState = DEFAULT_FILTER) {
    super(initial);
    this.initial = initial;
  }

  setQuery = (query: string) => this.patch({ query });
  setCategory = (category: string) => this.patch({ category });
  setMinPrice = (minPrice: number) => this.patch({ minPrice });
  setMaxPrice = (maxPrice: number) => this.patch({ maxPrice });
  setSortBy = (sortBy: FilterState['sortBy']) => this.patch({ sortBy });

  /** Restore all fields to their initial values in one emit. */
  reset = () => {
    // emit replaces the whole state; patch would also work but emit is
    // clearer in intent — we're not updating a subset, we're replacing all.
    this.emit({ ...this.initial });
    //          ^^^^^^^^^^^^^^^
    // Spread produces a new object reference so the equality check can
    // detect a change even if the current state already matches the defaults.
  };

  get isDirty() {
    const s = this.state;
    return (
      s.query !== this.initial.query ||
      s.category !== this.initial.category ||
      s.minPrice !== this.initial.minPrice ||
      s.maxPrice !== this.initial.maxPrice ||
      s.sortBy !== this.initial.sortBy
    );
  }
}
```

```tsx
function FilterPanel() {
  const [state, filter] = useBloc(FilterCubit, {
    select: (s, bloc) => [s.query, s.category, s.sortBy, bloc.isDirty],
  });

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => filter.setQuery(e.target.value)}
        placeholder="Search…"
      />
      <select
        value={state.category}
        onChange={(e) => filter.setCategory(e.target.value)}
      >
        <option value="all">All</option>
        <option value="books">Books</option>
        <option value="music">Music</option>
      </select>
      {filter.isDirty && <button onClick={filter.reset}>Clear filters</button>}
    </div>
  );
}
```

## Args-seeded initial state

When the initial state comes from `args` (for example a per-user default saved on
the server), capture it in `init` instead of the constructor:

```ts twoslash
import { Cubit } from '@blac/core';

interface FilterState {
  query: string;
  category: string;
}
// ---cut---
class UserFilterCubit extends Cubit<FilterState, FilterState> {
  private savedInitial!: FilterState;

  constructor() {
    super({ query: '', category: 'all' });
  }

  protected override init(args: FilterState) {
    // args is the authoritative initial state for this user.
    this.savedInitial = args;
    this.emit({ ...args });
  }

  reset = () => {
    this.emit({ ...this.savedInitial });
  };
}
```

:::caution[Spread before emit]
`this.emit(this.initial)` passes the _same object reference_ as the current
state if nothing has changed yet. `emit` short-circuits on referential equality
(`prev === next`), so the reset would be silently skipped. Spread (`{ ...this.initial }`)
produces a fresh object, ensuring the emit goes through.
:::

:::tip[Partial reset]
If you want to reset only specific fields, use `patch` instead of `emit`:

```ts twoslash
import { Cubit } from '@blac/core';
interface FilterState {
  query: string;
  category: string;
  sortBy: string;
}
class FilterCubit extends Cubit<FilterState> {
  constructor() {
    super({ query: '', category: 'all', sortBy: 'newest' });
  }
  // ---cut---
  resetSearch = () => {
    // Resets only `query`; keeps `category` and `sortBy` intact.
    this.patch({ query: '' });
  };
  // ---cut-after---
}
```

:::

## See also

- [Cubit](/core/cubit) — `emit` replaces state; `patch` deep-merges
- [Patterns](/guide/patterns) — named instances for parallel forms
