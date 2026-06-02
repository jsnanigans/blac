---
title: Remix
description: Seed each bloc's initial state from Remix loader data via init(args) so server-rendered HTML and the client's initial state match without hydration mismatches.
---

Remix runs loaders and actions on the server for every navigation, then hydrates the same component tree in the browser. BlaC's job is to make sure the server-rendered HTML and the client's initial state **match**, preventing hydration mismatches.

## The hydration challenge

Remix loaders return data that the server uses to render HTML. After the page reaches the browser, React hydrates the existing HTML by running the component tree again. If a bloc's initial state on the client differs from what the server rendered, React reports a hydration mismatch.

The fix is to seed each bloc's initial state from the loader data via `init(args)` so both renders start from the same snapshot.

## Seeding blocs from loader data

A Remix loader is a server function — do not call registry functions there. Instead, return the data as JSON, receive it in the component, and forward it to `useBloc` as `args`:

```ts twoslash
// app/routes/product.$id.tsx  — loader
import type { Cubit } from '@blac/core';

// Type stubs — replace with your actual loader return type
declare function json<T>(data: T): { data: T };
declare function fetchProduct(
  id: string,
): Promise<{ id: string; title: string; price: number }>;

type LoaderArgs = { params: { id: string } };

export async function loader({ params }: LoaderArgs) {
  const product = await fetchProduct(params.id);
  return json({ product });
}
```

```tsx
// app/routes/product.$id.tsx  — component (runs on server and client)
import { useLoaderData } from '@remix-run/react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

interface ProductState {
  id: string;
  title: string;
  price: number;
}
interface ProductArgs {
  productId: string;
  initialData: ProductState;
}

class ProductCubit extends Cubit<ProductState, ProductArgs> {
  protected init(args: ProductArgs) {
    // Called once at instance creation, before the first snapshot.
    // Both the server render and the client hydration call this with the
    // same args, so the initial state is identical on both sides.
    this.update(() => args.initialData);
  }

  addToCart = () => {
    /* ... */
  };
}

export default function ProductPage() {
  const { product } = useLoaderData<typeof loader>();

  // args keys the instance (productId) and seeds init().
  // Server render and client hydration both pass the same args.
  const [state, cubit] = useBloc(ProductCubit, {
    args: { productId: product.id, initialData: product },
  });

  return (
    <div>
      <h1>{state.title}</h1>
      <p>${state.price}</p>
      <button onClick={cubit.addToCart}>Add to cart</button>
    </div>
  );
}
```

`init(args)` runs synchronously before the first state snapshot, so the bloc's initial state on the server and the client are identical. React hydrates without a mismatch.

:::note[Why not call the loader data directly in the constructor?]
The constructor runs at instance creation, but `useLoaderData` is a hook — it can only be called from a component. `init(args)` is the bridge: it is called by the framework from inside `useBloc` with the `args` you provided, giving the bloc access to per-render data at the right moment.
:::

## Mutations via actions and bloc methods

Actions are Remix's server-side mutation path. After an action, Remix re-runs the loader and re-renders. Blocs handle optimistic UI and local state changes; the loader refetch propagates server state back:

```tsx
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useBloc } from '@blac/react';

// (CartCubit and ProductCubit definitions omitted for brevity)

export default function ProductPage() {
  const { product } = useLoaderData<typeof loader>();
  const [state, cubit] = useBloc(ProductCubit, {
    args: { productId: product.id, initialData: product },
  });
  const fetcher = useFetcher();

  const handleAddToCart = () => {
    // Optimistic update in the bloc — immediate feedback
    cubit.addToCart();
    // Server-side mutation via Remix action
    fetcher.submit(
      { productId: product.id },
      { method: 'post', action: '/cart' },
    );
  };

  return (
    <div>
      <h1>{state.title}</h1>
      <button onClick={handleAddToCart}>Add to cart</button>
    </div>
  );
}
```

## Per-request isolation for Remix server code

If you call registry functions inside Remix resource routes or utility modules that run in the Node process, wrap them in `withRequestRegistry` so state does not bleed between concurrent requests. See [SSR & per-request isolation](/integrations/ssr) for the full pattern.

## Plugin setup

Install plugins in `root.tsx` so they run once in the browser. Guard with `typeof window !== 'undefined'` to prevent plugin code from running in the server-side bundle:

```tsx
// app/root.tsx
import { getPluginManager } from '@blac/core';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { UserSettingsCubit } from '~/blocs/UserSettingsCubit';

if (typeof window !== 'undefined') {
  const persist = createIndexedDbPersistPlugin();
  persist.persist(UserSettingsCubit);
  getPluginManager().install(persist);
}
```

The IndexedDB persistence plugin checks `typeof indexedDB !== 'undefined'` inside `isAvailable()` and silently disables itself when unavailable, but the guard above makes the intent explicit and avoids unnecessary code in the server bundle.

## See also

- [SSR & per-request isolation](/integrations/ssr) — per-request registry isolation and the `withRequestRegistry` helper
- [Passing Inputs](/guide/inputs) — `args`, `init`, and instance identity
- [Instance Management](/core/instance-management) — the registry and ref-counting lifecycle
- [Persistence Plugin](/plugins/persistence) — IndexedDB persistence setup
