---
title: Plugin Recipes
description: Copy-paste BlacPlugin recipes for common cross-cutting concerns — localStorage, debounced saves, cross-tab sync, Sentry breadcrumbs, and audit logging.
---

Copy-paste plugins for common cross-cutting concerns. Each recipe is a
self-contained `BlacPlugin` that you can drop into your app and tweak. All
recipes use only `@blac/core` imports so they work without any extra
dependencies unless noted.

For the plugin authoring API that every recipe is built on, see
[Plugin Authoring](/core/plugins). For the official first-party plugins see
[Plugin Overview](/plugins/overview).

## Compose order and throw semantics

Plugins execute in install order. Keep these rules in mind when you compose
several recipes together:

- **Persistence first.** If you layer a logging plugin on top of a
  persistence plugin, the logger will see the post-hydration state. That is
  usually what you want — logging will then record the initial _restored_
  value rather than the constructor default.
- **Sinks last.** Send-to-server plugins (Sentry, audit log) should be
  installed after any transforming or filtering plugins so they see the final
  view of the state.
- **Hook throws are not caught.** If `onStateChange` throws, the exception
  propagates synchronously out of the flush and the remaining plugins in the
  chain are skipped. Guard any I/O inside a `try/catch` in your hooks rather
  than letting errors bubble.

---

## 1. localStorage adapter

A minimal persistence plugin backed by `localStorage` instead of IndexedDB.
Good for small string-serializable state where IndexedDB is unnecessary.

:::caution[PII caveat]
`localStorage` is readable by any script on the same origin. Do not persist
state that contains passwords, tokens, health data, or any other personally
identifiable information. If you need to store sensitive data, prefer the
official [Persistence plugin](/plugins/persistence) with an encrypted adapter,
or keep it in a `sessionStorage`-backed variant.
:::

```ts twoslash
import {
  getPluginManager,
  type BlacPlugin,
  type PathSet,
  ALL_PATHS,
  type StateContainerConstructor,
} from '@blac/core';

// --- Recipe: localStorage persistence ---

interface LocalStorageOptions<S extends object> {
  /**
   * Classes to persist. State must be JSON-serializable.
   * e.g. [CartCubit, ThemeCubit]
   */
  targets: StateContainerConstructor<S>[];
  /** Storage key prefix. Defaults to "blac". */
  prefix?: string;
}

function createLocalStoragePlugin<S extends object>(
  opts: LocalStorageOptions<S>,
): BlacPlugin {
  const prefix = opts.prefix ?? 'blac';
  const targetNames = new Set(opts.targets.map((T) => T.name));

  return {
    name: 'local-storage-persist',
    version: '1.0.0',

    onCreated(ctx) {
      const c = ctx.container;
      if (!c || !targetNames.has(c.name)) return;

      const key = `${prefix}:${c.name}:${c.$blac.id}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const saved = JSON.parse(raw) as S;
          ctx.startHydration(c);
          ctx.applyHydratedState(c, saved);
          ctx.finishHydration(c);
        }
      } catch {
        ctx.failHydration(c, new Error('localStorage read failed'));
      }
    },

    onStateChange(ctx, _prev, next, _paths: PathSet) {
      const c = ctx.container;
      if (!c || !targetNames.has(c.name)) return;

      const key = `${prefix}:${c.name}:${c.$blac.id}`;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or private-browsing restriction — fail silently.
      }
    },
  };
}

// Install once at app startup.
// getPluginManager().install(createLocalStoragePlugin({ targets: [] }));
```

---

## 2. Debounced-save adapter

Wraps any synchronous write with a debounce so rapid state changes only
trigger one write per quiet window. Useful when state changes on every
keystroke and the save target (IndexedDB, a remote API) is slow.

```ts twoslash
import {
  getPluginManager,
  type BlacPlugin,
  type PathSet,
  ALL_PATHS,
} from '@blac/core';

// --- Recipe: debounced-save wrapper ---

type SaveFn = (key: string, state: unknown) => void;

