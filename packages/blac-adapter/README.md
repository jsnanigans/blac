# @blac/adapter

Framework-agnostic adapter layer for BlaC. Provides subscription and snapshot functions that power `@blac/react` and `@blac/preact`, and can be used to build integrations for other frameworks.

**[Documentation](https://blac-docs.pages.dev/api/core/adapter)**

## Installation

```bash
pnpm add @blac/adapter @blac/core
```

## Overview

This package provides the building blocks for connecting BlaC state containers to any reactive UI framework. It handles three tracking modes:

- **Auto-tracking** — proxy-based, tracks property access and getter calls
- **Manual dependencies** — user-provided dependency selector
- **No tracking** — re-renders on every state change

Each mode has matching `subscribe`, `snapshot`, and `init` functions designed for use with patterns like `useSyncExternalStore`.

## API

### Init Functions

```ts
import { autoTrackInit, manualDepsInit, noTrackInit } from '@blac/adapter';

const adapterState = autoTrackInit(instance); // sets up proxy + getter tracking
const adapterState = manualDepsInit(instance); // no proxy, caches deps
const adapterState = noTrackInit(instance); // passthrough
```

### Subscribe Functions

```ts
import {
  autoTrackSubscribe,
  manualDepsSubscribe,
  noTrackSubscribe,
} from '@blac/adapter';

const subscribe = autoTrackSubscribe(instance, adapterState);
const subscribe = manualDepsSubscribe(instance, adapterState, { dependencies });
const subscribe = noTrackSubscribe(instance);
```

### Snapshot Functions

```ts
import {
  autoTrackSnapshot,
  manualDepsSnapshot,
  noTrackSnapshot,
} from '@blac/adapter';

const getSnapshot = autoTrackSnapshot(instance, adapterState);
const getSnapshot = manualDepsSnapshot(instance, adapterState, {
  dependencies,
});
const getSnapshot = noTrackSnapshot(instance);
```

### ExternalDepsManager

Manages subscriptions to cross-bloc dependencies discovered via `depend()`. Ensures re-renders when external bloc state changes affect computed getters.

```ts
import { ExternalDepsManager } from '@blac/adapter';

const manager = new ExternalDepsManager();
manager.updateSubscriptions(getterState, rawInstance, onGetterChange);
manager.cleanup();
```

## License

MIT
