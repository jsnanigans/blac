---
title: Next.js
description: BlaC works in Next.js without extra packages — register server-side state isolation like any SSR app and keep blocs in Client Components.
---

BlaC works in Next.js without extra packages. The main considerations are (1) registering server-side state isolation the same way as any SSR app, and (2) understanding which rendering boundary owns your blocs.

## App Router

### Mark bloc-consuming components `'use client'`

Blocs live in JavaScript module state and require browser APIs (event listeners, subscriptions). Any component that calls `useBloc` must be a Client Component:

```tsx
'use client';

import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.update((s) => ({ count: s.count + 1 }));
}

export function Counter() {
  const [state, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.increment}>Count: {state.count}</button>;
}
```

### Do not read or write blocs in Server Components

Server Components run on the server, in the same Node.js process that handles every request. The module-level registry is shared across all concurrent requests in that process. Reading or mutating a bloc from a Server Component is a **data-leakage hazard** — see [SSR & per-request isolation](/integrations/ssr) for the full explanation.

:::danger[Do not call registry functions from Server Components]
Calling `acquire`, `ensure`, `borrow`, `watch`, or any other registry function inside a Server Component shares the module-level singleton across requests.

```tsx
// BAD — Server Component touching the registry
// This leaks state between concurrent users.
import { ensure } from '@blac/core';
import { UserCubit } from './UserCubit';

export default function UserPage() {
  // acquire / ensure / borrow in a Server Component = cross-request leak
  const user = ensure(UserCubit);
  return <div>{user.state.name}</div>;
}
```

Pass server-fetched data down as props instead, then feed it to blocs via `args` in a Client Component.
:::

### Feeding server data to blocs via args

Fetch data in the Server Component and pass it as props. Receive the props in a Client Component and forward them to `useBloc` as `args` so the bloc's `init` method can set the initial state before the first render:

```tsx
// app/users/[id]/page.tsx  — Server Component (no 'use client')
import { UserCard } from './UserCard';

export default async function UserPage({ params }: { params: { id: string } }) {
  // Fetch happens on the server; no blocs involved here.
  const userData = await fetch(`/api/users/${params.id}`).then((r) => r.json());
  return <UserCard initialData={userData} userId={params.id} />;
}
```

```tsx
// app/users/[id]/UserCard.tsx — Client Component
'use client';

import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

interface UserState {
  name: string;
  bio: string;
}
interface UserArgs {
  userId: string;
  initialData: UserState;
}

class UserCardCubit extends Cubit<UserState, UserArgs> {
  protected init(args: UserArgs) {
    this.update(() => args.initialData);
  }
}

interface Props {
  userId: string;
  initialData: UserState;
}

export function UserCard({ userId, initialData }: Props) {
  const [state] = useBloc(UserCardCubit, { args: { userId, initialData } });
  return <div>{state.name}</div>;
}
```

The `args` value keys the instance (different `userId` → different instance) and is passed to `init` once at creation — the initial state is correct on the first render, no flash.

### Store-per-request for route handlers and Server Actions

If you need to invoke bloc logic inside a route handler, a Server Action, or `generateStaticParams`, follow the same registry-isolation pattern as any Node.js SSR handler. Each request gets its own registry:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  StateContainerRegistry,
  setRegistry,
  globalRegistry,
} from '@blac/core';

const registryStore = new AsyncLocalStorage<StateContainerRegistry>();

async function withRequestRegistry<T>(fn: () => Promise<T>): Promise<T> {
  const requestRegistry = new StateContainerRegistry();
  return registryStore.run(requestRegistry, async () => {
    setRegistry(requestRegistry);
    try {
      return await fn();
    } finally {
      requestRegistry.clearAll();
      setRegistry(globalRegistry);
    }
  });
}
```

```ts
// app/api/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRequestRegistry } from '@/lib/registry';
import { acquire, release } from '@blac/core';
import { SummaryCubit } from '@/blocs/SummaryCubit';

export async function GET(req: NextRequest) {
  const result = await withRequestRegistry(async () => {
    const bloc = acquire(SummaryCubit);
    await bloc.generate(req.nextUrl.searchParams.get('q') ?? '');
    const summary = bloc.state.text;
    release(SummaryCubit);
    return summary;
  });
  return NextResponse.json({ summary: result });
}
```

See [SSR & per-request isolation](/integrations/ssr) for the full treatment of the `withRequestRegistry` helper and the async-concurrency caveats.

## Pages Router

The Pages Router uses `getServerSideProps` (or `getStaticProps`) to fetch data and `_app.tsx` for global layout. The rules are the same: do not touch the registry in server-side data-fetching functions, and mark any component using `useBloc` as a Client Component — in the Pages Router this just means writing a normal component; there is no `'use client'` directive, but the file is always bundled for the browser.

### Seeding initial state via getServerSideProps

Pass server data as page props and receive them in a Client Component — the same pattern as the App Router:

```tsx
// pages/users/[id].tsx
import type { GetServerSideProps } from 'next';
import { UserCard } from '@/components/UserCard';

interface UserData {
  name: string;
  bio: string;
}
interface PageProps {
  userId: string;
  initialData: UserData;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx,
) => {
  // Fetch data server-side; no blocs here.
  const userId = ctx.params?.id as string;
  const initialData: UserData = await fetch(
    `https://api.example.com/users/${userId}`,
  ).then((r) => r.json());
  return { props: { userId, initialData } };
};

export default function UserPage({ userId, initialData }: PageProps) {
  return <UserCard userId={userId} initialData={initialData} />;
}
```

`UserCard` is a regular component that calls `useBloc` — exactly the same as the App Router example above. No extra Next.js-specific plumbing is needed.

## Plugin setup

Install plugins in a module that is imported once by the client bundle — the Next.js equivalent is `app/providers.tsx` (App Router) or `pages/_app.tsx` (Pages Router):

```tsx
// app/providers.tsx  (App Router)
'use client';

import { getPluginManager } from '@blac/core';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { UserSettingsCubit } from '@/blocs/UserSettingsCubit';

const persist = createIndexedDbPersistPlugin();
persist.persist(UserSettingsCubit);
getPluginManager().install(persist);

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Plugins that use browser APIs (IndexedDB, `localStorage`) are safe here because `'use client'` ensures they only run in the browser bundle.

## See also

- [SSR & per-request isolation](/integrations/ssr) — the `withRequestRegistry` pattern and the async-concurrency caveats
- [Passing Inputs](/guide/inputs) — `args`, `init`, and instance identity
- [Instance Management](/core/instance-management) — `acquire`, `release`, and the ref-counting lifecycle
- [Persistence Plugin](/plugins/persistence) — IndexedDB persistence setup
