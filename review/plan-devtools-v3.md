# Plan — DevTools v3 (rebuild)

Scope: `packages/devtools-connect` (2.0.23), `packages/devtools-ui` (2.0.23),
`apps/devtools-extension` (2.0.5). Surface-level review on `main` @ `965dff04`,
2026-10-20. Line counts: connect ~1.6k src, ui ~5k src, extension ~0.9k src.

---

## 1. What we have

```
page                                 extension                         UI
DevToolsBrowserPlugin ──postMessage──▶ content-script ──runtime msg──▶ service-worker ──port──▶ panel/index.tsx
  ├ instanceCache (serialized)                                          (caches INITIAL_STATE)    └ DevToolsPanel (blocs)
  ├ DevToolsStateManager (history)
  ├ eventHistory ring (10 000 events)
  └ window.__BLAC_DEVTOOLS__ ─────────────── subscribe() ─────────────────────────────────────▶ DraggableOverlay (in-app)
```

### Problems worth designing around

**Cost when nobody is looking**

- Every flush is serialized and posted to the window even with no extension or
  overlay open: `emit()` calls `broadcastToExtension` unconditionally
  (`DevToolsBrowserPlugin.ts` `emit`). `window.postMessage` structured-clones
  the payload whether or not anyone listens — the comment calling it
  "negligible" is wrong.
- Each update serializes state up to 3× (`state`, `previousState`,
  `currentState` in `createInstanceData`) and evaluates + serializes **every
  getter** on the instance. Getters can be expensive or side-effecting; the
  reentrancy guard exists because they already caused loops.
- `onRefAcquired` captures `new Error().stack` on every acquire, ungated.

**Three copies of the same data, all unbounded in size**

- `instanceCache`, `DevToolsStateManager.history`, and a 10 000-entry event
  ring, each holding full serialized states. `INITIAL_STATE` ships the whole
  event ring, is re-sent every 10 s while connected, and is cached in the MV3
  service worker (which Chrome kills anyway, so the cache is unreliable).
- `serialize` has a size cap that never runs (only checked when
  `maxSizeBytes < MAX_SIZE_BYTES`) and no breadth cap; large arrays go over the
  wire in full.

**Reliability is patched, not designed**

- No protocol: message shapes are `any`, duplicated by hand in
  `devtools-connect/src/types` and `devtools-extension/src/panel/comm.ts`
  (already drifted — `deps-changed` is emitted but never handled).
- Sync is heartbeat + 3-miss timeout + 10 s full re-sync + session-id
  comparison + `PAGE_RELOAD` + "re-request on PONG if disconnected". No
  sequence numbers, so dropped/duplicated deltas are undetectable; the periodic
  full dump is the only repair.
- Event → UI mapping is written three times (live events, history replay in
  the extension, `processEventIntoLogs` in the overlay).
- Falsy states are dropped: `previousState ? safeSerialize(...) : undefined`
  loses `0`, `''`, `false`.
- `extensionConnected` flips true on the first message and never back.

**Heuristics that will keep breaking**

- "Trigger" = first non-filtered stack frame, filtered by string-matching
  ~20 file/function names (`captureCallstack`). Breaks with bundler, React or
  path changes.
- Time-travel calls `emit(arbitraryState)` after a linear scan of every type;
  it bypasses any invariants and the panel can send any JSON.
- Class names come from `constructor.name` — minified in prod-like builds
  (already noted in `05-api-and-types.md`).

**UI coupling and isolation**

- The panel is driven by imperative `onMount(instancesBloc)` callbacks that
  reach into 4 blocs; each host re-implements the wiring.
- In overlay mode the devtools' own blocs live in the **app's** registry.
  `excludeFromDevTools` is only honoured by the devtools plugin
  (`isExcludedFromDevTools` has no other callers), so `logging-plugin` and
  `plugin-persist` see devtools UI state.
- `flushSync` per event batch to dodge background-tab throttling.
- Docs drift: README advertises Picture-in-Picture and a `mode` prop; neither
  exists in `src`.
- Deps include an alpha (`@uiw/react-json-view@2.0.0-alpha.43`) and
  `json-diff-kit`.

### Worth keeping

- `serialize`'s type tagging (Map/Set/Date/DOM/circular) and the DOM/React
  fiber guards — hard-won, move as-is and add caps.