interface DebouncedSaveOptions {
  /**
   * Synchronous or async function that does the actual write.
   * Called once per quiet window per instance.
   */
  save: SaveFn;
  /** Milliseconds of inactivity before flushing. Default: 300. */
  debounceMs?: number;
  /** Key prefix. Default: "blac". */
  prefix?: string;
  /** Optional set of class names to include. Omit to include all. */
  include?: string[];
}

function createDebouncedSavePlugin(opts: DebouncedSaveOptions): BlacPlugin {
  const debounceMs = opts.debounceMs ?? 300;
  const prefix = opts.prefix ?? 'blac';
  const includeSet = opts.include ? new Set(opts.include) : null;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    name: 'debounced-save',
    version: '1.0.0',

    onStateChange(ctx, _prev, next, _paths: PathSet) {
      const c = ctx.container;
      if (!c) return;
      if (includeSet && !includeSet.has(c.name)) return;

      const key = `${prefix}:${c.name}:${c.$blac.id}`;

      const existing = timers.get(key);
      if (existing !== undefined) clearTimeout(existing);

      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          opts.save(key, next);
        }, debounceMs),
      );
    },

    onDestroyed(ctx) {
      const c = ctx.container;
      if (!c) return;
      const key = `${prefix}:${c.name}:${c.$blac.id}`;
      const existing = timers.get(key);
      if (existing !== undefined) {
        // Flush immediately on disposal — don't lose the last state.
        clearTimeout(existing);
        timers.delete(key);
        opts.save(key, c.state);
      }
    },
  };
}

// Example: write to localStorage with a 500 ms debounce.
const debouncedPlugin = createDebouncedSavePlugin({
  save: (key, state) => localStorage.setItem(key, JSON.stringify(state)),
  debounceMs: 500,
  include: ['CartCubit', 'DraftCubit'],
});

// Install once at app startup.
// getPluginManager().install(debouncedPlugin);
```

:::tip[Compose order]
Install the debounced-save plugin **after** any persistence plugin if you
also use the official `@blac/plugin-persist`. The official plugin handles
hydration; this recipe only handles writes.
:::

---

## 3. Cross-tab sync

Broadcasts state changes to other browser tabs via `BroadcastChannel` and
applies incoming updates through the hydration API. Use this when multiple
tabs show the same app and you want them to stay in sync (e.g. a shopping
cart or an auth session).

:::caution[PII caveat]
`BroadcastChannel` messages are visible to all same-origin tabs for the
duration of the browser session. Strip or redact any sensitive fields
(tokens, PII) in the `serialize` option before broadcasting.
:::

```ts twoslash
import {
  getPluginManager,
  type BlacPlugin,
  type PathSet,
  ALL_PATHS,
  type StateContainerConstructor,
} from '@blac/core';

// --- Recipe: cross-tab sync via BroadcastChannel ---

interface CrossTabSyncOptions<S extends object> {
  /** Classes to sync across tabs. */
  targets: StateContainerConstructor<S>[];
  /** BroadcastChannel name. Default: "blac-sync". */
  channelName?: string;
  /**
   * Optional transform applied before broadcasting.
   * Use this to strip PII or tokens before the message leaves the tab.
   */
  serialize?: (state: S) => unknown;
  /** Optional transform applied when receiving a message. */
  deserialize?: (payload: unknown) => S;
}

interface SyncMessage {
  type: 'state-update';
  className: string;
  instanceId: string;
  state: unknown;
}

