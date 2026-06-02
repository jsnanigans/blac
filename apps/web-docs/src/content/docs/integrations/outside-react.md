---
title: Using BlaC outside React
description: "@blac/core has no dependency on React — use blocs in vanilla JS, Node.js, or any framework via watch (observe) and acquire/release (own the lifecycle)."
---

`@blac/core` has no dependency on React. You can use blocs in vanilla JavaScript, Node.js scripts, worker threads, or any framework — without `@blac/react` installed. This page covers the two main patterns: **observing** state with `watch` and **owning** the lifecycle with `acquire`/`release`.

## Observing state with `watch`

`watch` is the primary way to react to state changes outside a component. It creates a subscription, fires the callback once immediately with the current state, and then on every subsequent change.

```ts twoslash
import { watch, Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ token: string | null }> {
  constructor() {
    super({ token: null });
  }

  setToken = (token: string) => this.update(() => ({ token }));
  logout = () => this.update(() => ({ token: null }));
}

// Subscribe — fires immediately, then on every change.
const stop = watch(AuthCubit, (auth) => {
  if (auth.state.token) {
    console.log('Signed in:', auth.state.token.slice(0, 8) + '...');
  } else {
    console.log('Signed out');
  }
});

// Tear down when no longer needed.
stop();
```

`watch` returns a `stop` function. Always call it when the subscription is no longer needed. Forgetting is the most common outside-React leak — a subscription you never stop keeps the bloc alive and runs your callback for the life of the process. See [watch](/core/watch) for the full API.

### Watching multiple blocs

Pass a `readonly` array to observe several blocs at once. The callback fires when **any** of them changes:

```ts twoslash
import { watch, Cubit } from '@blac/core';

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

class ThemeCubit extends Cubit<{ mode: 'light' | 'dark' }> {
  constructor() {
    super({ mode: 'light' });
  }
}

declare function updateDocTitle(name: string, mode: string): void;

const stop = watch([UserCubit, ThemeCubit] as const, ([user, theme]) => {
  updateDocTitle(user.state.name, theme.state.mode);
});

// Call stop() when tearing down
stop();
```

### Self-terminating watches

Return `watch.STOP` from the callback to unsubscribe after a condition is met — useful for one-shot observations:

```ts twoslash
import { watch, Cubit } from '@blac/core';

class AppCubit extends Cubit<{ ready: boolean }> {
  constructor() {
    super({ ready: false });
  }
}

declare function startWorker(): void;

watch(AppCubit, (app) => {
  if (app.state.ready) {
    startWorker();
    return watch.STOP; // unsubscribes after the first match
  }
});
```

## Managing lifecycle with acquire and release

In React, `useBloc` owns the `acquire`/`release` pair for you. Outside React you call them directly. Every `acquire` increments the ref count; the matching `release` decrements it. At ref count zero the instance is disposed.

```ts twoslash
import { acquire, release, Cubit } from '@blac/core';

class TaskQueueCubit extends Cubit<{ pending: number }> {
  constructor() {
    super({ pending: 0 });
  }
  enqueue = () => this.update((s) => ({ pending: s.pending + 1 }));
  dequeue = () => this.update((s) => ({ pending: Math.max(0, s.pending - 1) }));
}

// Acquire a ref — the instance is created on first acquire.
const queue = acquire(TaskQueueCubit);

queue.enqueue();
console.log(queue.state.pending); // 1

// Release when done — drops the ref count.
// At ref count 0 the instance is disposed (unless keepAlive).
release(TaskQueueCubit);
```

:::danger[Pair every acquire with a release]
A missing `release` is an instance leak: the ref count never reaches zero, the bloc never disposes, and any subscriptions and timers it holds run forever. Use a `try/finally` when the release might be skipped due to an error:

```ts twoslash
import { acquire, release, Cubit } from '@blac/core';

class ReportCubit extends Cubit<{ data: string[] }> {
  constructor() {
    super({ data: [] });
  }
}

declare function processData(data: string[]): Promise<void>;

async function runReport() {
  const report = acquire(ReportCubit);
  try {
    await processData(report.state.data);
  } finally {
    // Runs even if processData throws.
    release(ReportCubit);
  }
}
```

:::

### Read-only access without a ref

If you only need to read the current state and do not need to keep the instance alive, use `borrow` (throws if absent) or `borrowSafe` (returns an error object). Neither takes a ref, so no `release` is needed:

```ts twoslash
import { borrow, borrowSafe, Cubit } from '@blac/core';

class ConfigCubit extends Cubit<{ apiUrl: string }> {
  constructor() {
    super({ apiUrl: '' });
  }
}

// borrow: throws if the instance does not exist.
// Use when absence is a programming error.
const url = borrow(ConfigCubit).state.apiUrl;

// borrowSafe: discriminated union instead of throwing.
// Use when absence is expected.
const result = borrowSafe(ConfigCubit);
if (result.error) {
  console.warn('Config not initialized');
} else {
  console.log(result.instance.state.apiUrl);
}
```

### Combining watch with acquire

`watch` calls `ensure` internally — it does not take a ref. If you need both a stable subscription **and** a ref (to keep the instance alive while nothing else holds it), `acquire` first, then `watch`:

```ts twoslash
import { acquire, release, watch, Cubit } from '@blac/core';

class MetricsCubit extends Cubit<{ fps: number }> {
  constructor() {
    super({ fps: 0 });
  }
}

declare function updateDashboard(fps: number): void;

// Keep the instance alive + observe changes.
const metrics = acquire(MetricsCubit);

const stop = watch(MetricsCubit, (m) => {
  updateDashboard(m.state.fps);
});

// On teardown — stop watching first, then release the ref.
function teardown() {
  stop();
  release(MetricsCubit);
}
```

## Node.js scripts and worker threads

Blocs work in Node.js without any changes. The module-level registry is per-module-graph, so in a single Node process the same singleton rules apply as in a browser tab.

For **worker threads** (`node:worker_threads`), each worker has its own module graph and therefore its own registry. Blocs do not cross thread boundaries — pass data between threads via the standard `postMessage` / `MessageChannel` API.

For **long-running servers** that handle multiple requests in the same process, apply the [per-request registry isolation](/integrations/ssr) pattern to prevent state bleed between concurrent users.

```ts twoslash
import { watch, acquire, release, Cubit } from '@blac/core';

class JobCubit extends Cubit<{ status: 'idle' | 'running' | 'done' }> {
  constructor() {
    super({ status: 'idle' });
  }
  start = () => this.update(() => ({ status: 'running' }));
  finish = () => this.update(() => ({ status: 'done' }));
}

// Node.js CLI script — no React, no browser.
const job = acquire(JobCubit);

// Watch for completion then exit.
watch(JobCubit, (j) => {
  if (j.state.status === 'done') {
    console.log('Job complete');
    return watch.STOP;
  }
});

job.start();
// ... do work ...
job.finish(); // callback fires, prints "Job complete"

release(JobCubit);
```

## See also

- [watch](/core/watch) — full API, `instance()` references, `watch.STOP`, and the coalescing model
- [Instance Management](/core/instance-management) — the full registry API: `acquire`, `release`, `borrow`, `ensure`, `clearAll`
- [SSR & per-request isolation](/integrations/ssr) — isolating the registry in long-lived server processes
- [Testing core logic](/testing/core) — `clearAll` for isolating the registry between tests