- Decoding `PathSet` → dotted paths via `interner.lookup` — cheap and genuinely
  useful ("what changed").
- rAF batching of outbound traffic.
- `excludeFromDevTools` as the opt-out.

---

## 2. Goals for v3

1. **Zero cost when closed.** No serialization, no postMessage, no stack
   capture until a client says hello.
2. **Correct by construction.** One typed, versioned protocol; sequence
   numbers; snapshot-on-gap is the only resync path.
3. **Pull heavy, push light.** Push metadata and changed paths for everything;
   send state only for what the UI is looking at.
4. **One UI, two hosts.** Same panel in the Chrome extension and the in-app
   overlay, differing only in transport.
5. **Small.** Target well under half of today's ~7.5k lines.

### Non-goals for v3.0 (backlog, §6)

Time-travel / state editing, trigger/action names, consumer watched paths, ref
holders, deps, hydration, getters by default, update-rate insights, PiP,
session export.

---

## 3. Design

### 3.1 Layers

```
@blac/devtools-connect
  agent.ts       BlacPlugin: tracks instances, keeps per-instance ring of state refs
  protocol.ts    message types + PROTOCOL_VERSION  (subpath: /protocol)
  serialize.ts   moved from today, + breadth/size caps
  transport.ts   Transport interface + in-page and window-postMessage impls
  client.ts      DevToolsClient: speaks the protocol, exposes a store for the UI

@blac/devtools-ui
  Panel (pure: takes a DevToolsClient)       Overlay host (in-page transport)

apps/devtools-extension
  content script (dumb relay)  →  port  →  panel host (extension transport)
```

The agent is the only thing that touches `@blac/core`. Everything to the right
of the transport only knows `protocol.ts`.

### 3.2 Agent

- On `onCreated` / `onStateChange` / `onDestroyed`: update an in-memory
  `Map<id, Entry>` with **references** — `{ id, className, name, createdAt,
  disposedAt?, version, ring: Array<{ seq, at, state, paths }> }`. No
  serialization on the hot path. BlaC state is immutable per emit, so holding
  references is safe; the ring (default 50) bounds retention.
- Disposed entries stay listed (greyed) for a bounded window (e.g. last 100)
  so short-lived blocs can be inspected after they die.
- With no client attached, that map is all the work done. Recording even when
  closed means opening devtools shows recent history — keep it, it is cheap.
- With a client attached: batch outbound messages per animation frame;
  serialize only what is sent.
- Discovery for the overlay: `globalThis[Symbol.for('blac.devtools')]` holds
  the agent's in-page endpoint (one well-known hook, like React's global hook),
  replacing the `window.__BLAC_DEVTOOLS__` method bag.
- Granularity: one record per plugin flush (`onStateChange` is already
  flush-coalesced). The agent adds no further coalescing to the **record**,
  only to sending. Intermediate emits inside a flush are not shown — document
  it; `registry.on('stateChanged')` is the per-emit lane if we ever need it.

### 3.3 Protocol (v1)

```ts
// client → agent
| { t: 'hello'; protocol: 1 }
| { t: 'watch'; id: string | null }          // instance whose state to stream
| { t: 'history'; id: string }               // request ring for one instance
| { t: 'snapshot' }                          // resync

// agent → client  (every message carries session + seq)
| { t: 'welcome'; protocol: 1; session: string; seq: number; instances: InstanceMeta[] }
| { t: 'created'; seq; meta: InstanceMeta }
| { t: 'changed'; seq; id; version; at; paths: string[] | 'all'; state?: Wire }  // state only for watched id
| { t: 'disposed'; seq; id; at }
| { t: 'history'; seq; id; entries: Array<{ version; at; paths; state: Wire }> }
| { t: 'snapshot'; seq; session; instances: InstanceMeta[] }
```

Rules — the whole reliability story:

- Client tracks `session` and `seq`. New `session` ⇒ reset everything. `seq`
  gap ⇒ send `snapshot`. No heartbeat, no periodic full sync.
- Protocol mismatch ⇒ UI shows "agent vX / panel vY, update one of them"
  instead of misbehaving.
- Agent stops sending when the transport reports disconnect (port closed /
  overlay unmounted) and drops back to zero-cost mode.

### 3.4 Transports

```ts
interface Transport {
  send(msg: ClientMsg | AgentMsg): void;
  onMessage(cb: (msg) => void): () => void;
  onClose(cb: () => void): () => void;
}
```

