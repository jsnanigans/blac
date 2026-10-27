---
title: 'Proposal: Resource Input'
description: Preview of an `input` option for resource() that reloads when a value derived from state changes, replacing manual reload() calls and request-id guards.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

`resource` calls `fn(signal, args)`, and `args` are fixed for the life of the instance. Anything driven by a filter, a search term, a date range or a selected tab has no place to live, so containers do this:

- Keep the value in state, then call `reload()` (or a hand-written `loadData`) after every `patch` that touches it.
- Pass the current value into the loader by hand at each call site.
- Hand-roll a latest-wins guard, `const requestId = ++this.searchRequestId`, then check it after every `await`. `resource` already aborts and ignores stale responses, but only for calls it started, so the guard survives a migration.

In one production codebase, typeaheads and filtered lists repeat this in several containers, including two with the request-id guard. The earlier list-query proposal (`listResource`) tried to solve the list case with a new helper. A state-derived input solves it, and the typeahead and dependent-load cases, with one option.

## Proposed API

```ts
resource(this, 'list', fn, { input: (state) => state.query, debounce: 300 });
```

| Part                      | Meaning                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `input: (state) => I`     | Derives the loader's input from the host state. Read on every state change while the resource is active. |
| `fn(signal, args, input)` | Existing loaders keep `(signal, args)`. `input` is a third parameter, typed from the `input` option.     |
| `debounce?: number`       | Milliseconds to wait after an input change before reloading. Optional, no default.                       |

Behavior:

- While the host is active, a change to `input` (shallow equality) reloads: the previous call is aborted, a stale response is ignored, and `data` stays visible while `status` is `'loading'`. This is the existing `reload()` path.
- An unchanged `input` does nothing, so patching unrelated fields never reloads.
- `debounce` applies to input changes only. `load()` and `reload()` run immediately and cancel a pending debounced reload.
- `auto`, `staleTime`, `tags` and `onError` work as today. The input is re-read on activation, so `auto` loads with the current value.
- Deactivation clears a pending debounce.

No new slot or state machine: the value lives in ordinary state, so it is tracked by `useBloc` and seedable in tests.

## Use

```ts
import { Cubit } from '@blac/core';
import { idle, resource, type AsyncState } from '@blac/async';

interface TasksState {
  status: 'open' | 'done';
  tasks: AsyncState<Task[]>;
}

class TasksCubit extends Cubit<TasksState> {
  constructor() {
    super({ status: 'open', tasks: idle() });
  }

  tasks = resource(
    this,
    'tasks',
    (signal, _args, status) => api.listTasks({ status }, signal),
    { auto: true, input: (state) => state.status },
  );

  setStatus = (status: TasksState['status']) => this.patch({ status });
}
```

`setStatus('done')` is enough: the resource sees the new input and reloads.

## Before and after

### Cubit: a product typeahead

Adapted from a production search container and simplified. A debounced search with a request-id guard, plus a loading flag and an error branch that both check the id.

```ts title="Before"
export class ProductSearchCubit extends Cubit<ProductSearchState> {
  private searchRequestId = 0;
  private debouncedSearch: DebouncedFunc<(term: string) => void>;

  constructor() {
    super({ searchTerm: '', results: [], loading: false, step: 'search' });
    this.debouncedSearch = debounce((term: string) => {
      void this.search(term);
    }, SEARCH_DEBOUNCE_MS);
  }

  setSearchTerm = (term: string) => {
    this.patch({ searchTerm: term });
    if (term.length < MIN_SEARCH_CHARS) {
      this.debouncedSearch.cancel();
      this.searchRequestId += 1;
      this.patch({ results: [] });
      return;
    }
    this.debouncedSearch(term);
  };

  _dispose() {
    this.debouncedSearch.cancel();
    super._dispose();
  }

  private search = async (term: string) => {
    const requestId = ++this.searchRequestId;
    this.patch({ loading: true });
    try {
      const response = await api.searchProducts(term);
      if (requestId !== this.searchRequestId) return;
      this.patch({ results: response.data.map(toSearchResult) });
    } catch (e) {
      if (requestId === this.searchRequestId) {
        reportError(e, 'Failed to search products');
      }
    } finally {
      if (requestId === this.searchRequestId) this.patch({ loading: false });
    }
  };

  selectResult = (result: ProductResult) =>
    this.patch({ selectedResult: result, step: 'configure' });

  goBack = () => this.patch({ step: 'search', selectedResult: null });
}
```

```ts title="After"
export class ProductSearchCubit extends Cubit<ProductSearchState> {
  constructor() {
    super({ searchTerm: '', results: idle(), step: 'search' });
  }

  results = resource(
    this,
    'results',
    async (signal, _args, term) =>
      term.length < MIN_SEARCH_CHARS
        ? []
        : (await api.searchProducts(term, signal)).data.map(toSearchResult),
    {
      input: (state) => state.searchTerm,
      debounce: SEARCH_DEBOUNCE_MS,
      onError: (e) => reportError(e, 'Failed to search products'),
    },
  );

  setSearchTerm = (searchTerm: string) => this.patch({ searchTerm });

  selectResult = (result: ProductResult) =>
    this.patch({ selectedResult: result, step: 'configure' });

  goBack = () => this.patch({ step: 'search', selectedResult: null });
}
```

