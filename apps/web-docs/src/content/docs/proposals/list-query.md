---
title: 'Proposal: List Query'
description: Preview of listResource(), a helper for server-paged, searchable, sortable lists on top of @blac/async.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

Apps with many admin-style tables end up with many near-identical list containers. The server-paged ones share this shape:

- State: `{ data, page, pageSize, total, search, sort, filters, loading, requestError }`.
- A search, sort or filter change resets to page 0. A page change or a refresh keeps the query.
- An imperative `loadData(options)` that every setter calls, with the current query passed in by hand each time.
- No latest-wins guard: a slow response for page 1 can overwrite a newer page 2.

`resource` already gives abort, latest-wins, keep-data-while-loading, `auto` and error reporting. What it lacks is a place for the query and the "reset page unless told otherwise" rule.

## Proposed API

```ts
import { listResource, type ListQuery, type Page } from '@blac/async';

const list = listResource(host, 'list', 'query', fetchPage, options?);
```

| Part         | Meaning                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `'list'`     | State slot typed `AsyncState<Page<T>>`, where `Page<T> = { items: T[]; total: number }`.                       |
| `'query'`    | State slot typed `ListQuery<Sort, Filters>`: `{ page, pageSize, search?, sort?, filters }`. `page` is 0-based. |
| `fetchPage`  | `(query, signal, args) => Promise<Page<T>>`. Receives the current query, so setters never pass it around.      |
| `options`    | The existing `ResourceOptions` (`auto`, `staleTime`, `tags`, `onError`).                                       |
| Return value | `Resource` (`load`, `reload`) plus `setQuery(patch)`.                                                          |

`setQuery(patch)` merges `patch` into the `query` slot, then calls `reload()`:

- `page` resets to `0` unless `patch` contains `page`.
- Several fields in one patch cause one request (a sorter and a filter change together, as table components often send them).
- It inherits `resource` behavior: the previous request is aborted, a stale response is ignored, and `list.data` stays visible while `status` is `'loading'`.

Both slots are plain state, so they are tracked by `useBloc` and seedable in tests with `success({ items, total })`. There is no new state machine, only about 30 lines on top of `resource`.

## Use

```ts
import { Cubit } from '@blac/core';
import {
  idle,
  listResource,
  type AsyncState,
  type ListQuery,
  type Page,
} from '@blac/async';

interface OrdersState {
  query: ListQuery<string, { status?: string[] }>;
  list: AsyncState<Page<Order>>;
}

class OrdersCubit extends Cubit<OrdersState> {
  constructor() {
    super({
      query: { page: 0, pageSize: 20, sort: 'createdAt,desc', filters: {} },
      list: idle(),
    });
  }

  list = listResource(
    this,
    'list',
    'query',
    async ({ page, pageSize, search, sort, filters }, signal) => {
      const res = await api.listOrders(
        { page, pageSize, search, sort, ...filters },
        signal,
      );
      return { items: res.content, total: res.totalElements };
    },
    { auto: true },
  );
}

// elsewhere
orders.list.setQuery({ search: 'abc' }); // page -> 0
orders.list.setQuery({ page: 3 }); // keeps search, sort, filters
orders.list.setQuery({ sort: 'total,asc', filters: { status: ['open'] } }); // one request
void orders.list.reload(); // same query, e.g. after a mutation
```

## Before and after

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
    getCubit(ApprovalsByUserCubit, { id }).reloadData({
      userId: id,
      size: 10000,
    });
  };

  // setSorterItems, setFilterItems, setSearch, setExpandedRowKeys, startLoading, stopLoading:
  // one-line emit({ ...this.state, x }) wrappers (about 40 lines)
}
```

```ts title="After — about 55 lines"
export interface ApprovalListState {
  query: ListQuery<string, Record<string, FilterValue | null>>;
  list: AsyncState<Page<ApprovalItem>>;
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

  list = listResource(
    this,
    'list',
    'query',
    async ({ page, pageSize, search, sort, filters }) => {
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
    { auto: true },
  );

  private query = (patch: Partial<ApprovalListState['query']>) => {
    this.patch({ expandedRowKeys: [] });
    return this.list.setQuery(patch);
  };

  onListSearch = (search?: string) => this.query({ search });

  onPaginationChange = (newPage: number) => this.query({ page: newPage - 1 });

  handleTableChange = (_pagination, filters, sorter) => {
    const sort =
      !isArray(sorter) && sorter.column
        ? `${sorter.column.dataIndex},${sorter.order == 'ascend' ? 'asc' : 'desc'}`
        : undefined;
    return this.query({ filters, sort });
  };

  onStatusUpdateSuccess = (id: string) => {
    void this.list.reload();
    invalidate(['approvals-by-user', id]);
  };

  setExpandedRowKeys = (expandedRowKeys: string[]) =>
    this.patch({ expandedRowKeys });
}
```

What goes away: `startLoading` / `stopLoading`, the hand-rolled `loadData` options bag, six one-line `emit` wrappers (about 40 lines), the try/catch (error reporting moves to `configureAsync({ onError })`), and the repeated "pass the current sort, filters and search" argument lists. What stays: the table-specific conversions (1-based page, sorter to string), which belong in the app and keep the library UI-free.

### Component

```tsx title="Before"
const { data, loading, page, pageSize, total } =
  useBloc(ApprovalListCubit).state;

<Table
  dataSource={data}
  loading={loading}
  pagination={{ current: page + 1, pageSize, total }}
/>;
```

```tsx title="After"
const { list, query } = useBloc(ApprovalListCubit).state;

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
await cubit.list.setQuery({ search: 'x' });
expect(cubit.state.query).toMatchObject({ search: 'x', page: 0 });
expect(cubit.state.list.data?.items).toEqual(items);

// or seed the slot without a request
const seeded = withBlocState(ApprovalListCubit, {
  list: success({ items, total: 1 }),
});
```

The `startLoading` / `stopLoading` tests disappear with the methods they cover. The `loadData` tests become `setQuery` tests, and the API mock stays as is.

## Alternatives

| Option                                | What it is                                                                                               | Effort | Notes                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. No new API**                     | Keep a `query` slot and write `setQuery(patch)` per cubit: `this.update(...)` then `this.list.reload()`. | 0      | About 6 lines per cubit, but the page-reset rule is copied into every list cubit and can drift.                                            |
| **B. `listResource` (this proposal)** | Query slot plus `setQuery` on top of `resource`.                                                         | ~1d    | Recommended if a pilot shows A repeating.                                                                                                  |
| **C. Full `paginated()`**             | Owns data, total and query state, with its own slot type.                                                | 1.5d+  | Not recommended: it needs a response mapper per backend shape (`content` vs `page.totalElements`) and adds surface for little gain over B. |

Not covered by any option: lists that page client-side (fetch everything, re-slice), and very bespoke lists with custom merging.

## Open questions

- **Naming.** `listResource` vs `pagedResource` vs `queryResource`. The helper is not really about pages: `setQuery` also fits typeahead and search-only lists.
- **Expanded rows.** The original clears `expandedRowKeys` after each successful load. The sample clears it before the request instead, which is a small behavior change. An `onSuccess` hook on `ResourceOptions` would restore it, but widens the API for one use.
- **Page size changes.** `setQuery({ pageSize })` resets `page` to 0 under the current rule. Confirm that is wanted.
- **Data across failures.** On error, `list.data` keeps the last page (the `resource` rule), so the table shows stale rows plus an error. Confirm that is acceptable, or clear on error.
- **Cursor pagination.** Out of scope: `page` is a number. Do any of your endpoints use cursors?