- **In-page:** direct function calls (no clone), used by the overlay and by
  tests.
- **Extension:** page `postMessage` ⇄ content script ⇄ `runtime.connect` port
  ⇄ panel. Content script only opens a port once the panel connects, and the
  service worker is a stateless router keyed by tabId (no caches). Navigation
  shows up as a new `session`, so no `PAGE_RELOAD` special case. Top frame only
  for v3.0.

### 3.5 Serialization

Keep today's `serialize`, plus:

- breadth caps (e.g. 100 keys / 100 array items, then `{ __type: 'Truncated', total }`),
- string cap (e.g. 10 kB),
- depth cap returns a `Truncated` marker instead of throwing.

One serialize per sent state; never on the record path.

### 3.6 UI

- `DevToolsClient` owns all state (instances, selected id, watched state,
  history, log) and exposes `subscribe/getSnapshot` for
  `useSyncExternalStore`. The panel is `<Panel client={client} />` — no
  `onMount` callbacks, no host-specific wiring.
- **Decision to confirm:** the UI's store is **not** BlaC blocs. In overlay mode
  they would sit in the app's registry and flow through every other plugin
  (see §1). A plain store keeps devtools fully isolated from the thing it
  inspects. (Alternative if dogfooding matters: a separate registry instance —
  only if core supports it cleanly.)
- Views (v3.0):
  1. **Instances** — list grouped by class, filter by text, live/disposed,
     brief flash on change, change counter.
  2. **Inspector** — selected instance: current state as a collapsible JSON
     tree; history list (time, changed paths); select an entry ⇒ diff vs
     previous entry.
  3. **Log** — global created/changed/disposed stream with changed paths;
     click ⇒ jumps to the instance + entry. Bounded (e.g. 1 000).
- One small in-house JSON tree + path-based diff (we already have `paths`
  per change, so the diff can highlight those paths instead of a generic
  diff lib). Drop `@uiw/react-json-view` alpha and `json-diff-kit`.
- Plain CSS file with a few tokens; no inline-style sprawl.

---

## 4. Phases

Each phase ends green (`vp check`, `vp test`) and is reviewable on its own.

| #   | Work                                                                                                       | Proves it                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `protocol.ts`, `serialize` caps, agent, in-page transport, `DevToolsClient`                                | Vitest: agent + client over in-page transport — create/change/dispose, watch, history, seq-gap ⇒ snapshot, session reset, no sends before hello |
| 2   | Zero-cost check                                                                                            | Test: no serialize/postMessage calls with no client; perf bench A/B (plugin installed vs not) run by the user |
| 3   | `@blac/devtools-ui` Panel + overlay host (`Alt+D`) wired into `apps/examples`                              | Manual pass on examples; a couple of component tests for list/inspector                                       |
| 4   | Extension transport, content script, stateless SW, panel host                                              | Manual checklist: open/close panel, reload, SPA nav, SW restart (chrome://serviceworker-internals stop)       |
| 5   | Delete old code (`DevToolsStateManager`, `enumerateGetters`, event ring, heartbeat, `__BLAC_DEVTOOLS__`, blocs), docs page + READMEs, changesets (major) | `apps/web-docs` devtools page matches behaviour; no PiP/`mode` claims                                         |

Phases 3 and 4 can run in parallel once phase 1 lands.

---

## 5. Open decisions

1. UI store: plain store (recommended) vs BlaC in a separate registry.
2. Keep both hosts in v3.0, or ship overlay first and extension in v3.1?
   Recommendation: both — the transport split makes the extension mostly
   plumbing, and it is the host people expect.
3. Display names under minification: fall back to `constructor.name` for now,
   or add an optional `name` to `@blac({...})` in core as part of this work.

---

## 6. Backlog (post-v3.0, in rough priority)

1. **Set state** (replaces time-travel): `{ t: 'setState', id, state }`, gated
   behind an explicit agent option, through a proper core API rather than
   `emit` on an arbitrary instance.
2. **Action/trigger names** from a core hook (method name at emit time), not
   stack parsing.
3. **Getters on demand:** "evaluate" button for the selected instance only.
4. **Consumers:** which `useBloc` consumers watch which paths (data already
   available via `getConsumerPaths`).
5. Ref holders, deps, hydration status.
6. Session export/import, PiP host, iframe support.
