---
title: 'Proposal: Realtime Refetch'
description: Preview of event sources, refetch triggers and conditional polling for @blac/async, replacing hand-written socket watchers, coalescing flags and focus listeners.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

In realtime apps, a pushed socket event mostly means "something changed, refetch". The data itself is rarely in the payload, and the wire has no sequence numbers, so after a reconnect nobody can tell what was missed. Recovery must refetch too. `resource` has no way to say any of this, so each container hand-rolls it:

- **Watcher plumbing.** A class subscribes to the socket, filters events, and also fires its callback on `reconnected`, `authenticated` and `resubscribed`.
- **Coalescing flags.** An `isRefreshing` / `pendingRefresh` pair keeps overlapping refreshes from stacking up. In one production codebase there are about 51 hand-written debounce or coalesce guards.
- **Fallback polling.** While the socket is down, a `setInterval` polls (45s), and a state subscription starts and stops it.
- **Page-level triggers.** `online` and `visibilitychange` listeners, and on mobile an app-resume hook (9 uses in one app), each re-signal a refetch.

`resource().reload()` is not the answer to any of these. It aborts the call in flight, which is right for a user-initiated reload but wrong for a burst of events: a steady stream would keep cancelling the request that is about to land.

## Proposed API

### Source adapter

A source turns an app's socket into two subscriptions. It is written once and registered once:

```ts
interface RealtimeSource<E = unknown> {
  /** Called for every pushed event. */
  subscribe(cb: (event: E) => void): () => void;
  /** Called when events may have been missed: reconnect, re-auth, re-observe. */
  onRecover(cb: () => void): () => void;
}

configureAsync({ sources: [orderEvents] });
```

### Per-resource `refetchOn`

```ts
resource(this, 'order', fn, {
  auto: true,
  refetchOn: {
    event: (e) => e.type === 'order.updated' && e.orderId === this.args.orderId,
    recover: true, // the source's onRecover
    focus: true, // tab becomes visible
    online: true, // browser comes back online
  },
});
```

- `event` is a predicate. Returning `true` triggers a refetch. Omit it to ignore events.
- `recover`, `focus` and `online` are plain switches.
- Triggers are pluggable: `configureAsync({ triggers: { resume } })` registers a custom trigger (for example a native app-resume event), enabled per resource with `refetchOn: { resume: true }`. `focus` and `online` ship built in.

### Coalescing

Every trigger goes through one rule: **one load in flight, plus at most one trailing rerun.**

- Idle: the trigger starts a load.
- A load is in flight: the trigger sets a "rerun" flag and returns. When the load settles, one more load runs and the flag clears.

Unlike `reload`, nothing is aborted. This is safe because refetches are GETs, so the trailing load always reads state at least as new as the last event.

### Inactive hosts

Same rule as `invalidate` today. A trigger that arrives while the host is inactive marks the resource stale, and the next activation loads it. Nothing is fetched for a screen nobody is looking at.

### `refetchInterval`

```ts
refetchInterval: (state) => (socket.connected ? false : 45_000),
```

A function of the host state returning milliseconds or `false`. The interval runs only while the host is active, goes through the same coalescing, and is re-evaluated after each state change. Returning `false` stops it. This gives "poll only while the socket is unhealthy" without a state subscription and a timer field, provided the connection status is readable from state (see open questions).

## Use

```ts
const orderEvents: RealtimeSource<OrderEvent> = {
  subscribe: (cb) => socket.on('event', cb),
  onRecover: (cb) =>
    socket.onAny(['reconnected', 'authenticated', 'resubscribed'], cb),
};

configureAsync({ sources: [orderEvents] });
```

## Before and after

### Cubit: an order detail screen

Adapted from a production container and simplified.

```ts title="Before"
class OrderDetailCubit extends Cubit<OrderDetailState> {
  private isRefreshing = false;
  private pendingRefresh = false;
  private watcher = new EventWatcher();
  private fallbackTimer?: ReturnType<typeof setInterval>;

  startWatching = (orderId: string) => {
    this.watcher.start(
      (e) =>
        e.subjects?.some((s) => s.type === 'order' && s.id === orderId) ??
        false,
      this.refresh,
    );
    this.syncFallbackPoll();
    this.unsubscribeSocket = socket.subscribe(() => this.syncFallbackPoll());
    window.addEventListener('online', this.refresh);
    document.addEventListener('visibilitychange', this.onVisibility);
  };

  stopWatching = () => {
    this.watcher.stop();
    this.unsubscribeSocket?.();
    clearInterval(this.fallbackTimer);
    window.removeEventListener('online', this.refresh);
    document.removeEventListener('visibilitychange', this.onVisibility);
  };

  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.refresh();
  };

  private syncFallbackPoll() {
    const down = socket.state.status !== 'authenticated';
    if (!down) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = undefined;
    } else if (!this.fallbackTimer) {
      this.fallbackTimer = setInterval(this.refresh, 45_000);
    }
  }

  private refresh = async () => {
    const orderId = this.state.order?.id;
    if (!orderId) return;
    if (this.isRefreshing) {
      this.pendingRefresh = true;
      return;
    }
    this.isRefreshing = true;
    try {
      await this.loadOrder(orderId, { background: true });
    } catch (e) {
      reportError(e);
    } finally {
      this.isRefreshing = false;
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        void this.refresh();
      }
    }
  };
}
```