What goes away: the request counter and its three checks, the debounce wiring and `_dispose` override, the `loading` flag, and the try/catch. `state.loading` becomes `state.results.status === 'loading'`, and `results` becomes `results.data ?? []`.

Behavior differences to review:

- A short term resolves to `[]` through the loader, so the slot briefly goes `loading` then `success`. Before, it cleared the list at once. With [`enabled`](/guide/async-resources/#gating-with-enabled), a short term could keep the resource idle instead.
- Clearing the input within the debounce window still cancels the pending search, but the previous results stay until the debounced load runs (and returns `[]`). Before, the list cleared on the keystroke.
- A stale failure is still not reported: an aborted call never reports, which is what the id check on the error branch did by hand.

### Cubit: an approvals list

Adapted from a production list container and simplified. The generated API client takes positional arguments, which stay in both versions.

```ts title="Before — 205 lines"
export interface ApprovalListState extends LoadingState {
  data: ApprovalItem[];
  sorterItems?: string;
  filterItems: Record<string, FilterValue | null>;
  search?: string;
  page: number;
  pageSize: number;
  total?: number;
  expandedRowKeys?: string[];
}

export class ApprovalListCubit extends Cubit<ApprovalListState> {
  constructor() {
    super({
      loading: false,
      data: [],
      sorterItems: sortInitialValue,
      filterItems: filterInitialValue,
      page: 0,
      pageSize: 10,
      requestError: null,
    });

    void this.loadData({
      page: 0,
      size: 10,
      sort: sortInitialValue,
      filters: filterInitialValue,
    });
  }

  loadData = async (options: {
    page: number;
    size?: number;
    sort: string | undefined;
    filters?: Record<string, FilterValue | null>;
    search?: string | undefined;
  }) => {
    this.startLoading();
    try {
      const data = await api.listApprovals(
        options.search,
        options.page,
        options.size ?? 10,
        options.sort,
        options.filters?.type as never,
        options.filters?.status as never,
      );
      this.emit({
        ...this.state,
        data: data.content ?? [],
        page: data.page.number ?? 0,
        total: data.page.totalElements ?? 0,
        expandedRowKeys: [],
      });
    } catch (e) {
      reportApiError(e, 'Error while loading approvals');
      this.emit({ ...this.state, requestError: e as ApiError });
    } finally {
      this.stopLoading();
    }
  };

  onListSearch = (searchString?: string) => {
    this.setSearch(searchString);
    void this.loadData({
      page: 0,
      sort: this.state.sorterItems,
      filters: this.state.filterItems,
      search: searchString,
    });
  };

  onPaginationChange = (newPage: number) => {
    void this.loadData({
      page: newPage - 1, // the table is 1-based, the API is 0-based
      sort: this.state.sorterItems,
      filters: this.state.filterItems,
      search: this.state.search,
    });
  };

  handleTableChange = (_pagination, _filterItems, sorter) => {
    let _sort = undefined;
    if (!isArray(sorter) && sorter.column) {
      _sort = `${sorter.column.dataIndex},${sorter.order == 'ascend' ? 'asc' : 'desc'}`;
    }
    this.setFilterItems(_filterItems);
    this.setSorterItems(_sort ?? '');
    void this.loadData({
      page: 0,
      sort: _sort,
      filters: _filterItems,
      search: this.state.search,
    });
  };

  onStatusUpdateSuccess = async (id: string) => {
    void this.loadData({
      page: this.state.page,
      sort: this.state.sorterItems,
      filters: this.state.filterItems,
      search: this.state.search,
    });
    getBloc(ApprovalsByUserCubit, { id }).reloadData({
      userId: id,
      size: 10000,
    });
  };

  // setSorterItems, setFilterItems, setSearch, setExpandedRowKeys, startLoading, stopLoading:
  // one-line emit({ ...this.state, x }) wrappers (about 40 lines)
}
```

```ts title="After — about 55 lines"
interface ApprovalQuery {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  filters: Record<string, FilterValue | null>;
}

export interface ApprovalListState {
  query: ApprovalQuery;
  list: AsyncState<{ items: ApprovalItem[]; total: number }>;
  expandedRowKeys: string[];
}

export class ApprovalListCubit extends Cubit<ApprovalListState> {
  constructor() {
    super({
      query: {
        page: 0,
        pageSize: 10,
        sort: sortInitialValue,
        filters: filterInitialValue,
      },
      list: idle(),
      expandedRowKeys: [],
    });
  }

  list = resource(
    this,
    'list',
    async (signal, _args, { page, pageSize, search, sort, filters }) => {
      const data = await api.listApprovals(
        search,
        page,
        pageSize,
        sort,
        filters.type as never,
        filters.status as never,
      );
      return { items: data.content ?? [], total: data.page.totalElements ?? 0 };
    },
    { auto: true, input: (state) => state.query },
  );

  private setQuery = (patch: Partial<ApprovalQuery>) =>
    this.patch({
      query: { ...this.state.query, page: 0, ...patch },
      expandedRowKeys: [],
    });

  onListSearch = (search?: string) => this.setQuery({ search });

  onPaginationChange = (newPage: number) =>
    this.setQuery({ page: newPage - 1 });

  handleTableChange = (_pagination, filters, sorter) => {
    const sort =
      !isArray(sorter) && sorter.column
        ? `${sorter.column.dataIndex},${sorter.order == 'ascend' ? 'asc' : 'desc'}`
        : undefined;
    this.setQuery({ filters, sort });
  };

  onStatusUpdateSuccess = (id: string) => {
    void this.list.reload();
    invalidate(['approvals-by-user', id]);
  };

  setExpandedRowKeys = (expandedRowKeys: string[]) =>
    this.patch({ expandedRowKeys });
}
```

What goes away: `startLoading` / `stopLoading`, the hand-rolled `loadData` options bag, six one-line `emit` wrappers (about 40 lines), the try/catch (error reporting moves to `configureAsync({ onError })`), and the repeated "pass the current sort, filters and search" argument lists.

The page-reset rule is the `page: 0, ...patch` line in `setQuery`: `page` resets unless the patch names it. A sorter and a filter change sent together are one `patch`, so one input change and one request. The table-specific conversions (1-based page, sorter to string) stay in the app, which keeps the library UI-free.

Behavior differences to review:

- `expandedRowKeys` is cleared before the request instead of after the response.
- The response's `page.number` is no longer copied back into `query.page`. The requested page is the source of truth.
- A mutation elsewhere still calls `list.reload()`, as the input has not changed.

### Component

```tsx title="Before"
const { data, loading, page, pageSize, total } = useBloc(ApprovalListCubit);

<Table
  dataSource={data}
  loading={loading}
  pagination={{ current: page + 1, pageSize, total }}
/>;
```

```tsx title="After"
const [{ list, query }] = useBloc(ApprovalListCubit);

<Table
  dataSource={list.data?.items}
  loading={list.status === 'loading'}
  pagination={{
    current: query.page + 1,
    pageSize: query.pageSize,
    total: list.data?.total,
  }}
/>;
```

### Test

```ts title="Before — tests the plumbing"
it('should start loading when calling startLoading()', () => {
  approvalListCubit.startLoading();
  expect(approvalListCubit.state.loading).toBe(true);
});

await approvalListCubit.loadData({ page: 0, sort: 'lastUpdated,desc' });
```

```ts title="After — tests the behavior"
cubit.onListSearch('x');
expect(cubit.state.query).toMatchObject({ search: 'x', page: 0 });
await waitForState(cubit, (s) => s.list.status === 'success');
expect(cubit.state.list.data?.items).toEqual(items);

// or seed the slot without a request
const seeded = withBlocState(ApprovalListCubit, {
  list: success({ items, total: 1 }),
});
```

The `startLoading` / `stopLoading` tests disappear with the methods they cover. The `loadData` tests become query tests, and the API mock stays as is.

## Alternatives

| Option                         | What it is                                                                                  | Effort | Notes                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| **A. No new API**              | Keep a `query` slot and write `setQuery` per cubit: `patch(...)` then `this.list.reload()`. | 0      | About 6 lines per cubit, but every setter must remember to reload, and request-id guards stay. |
| **B. `input` (this proposal)** | `resource` reloads when a state-derived input changes.                                      | ~4h    | Recommended. Covers lists, typeaheads and dependent loads with one option.                     |
| **C. `listResource` later**    | Query slot plus `setQuery(patch)` on top of `resource`, as in the old List Query proposal.  | ~1d    | Only if a pilot shows the 3-line `setQuery` helper repeating across many list containers.      |

Not covered: "load more" and infinite lists (deferred; they need an accumulating slot, not a replaced one), cursor pagination (no endpoint in the surveyed code uses cursors), and lists that page client-side.

## Library change

- `resource.ts`: an `input` and `debounce` option, a subscription started in `onActivated` that compares the new input to the last one (shallow), and a debounced `run()`. About 25 lines.
- Types: `fn`'s third parameter inferred from `input`; `input` absent keeps `fn(signal, args)` as is.
- Tests: reload on change, no reload on unrelated patches, latest-wins across rapid changes, debounce, explicit `reload()` bypassing it, cleanup on deactivation.
- Docs: a section in `guide/async-resources.md`, and the typeahead sample above.

Effort: about 4 hours.

## Open questions

- **Input changes while inactive.** Should they mark the resource stale, or be ignored until activation, where `input` is re-read anyway? Marking stale would make a later `load()` reload even within `staleTime`. Ignoring is simpler.
- **Equality.** Shallow equality covers primitives and flat query objects, but not nested `filters`. Is that enough, or should `input` accept `{ equals }` for a custom comparison?
- **Debounce scope.** Proposed: input changes only, never an explicit `reload()`. Confirm, and whether the first load on activation should skip the debounce (proposed: yes).
- **Short-circuit.** Should a typeahead return `[]` from the loader, or rely on [`enabled`](/guide/async-resources/#gating-with-enabled)?
