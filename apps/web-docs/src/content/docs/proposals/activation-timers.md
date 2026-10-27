---
title: 'Proposal: Activation-Scoped Timers'
description: Preview of every, debounced and after in @blac/core, timers bound to a container's activation so they clear themselves and can be tested with fake timers.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/core` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

Timers in containers are managed by hand. In one production codebase:

- About 82 `setTimeout` fields and 19 `setInterval` calls in containers, each with its own clear logic.
- Two separate ref-counted start/stop implementations for shared polling.
- Debounced search handlers held in components with `useMemo(() => debounce(fn, 300), [deps])`.

Each costs something:

- **Leaks.** A timer that is not cleared on every teardown path keeps firing against a deactivated container. A callback that resolves after unmount writes to a dead host.
- **Components hold logic.** A debounce in a component can only be tested by rendering it, and the `useMemo` dependency list decides when the pending call is silently replaced.
- **Duplication.** Every container re-writes `timer = setInterval(...)`, `clearInterval(timer)`, `timer = undefined`.

## Proposed API

Three helpers in `@blac/core`, each bound to the host's `onActivated` signal:

```ts
function every(host: StateContainer, ms: number, fn: () => void): () => void;
function after(host: StateContainer, ms: number, fn: () => void): () => void;
function debounced<A extends unknown[]>(
  host: StateContainer,
  fn: (...args: A) => void,
  ms: number,
): ((...args: A) => void) & { cancel(): void; flush(): void };
```

- `every` runs `fn` every `ms` while the host is active. `after` runs `fn` once, `ms` after activation. Both return a `stop` function.
- `debounced` returns a callable. Each call restarts the wait; `fn` runs with the latest arguments after `ms` of quiet. `.cancel()` drops the pending call; `.flush()` runs it now.
- When the host deactivates, `every` and `after` are cleared, and a pending `debounced` call is cancelled. On the next activation `every` and `after` start again.
- Nothing needs a dispose step. The helpers hold no reference once the host is gone.
- They use the global `setTimeout` and `setInterval`, so fake timers work unchanged.

## Use

```ts
class OrderSearchCubit extends Cubit<{
  query: string;
  results: AsyncState<Order[]>;
}> {
  constructor() {
    super({ query: '', results: idle() });
  }

  private search = resource(this, 'results', (signal) =>
    api.searchOrders(this.state.query, { signal }),
  );

  setQuery = debounced(
    this,
    (query: string) => {
      this.patch({ query });
      void this.search.reload();
    },
    300,
  );
}
```

With [resource input](/proposals/resource-input/), the search itself becomes declarative (`input: (s) => s.query, debounce: 300`), and `setQuery` is a plain `patch`. `debounced` remains for work that is not a resource load, such as autosave or async validation.

```ts
every(this, 30_000, () => void this.refresh.reload()); // poll while active
after(this, 5_000, () => this.patch({ showHint: true })); // once, 5s after activation
```

## Before and after

### Container: polling with a timer field

Adapted from a production container and simplified.

```ts title="Before"
class UpdatesSource {
  private fallbackTimer: ReturnType<typeof setInterval> | undefined;

  start(onSignal: () => void) {
    this.onSignal = onSignal;
    this.syncFallbackPoll();
    this.unsubscribeState = socket.subscribe(() => this.syncFallbackPoll());
  }

  stop() {
    this.unsubscribeState?.();
    this.unsubscribeState = undefined;
    clearInterval(this.fallbackTimer);
    this.fallbackTimer = undefined;
    this.onSignal = undefined;
  }

  private syncFallbackPoll() {
    const liveUpdatesDown = socket.state.status !== 'connected';
    if (!liveUpdatesDown) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = undefined;
    } else if (!this.fallbackTimer) {
      this.fallbackTimer = setInterval(() => this.onSignal?.(), POLL_MS);
    }
  }
}
```

```ts title="After"
class UpdatesCubit extends Cubit<UpdatesState> {
  private poll = every(this, POLL_MS, () => {
    if (socket.state.status !== 'connected') void this.refresh.reload();
  });
}
```

What goes away: the timer field, the `start` / `stop` pair, the clear-and-undefine on three paths, and the state subscription whose only job was to start and stop the interval. The "only while live updates are down" rule becomes a check inside the tick.

Behavior differences to review:

- Before, the interval did not exist while the socket was up. After, it ticks and returns early. If a running timer matters, `every` can be started from a `watch` on the socket state instead.
- The poll runs only while the container is active, which is stricter than "started by someone".

### Component: debounce held outside the container

Adapted from a production component and simplified.

```tsx title="Before"
function ProductSearchField({ allLoaded }: Props) {
  const handleSearch = (text: string) => {
    if (!allLoaded) return;
    void loadProducts(text);
  };

  const handleDebouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [allLoaded],
  );

  useEffect(() => () => handleDebouncedSearch.cancel());

  return <Autocomplete onInputChange={handleDebouncedSearch} />;
}
```

```tsx title="After"
function ProductSearchField() {
  const [, search] = useBloc(ProductSearchCubit);
  return <Autocomplete onInputChange={search.setQuery} />;
}
```

What goes away: the `useMemo` and its dependency list, the cancel effect, and the logic in the component. The `allLoaded` check moves into the container's search function, where it reads current state instead of a stale closure.

### Test

```tsx title="Before — needs a rendered component"
it('searches once after typing stops', async () => {
  render(<ProductSearchField allLoaded />);
  await user.type(screen.getByRole('combobox'), 'abc');
  await waitFor(() => expect(loadProducts).toHaveBeenCalledTimes(1));
});
```

```ts title="After — a container and fake timers"
it('searches once after typing stops', async () => {
  vi.useFakeTimers();
  const search = withBlocState(ProductSearchCubit, {});
  search.setQuery('a');
  search.setQuery('ab');
  search.setQuery('abc');
  await vi.advanceTimersByTimeAsync(300);
  expect(api.searchProducts).toHaveBeenCalledTimes(1);
});
```

The "before" test is a typical shape, not copied from a real suite.

## Library change

- `@blac/core`: `timers.ts` with the three helpers, about 40 lines on top of `onActivated`; exported from `index.ts`.
- Tests: `every` ticks and stops on deactivation, restarts on reactivation; `after` fires once; `debounced` collapses calls, `.cancel` and `.flush` work, a pending call is dropped on deactivation.
- Docs: a short section on the [Cubit](/core/cubit/) page.

Effort: about 3 hours.

This is the building block for debounced async validation in [form primitives](/proposals/form-primitives/) and for polling in [realtime refetch](/proposals/realtime-refetch/).

## Open questions

- **Called before activation.** `every` and `after` start on the next activation. Should `debounced` called while inactive run, queue, or be dropped?
- **Restart on reactivation.** Should `after` fire again on each activation (as proposed), or only once for the container's lifetime?
- **Overlap.** `every` with an async `fn` can overlap if a tick takes longer than `ms`. Skip a tick while one is running, or leave it to the caller?
- **Leading edge.** `debounced` is trailing-only. Add `{ leading: true }` when a use appears, not before.
