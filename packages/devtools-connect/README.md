# @blac/devtools-connect

The BlaC DevTools agent and client. The agent is a plugin that records every state container and serves a typed protocol to DevTools UIs (the in-app overlay or the Chrome extension).

**[Documentation](https://blac-docs.pages.dev/plugins/devtools)** · **[npm](https://www.npmjs.com/package/@blac/devtools-connect)**

> [!WARNING]
> **BlaC v2 is in pre-release (beta).** While in beta, **breaking API changes may
> ship in patch releases** without a major version bump. Pin an exact version and
> check the changelog before upgrading. Strict semver resumes once v2 is officially
> out of beta.

## Installation

```bash
pnpm add @blac/devtools-connect
```

## Setup

```ts
import { getPluginManager } from '@blac/core/plugins';
import { createDevToolsAgent } from '@blac/devtools-connect';

getPluginManager().install(createDevToolsAgent(), {
  environment: 'development',
});
```

Then add the UI from [`@blac/devtools-ui`](../devtools-ui/README.md) or install the Chrome extension.

## Options

```ts
createDevToolsAgent({
  historySize: 50, // recorded changes kept per instance
  maxDisposed: 100, // disposed instances kept listed
});
```

## How it works

- The agent keeps references only — nothing is serialized, and nothing is posted, until a client sends `hello`. With no client attached the cost is a ring-buffer push per state flush.
- One record per plugin flush (changes inside one microtask are coalesced by the core). Messages to a client are batched per frame, and state is sent only for the instance the client is watching.
- Every message carries a `session` and a `seq`; a client that sees a gap asks for a `snapshot`.

## Entry points

| Import                            | Contents                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| `@blac/devtools-connect`          | `createDevToolsAgent`, `serialize`, transports (needs `@blac/core`) |
| `@blac/devtools-connect/client`   | `DevToolsClient` store, `connectInPage()` (no `@blac/core`)         |
| `@blac/devtools-connect/protocol` | Message types and `PROTOCOL_VERSION`                                |

## Writing a host

```ts
import { DevToolsClient } from '@blac/devtools-connect/client';

const client = new DevToolsClient(transport); // any ClientTransport
client.subscribe(render); // useSyncExternalStore-compatible
client.getSnapshot(); // { status, instances, selectedId, history, log }
client.select(id); // watch one instance's state + history
```

## Security

Only install in development — never ship DevTools to production. Serialization caps depth, breadth, string length and total size, and never walks DOM nodes.

## License

MIT
