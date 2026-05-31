# Debounce

**Use when:** you want to collapse rapid user input (search-as-you-type, resize,
window scroll) into one deferred action to avoid hammering the server or doing
expensive work on every keystroke.
**Don't use when:** the action must fire immediately on the first event and you
only want to throttle subsequent ones — use throttle instead.

## Pattern

Store the debounce timer as a private field on the Cubit and cancel it before
scheduling a new one. No external debounce library is needed.

```ts twoslash
import { Cubit } from '@blac/core';

interface SearchResult {
  id: string;
  title: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

declare const api: {
  search(q: string): Promise<SearchResult[]>;
};
// ---cut---
class SearchCubit extends Cubit<SearchState> {
  // Timer handle for the pending debounced call.
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  constructor() {
    super({ query: '', results: [], status: 'idle', error: null });

    // Cancel any in-flight timer when the instance is disposed.
    this.onSystemEvent('dispose', () => {
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    });
  }

  setQuery = (query: string) => {
    // Update the input field immediately so the UI feels responsive.
    this.patch({ query, status: 'idle' });

    // Cancel the previous pending search.
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);

    if (!query.trim()) {
      this.patch({ results: [], status: 'idle' });
      return;
    }

    // Schedule the actual fetch after 300 ms of silence.
    this.debounceTimer = setTimeout(() => {
      void this.fetchResults(query);
    }, 300);
  };

  private fetchResults = async (query: string) => {
    const reqId = ++this.requestId;
    this.patch({ status: 'loading', error: null });

    try {
      const results = await api.search(query);
      if (reqId !== this.requestId) return; // superseded by a newer call
      this.patch({ results, status: 'success' });
    } catch (e) {
      if (reqId !== this.requestId) return;
      this.patch({ results: [], status: 'error', error: String(e) });
    }
  };
}
```

```tsx
function SearchBox() {
  const [state, search] = useBloc(SearchCubit);

  return (
    <div>
      <input
        value={state.query}
        onChange={(e) => search.setQuery(e.target.value)}
        placeholder="Search…"
      />
      {state.status === 'loading' && <p>Searching…</p>}
      <ul>
        {state.results.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

::: warning Cancel on dispose
If the debounce timer fires after the Cubit is disposed, it will attempt to
`emit` on a dead container and throw. Always clear the timer in the `dispose`
system event, as shown above.
:::

::: tip Combine with the request-id guard
The timer collapses keystrokes, but two timers can still fire close together.
The `requestId` guard (shown in `fetchResults`) ensures only the last response
is applied. See [Async](/guide/async#the-request-id-guard) for the full pattern.
:::

## See also

- [Async](/guide/async) — request-id guard and cancellation with `AbortController`
- [System Events](/core/system-events) — `dispose` event for cleanup