function createCrossTabSyncPlugin<S extends object>(
  opts: CrossTabSyncOptions<S>,
): BlacPlugin {
  const channelName = opts.channelName ?? 'blac-sync';
  const targetNames = new Set(opts.targets.map((T) => T.name));

  let channel: BroadcastChannel | null = null;
  // Track which instance keys are receiving a remote update so we don't
  // echo the incoming state back out to other tabs.
  const receiving = new Set<string>();

  return {
    name: 'cross-tab-sync',
    version: '1.0.0',

    onInstall(ctx) {
      if (typeof BroadcastChannel === 'undefined') return;
      channel = new BroadcastChannel(channelName);

      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        const msg = event.data;
        if (msg?.type !== 'state-update') return;
        if (!targetNames.has(msg.className)) return;

        const instances = ctx.queryInstances(
          // Use the metadata helper to match by name since we only have strings.
          // queryInstances needs the constructor — skip if class not in registry.
          opts.targets.find(
            (T) => T.name === msg.className,
          ) as StateContainerConstructor<S>,
        );

        for (const inst of instances) {
          if (inst.$blac.id !== msg.instanceId) continue;

          const key = `${msg.className}:${msg.instanceId}`;
          receiving.add(key);
          const next = opts.deserialize
            ? opts.deserialize(msg.state)
            : (msg.state as S);
          ctx.startHydration(inst);
          ctx.applyHydratedState(inst, next);
          ctx.finishHydration(inst);
          // Remove after the microtask so onStateChange fires first.
          Promise.resolve().then(() => receiving.delete(key));
        }
      };
    },

    onUninstall() {
      channel?.close();
      channel = null;
    },

    onStateChange(ctx, _prev, next, _paths: PathSet) {
      const c = ctx.container;
      if (!c || !channel) return;
      if (!targetNames.has(c.name)) return;

      const key = `${c.name}:${c.$blac.id}`;
      if (receiving.has(key)) return; // avoid echo

      const payload = opts.serialize
        ? opts.serialize(next as unknown as S)
        : next;

      const msg: SyncMessage = {
        type: 'state-update',
        className: c.name,
        instanceId: c.$blac.id,
        state: payload,
      };
      channel.postMessage(msg);
    },
  };
}

// Install once at app startup.
// getPluginManager().install(createCrossTabSyncPlugin({ targets: [] }));
```

---

## 4. Sentry breadcrumb sink

Adds a Sentry breadcrumb for each state change. Because breadcrumbs are sent
with every event, this gives you a state-change timeline attached to error
reports — similar to Redux DevTools' action history but visible in Sentry.

:::caution[PII caveat]
State is included verbatim in Sentry breadcrumbs and uploaded to Sentry's
servers. Redact or omit any fields that contain passwords, tokens, health
data, or other PII using the `sanitize` option below. Failure to do so may
violate GDPR, HIPAA, or your own privacy policy.
:::

:::note[No `@sentry/browser` in twoslash scope]
The Sentry SDK is not installed in the docs type-checker. The snippet below
uses a plain `ts` fence. Copy it into a project where `@sentry/browser` (or
`@sentry/react`) is installed.
:::

```ts
import { getPluginManager } from '@blac/core';
import type { BlacPlugin, PathSet } from '@blac/core';
import * as Sentry from '@sentry/browser';

// --- Recipe: Sentry breadcrumb sink ---

interface SentryPluginOptions {
  /** Classes to include. Omit to include all blocs. */
  include?: string[];
  /** Classes to exclude. */
  exclude?: string[];
  /**
   * Strip sensitive fields from state before attaching to the breadcrumb.
   * Called with the full next state; return the shape you want Sentry to see.
   * REQUIRED if your state contains PII, tokens, or health data.
   */
  sanitize?: (state: unknown, className: string) => unknown;
}

function createSentryPlugin(opts: SentryPluginOptions = {}): BlacPlugin {
  const includeSet = opts.include ? new Set(opts.include) : null;
  const excludeSet = opts.exclude ? new Set(opts.exclude) : null;

  return {
    name: 'sentry-breadcrumbs',
    version: '1.0.0',

    onStateChange(ctx, _prev, next, _paths: PathSet) {
      const c = ctx.container;
      if (!c) return;
      if (includeSet && !includeSet.has(c.name)) return;
      if (excludeSet && excludeSet.has(c.name)) return;

      const data = opts.sanitize ? opts.sanitize(next, c.name) : next;

      Sentry.addBreadcrumb({
        category: 'blac.state',
        message: `${c.name} changed`,
        level: 'info',
        data: data as Record<string, unknown>,
      });
    },
  };
}

