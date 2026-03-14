# @blac/plugin-persist

IndexedDB persistence plugin for BlaC state management.

**[Full documentation](https://jsnanigans.github.io/blac/plugins/persistence)**

## Features

- Hydrate Cubit state from IndexedDB on instance creation
- Persist state changes automatically with optional debouncing
- Transform state to/from persisted records
- Track persistence status (hydrating, hydrated, saving, saved, error)
- Custom storage adapters

## Quick Start

```ts
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { getPluginManager } from '@blac/core';

const persist = createIndexedDbPersistPlugin();
persist.persist(UserSettingsCubit);
getPluginManager().install(persist);
```

## License

MIT
