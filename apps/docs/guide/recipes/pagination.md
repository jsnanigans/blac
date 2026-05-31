# Pagination

**Use when:** you need to page through a large server-side list — cursor-based or
offset/page-based — with loading state per page and optional prefetch.
**Don't use when:** the full list fits in memory comfortably; just load everything
once and slice client-side.

## Offset / page-based

The most common shape: a `page` number plus a `totalPages` count returned by the
server.

```ts twoslash
import { Cubit } from '@blac/core';

interface Article {
  id: string;
  title: string;
}

interface PageResult {
  items: Article[];
  totalPages: number;
}

declare const api: {
  listArticles(page: number, perPage: number): Promise<PageResult>;
};
// ---cut---
interface PaginationState {
  items: Article[];
  page: number;
  totalPages: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

class ArticleListCubit extends Cubit<PaginationState> {
  private readonly perPage = 20;
  private requestId = 0;

  constructor() {
    super({ items: [], page: 1, totalPages: 1, status: 'idle', error: null });
  }

  protected override async init() {
    await this.loadPage(1);
  }

  loadPage = async (page: number) => {
    const reqId = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const { items, totalPages } = await api.listArticles(page, this.perPage);
      if (reqId !== this.requestId) return;
      this.patch({ items, page, totalPages, status: 'success' });
    } catch (e) {
      if (reqId !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };

  nextPage = () => {
    if (this.state.page < this.state.totalPages) {
      void this.loadPage(this.state.page + 1);
    }
  };

  prevPage = () => {
    if (this.state.page > 1) {
      void this.loadPage(this.state.page - 1);
    }
  };

  get hasNext() {
    return this.state.page < this.state.totalPages;
  }

  get hasPrev() {
    return this.state.page > 1;
  }
}
```

```tsx
function ArticleList() {
  const [state, list] = useBloc(ArticleListCubit, {
    select: (s, bloc) => [
      s.items,
      s.page,
      s.totalPages,
      s.status,
      bloc.hasNext,
      bloc.hasPrev,
    ],
  });

  if (state.status === 'loading') return <p>Loading…</p>;
  if (state.status === 'error') return <p>Error: {state.error}</p>;

  return (
    <div>
      <ul>
        {state.items.map((a) => (
          <li key={a.id}>{a.title}</li>
        ))}
      </ul>
      <button onClick={list.prevPage} disabled={!list.hasPrev}>
        ← Prev
      </button>
      <span>
        Page {state.page} / {state.totalPages}
      </span>
      <button onClick={list.nextPage} disabled={!list.hasNext}>
        Next →
      </button>
    </div>
  );
}
```

## Cursor-based (infinite scroll / "load more")

Cursor pagination keeps appending items rather than replacing them. The server
returns an opaque `nextCursor`; a `null` cursor signals the end.

```ts twoslash
import { Cubit } from '@blac/core';

interface Post {
  id: string;
  body: string;
}

declare const api: {
  fetchPosts(
    cursor: string | null,
  ): Promise<{ posts: Post[]; nextCursor: string | null }>;
};
// ---cut---
interface FeedState {
  posts: Post[];
  cursor: string | null; // null = no more pages
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

class FeedCubit extends Cubit<FeedState> {
  private requestId = 0;

  constructor() {
    super({ posts: [], cursor: null, status: 'idle', error: null });
  }

  protected override async init() {
    await this.loadMore();
  }

  loadMore = async () => {
    // Guard: do nothing if already loading or no more pages.
    if (
      this.state.status === 'loading' ||
      (this.state.status === 'success' && this.state.cursor === null)
    ) {
      return;
    }

    const reqId = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const { posts, nextCursor } = await api.fetchPosts(this.state.cursor);
      if (reqId !== this.requestId) return;
      // Append — do not replace the existing list.
      this.patch({
        posts: [...this.state.posts, ...posts],
        cursor: nextCursor,
        status: 'success',
      });
    } catch (e) {
      if (reqId !== this.requestId) return;
      this.patch({ status: 'error', error: String(e) });
    }
  };

  get hasMore() {
    return this.state.cursor !== null;
  }
}
```

```tsx
function Feed() {
  const [state, feed] = useBloc(FeedCubit, {
    select: (s, bloc) => [s.posts, s.status, bloc.hasMore],
  });

  return (
    <div>
      {state.posts.map((p) => (
        <div key={p.id}>{p.body}</div>
      ))}
      {feed.hasMore && (
        <button onClick={feed.loadMore} disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
```

::: warning Cursor leakage
Never log or expose raw cursor tokens to the UI — they may embed user identity
or internal shard keys. Treat `cursor` as an opaque internal value.
:::

::: tip Reset on filter change
When the user changes a filter, reset the entire list: `this.emit({ posts: [],
cursor: null, status: 'idle', error: null })` then call `loadMore()`. Without the
reset, old posts from the previous filter bleed into the new page.
:::

## See also

- [Async](/guide/async) — request-id guard and the loadable surface
- [Cubit](/core/cubit) — `patch` deep-merges, `emit` replaces wholesale