// Install once at app startup. Gate to production so dev overhead stays low.
// getPluginManager().install(createSentryPlugin({
//   sanitize: (state, name) => {
//     if (name === 'AuthCubit') {
//       const s = state as { user: unknown; token: unknown };
//       return { user: s.user, token: '[redacted]' };
//     }
//     return state;
//   },
// }), { environment: 'production' });
```

---

## 5. Audit log

Writes a structured log entry for every state change, creation, and
disposal. Useful for compliance or debugging — you can pipe `entries` to your
existing logging infrastructure, a remote endpoint, or a circular buffer.

:::caution[PII caveat]
The audit log captures the full `prev` and `next` states. If any bloc holds
PII (user profiles, payment details, health data), provide a `sanitize`
function to strip sensitive fields before they are stored. Do not ship raw
state to external endpoints without first sanitizing it.
:::

```ts twoslash
import {
  getPluginManager,
  type BlacPlugin,
  type PathSet,
  ALL_PATHS,
} from '@blac/core';

// --- Recipe: structured audit log ---

type AuditEventKind = 'created' | 'state-changed' | 'disposed';

interface AuditEntry {
  kind: AuditEventKind;
  className: string;
  instanceId: string;
  timestamp: number;
  prev?: unknown;
  next?: unknown;
  /** Human-readable changed paths, or "(all)" for a full-replace. */
  paths?: string[];
}

interface AuditLogOptions {
  /**
   * Called with each new entry. Wire to console.log, a remote endpoint,
   * or push into a circular buffer.
   */
  onEntry: (entry: AuditEntry) => void;
  /** Optional per-entry sanitizer. Strip PII before logging externally. */
  sanitize?: (state: unknown, className: string) => unknown;
  /** Optional allowlist of class names to audit. */
  include?: string[];
  /** Optional denylist of class names to skip. */
  exclude?: string[];
}

function createAuditLogPlugin(opts: AuditLogOptions): BlacPlugin {
  const includeSet = opts.include ? new Set(opts.include) : null;
  const excludeSet = opts.exclude ? new Set(opts.exclude) : null;

  const allowed = (name: string) => {
    if (includeSet && !includeSet.has(name)) return false;
    if (excludeSet && excludeSet.has(name)) return false;
    return true;
  };

  const san = (state: unknown, name: string) =>
    opts.sanitize ? opts.sanitize(state, name) : state;

  return {
    name: 'audit-log',
    version: '1.0.0',

    onCreated(ctx) {
      const c = ctx.container;
      if (!c || !allowed(c.name)) return;
      opts.onEntry({
        kind: 'created',
        className: c.name,
        instanceId: c.$blac.id,
        timestamp: Date.now(),
        next: san(c.state, c.name),
      });
    },

    onStateChange(ctx, prev, next, paths: PathSet) {
      const c = ctx.container;
      if (!c || !allowed(c.name)) return;

      const changedPaths =
        paths === ALL_PATHS
          ? ['(all)']
          : [...paths].map((id) => c.interner.lookup(id));

      opts.onEntry({
        kind: 'state-changed',
        className: c.name,
        instanceId: c.$blac.id,
        timestamp: Date.now(),
        prev: san(prev, c.name),
        next: san(next, c.name),
        paths: changedPaths,
      });
    },

    onDestroyed(ctx) {
      const c = ctx.container;
      if (!c || !allowed(c.name)) return;
      opts.onEntry({
        kind: 'disposed',
        className: c.name,
        instanceId: c.$blac.id,
        timestamp: Date.now(),
        prev: san(c.state, c.name),
      });
    },
  };
}

// Example: log to console with a circular buffer of the last 100 entries.
const auditEntries: AuditEntry[] = [];

getPluginManager().install(
  createAuditLogPlugin({
    onEntry(entry) {
      if (auditEntries.length >= 100) auditEntries.shift();
      auditEntries.push(entry);
      console.debug('[audit]', entry.kind, entry.className, entry.paths);
    },
    sanitize(state, name) {
      if (name === 'AuthCubit') {
        const s = state as { user: unknown; token?: string };
        return { ...s, token: '[redacted]' };
      }
      return state;
    },
  }),
  { environment: 'development' },
);
```

---

## See also

- [Plugin Authoring](/core/plugins) — the `BlacPlugin` interface and hook reference
- [Plugin Overview](/plugins/overview) — first-party plugin catalog
- [Persistence](/plugins/persistence) — official IndexedDB persistence, including a custom adapter API
- [Logging](/plugins/logging) — official structured console logging plugin