```ts title="After"
class OrderDetailCubit extends Cubit<
  { order: AsyncState<Order> },
  { orderId: string }
> {
  constructor() {
    super({ order: idle() });
  }

  load = resource(
    this,
    'order',
    (signal, { orderId }) => api.getOrder(orderId, { signal }),
    {
      auto: true,
      refetchOn: {
        event: (e) =>
          e.subjects.some(
            (s) => s.type === 'order' && s.id === this.args.orderId,
          ),
        recover: true,
        focus: true,
        online: true,
      },
      refetchInterval: () =>
        socket.state.status === 'authenticated' ? false : 45_000,
    },
  );
}
```

What goes away: the watcher class, both coalescing flags, the fallback timer and its state subscription, the two page listeners with their cleanup, and `startWatching` / `stopWatching` (activation and deactivation do that now).

Behavior differences to review:

- **Background refresh.** The "before" passes `background: true` so the UI shows no spinner. A resource refetch keeps `data` and sets `status: 'loading'`, so the view must show a spinner only when `data` is `undefined`. Is that enough, or does a silent refetch need its own flag?
- **Errors.** The "before" reports to `reportError` only. A failed refetch now also sets `status: 'error'` on the slot, while keeping the old `data`. A view that renders `error` as a blocking state would flash it during a flaky poll.
- **`refetchInterval` reads `socket.state`.** It is not host state, so nothing re-evaluates it when the socket recovers. See open questions.
- **Chained reloads.** The real container also reloads a sibling timeline container after each refresh. That moves to the sibling's own `refetchOn`, or to a `watch` on the order slot.

### Test

```ts title="Before — flags need their own cases"
it('runs one trailing refresh for events during a refresh', async () => {
  const done = cubit.refresh();
  cubit.refresh();
  cubit.refresh();
  await done;
  expect(loadOrder).toHaveBeenCalledTimes(2);
});
```

```ts title="After — fake source, assert the fetch count"
it('refetches on matching events only', async () => {
  const source = fakeSource();
  configureAsync({ sources: [source] });
  const cubit = await activate(OrderDetailCubit, { orderId: 'o1' });
  source.emit({ subjects: [{ type: 'order', id: 'o2' }] });
  source.emit({ subjects: [{ type: 'order', id: 'o1' }] });
  await waitForState(cubit, (s) => s.order.status === 'success');
  expect(api.getOrder).toHaveBeenCalledTimes(2); // activation + one match
});
```

`fakeSource` would live in `@blac/async/testing`. The "before" test is a typical shape, not copied from a real suite.

## Library change

- `config.ts`: `sources` and `triggers` in `AsyncConfig`, with `focus` and `online` built in.
- `resource.ts`: `refetchOn` and `refetchInterval`. Subscriptions are created in the existing `onActivated` callback and torn down with its signal. The coalescer is a rerun flag around `run`, about 15 lines.
- Tests: coalescing (one in flight, one trailing), non-matching events ignored, stale-on-inactive then load on activation, recovery refetch, interval start and stop, unsubscribe on deactivation.
- Docs: a "Realtime" section in `guide/async-resources.md`.

Effort: about 1–1.5 days.

## Open questions

- **Event typing per source.** `configureAsync({ sources })` erases `E`. Options: module augmentation of one app-wide event type, a generic on `resource`, or a typed helper `refetchOn: sourceOf(orderEvents, { event })`. Which fits apps with several sockets?
- **Debounce in `event`?** A burst of events already coalesces to two loads. Is a `debounce: ms` option still needed, or is that `debounced` from [activation timers](/proposals/activation-timers/)?
- **`staleTime`.** Triggers bypass it by default, since "something changed" should not be ignored because the last load was recent. `focus` and `online` are the exception: they could respect `staleTime` so that tab switching does not refetch every time. Should that be the default for those two?
- **Reactive intervals.** `refetchInterval(state)` only sees host state. To react to connection status, the host must mirror it into state, or the option takes a signal. Which is simpler to document?
- **Several resources, one event.** Each resource subscribes separately, so one event can start several loads. That matches today, and `invalidate` tags remain the way to share a trigger. Is that enough?
