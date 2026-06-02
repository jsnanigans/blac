# Bloc communication

Real apps are made of several focused blocs — a cart, a shipping calculator, an auth session — that need to read each other's state or trigger each other's behavior. The naive fix is to merge them into one giant Cubit, but that destroys the very separation that makes each piece testable and reusable.

`depend()` is the answer: it lets one [Cubit](/core/cubit) declare a dependency on another and read its state (or call its methods) **without holding a hard reference and without the two classes importing each other's instances**. The dependency is resolved lazily from the [registry](/core/instance-management), so each bloc stays decoupled from how the other is created or keyed.

::: info Mental model
Think of `depend()` as "I need to know about that bloc, but I don't own it." It records an intent ("CartCubit depends on ShippingCubit") and hands you a handle that fetches the live instance on demand — `.untracked()` for a plain read or method call, `.track()` to subscribe the reading component reactively. Ownership and lifetime still flow through the registry's [ref counting](/core/instance-management) — see [Lifecycle: who keeps the dependency alive?](#lifecycle-who-keeps-the-dependency-alive) below for the gotcha this creates.
:::

## `depend(Type)`

Declare a cross-bloc dependency from inside a Cubit. Returns a branded handle with two accessors: `.untracked()` resolves the other instance from the registry on each call, and `.track()` does the same _plus_ opts the reading React consumer into automatic cross-bloc re-renders.

```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  defaultArgs?: ExtractArgs<T>,
): DepHandle<T>
```

| Parameter     | Type                                  | Required | Description                                                                                                                                                              |
| ------------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Type`        | `T extends StateContainerConstructor` | yes      | The state-container class to depend on.                                                                                                                                  |
| `defaultArgs` | `ExtractArgs<T>`                      | no       | The `args` that identify which [keyed instance](/core/instance-management) to resolve when an accessor is called without its own `args`. Defaults to the default instance. |

**Returns:** a [`DepHandle<T>`](#what-track-returns) — a branded handle with two methods:

- **`handle.untracked(options?)`** resolves the live instance from the registry lazily, on each call. Use it for imperative method calls (`this.shipping.untracked().recalc()`) and one-off state reads that should _not_ subscribe the reader.
- **`handle.track(options?)`** resolves the same instance and, inside a React render, opts the current consumer into automatic cross-bloc re-renders — see [Auto-tracking with `.track()`](#auto-tracking-with-track).

Both accept an optional `{ args }` to resolve a specific [keyed instance](/core/instance-management) at call time (overriding `defaultArgs`), so the resolved instance can derive from current state. The handle is returned immediately at declaration time; resolution happens each time you call an accessor.

::: tip This is the part most state libraries can't do
A getter on one bloc can read **another bloc's** state (and its getters) and, via `.track()`, the React component reading that getter wakes when _either_ bloc changes — with no `useBloc(Other)`, no selectors, and no provider wiring. Jump to [Auto-tracking with `.track()`](#auto-tracking-with-track) for the whole story.
:::

**Behavior.** `depend()` records the dependency (the `Type` → `instanceKey` pair is stored on the instance), then returns a handle whose accessors call `this._registry.ensure(Type, key)` on each invocation. Resolution is **lazy per call**, which keeps the surface immune to dep-instance churn — if the depended-on instance is disposed and recreated, the next accessor call simply returns the new one. `.untracked()` does **not** wire a reactive subscription between the two blocs: `this.shipping.untracked().state.rate` is a plain read inside the bloc. Reactivity comes from the consumer — `.track()` inside a tracked getter (a React component's auto-tracking proxy), or an explicit `watch()`. A naive always-on auto-bridge would loop on mutual deps, which is why tracking is opt-in per read.

::: warning `depend()` does not auto-subscribe
`depend()` only records the dependency and resolves the instance — it does **not** wire up a reactive subscription between the two blocs. Inside the bloc, `this.shipping.untracked().state.rate` is a plain read; it returns the current value but does not cause `CartCubit` to re-emit when shipping changes.

Reactivity is supplied by the consumer that reads the derived value: a React component via the [auto-tracking proxy](/react/dependency-tracking), or non-React code via [`watch()`](/core/watch). If you need a bloc itself to react to a dependency's changes, subscribe explicitly (e.g. `watch(...)`) and tear it down in [`dispose`](/core/system-events). This is deliberate — a naive auto-bridge would loop forever on mutual dependencies.
:::

```ts twoslash
import { Cubit } from '@blac/core';

class ShippingCubit extends Cubit<{ rate: number }> {
  constructor() {
    super({ rate: 5.99 });
  }
}

interface CartItem {
  price: number;
}

class CartCubit extends Cubit<{ items: CartItem[] }> {
  private shipping = this.depend(ShippingCubit);

  constructor() {
    super({ items: [] });
  }

  get total() {
    const subtotal = this.state.items.reduce((sum, i) => sum + i.price, 0);
    // Plain (untracked) read — see `.track()` below for the reactive version.
    return subtotal + this.shipping.untracked().state.rate;
  }
}
```

### How `depend()` works

1. `this.depend(ShippingCubit)` records the dependency (`ShippingCubit` → instance key) and returns a `DepHandle<ShippingCubit>`.
2. Calling `.untracked()` (or `.track()`) resolves the instance via [`ensure()`](/core/instance-management) from the registry — creating it if it does not exist yet.
3. The dependency is resolved **lazily on every call**, not when you declare it. This keeps `CartCubit` immune to dep-instance churn: if the depended-on instance is disposed and recreated, the next `shipping.untracked()` call simply returns the new one.
4. When a React component reads `cart.total`, reactivity comes from the render-time tracker. Plain `this.shipping.untracked().state.rate` reads a live (untracked) instance — the component re-renders only if it is also subscribed to `ShippingCubit` via `useBloc`. To opt into automatic cross-bloc subscriptions without a second `useBloc` call, use [`.track()`](#auto-tracking-with-track) on the handle.

### Named instance dependencies

By default, `depend(Type)` targets the `'default'` instance key. To depend on a specific [named instance](/core/instance-management), pass the `defaultArgs` that identify it (or override per call with `.track({ args })` / `.untracked({ args })`):

```ts twoslash
import { Cubit } from '@blac/core';

class EditorCubit extends Cubit<{ content: string }, { docId: string }> {
  static key = (a: { docId: string }) => a.docId;
  constructor() {
    super({ content: '' });
  }
}

class ReviewCubit extends Cubit<{ approved: boolean }> {
  private editor = this.depend(EditorCubit, { docId: 'doc-42' });

  constructor() {
    super({ approved: false });
  }
}
```

The `args` passed here must resolve to the same key the target instance is acquired under (via its `static key` or structural hash). Mismatched args resolve a _different_ instance — see [Inputs and identity](/guide/inputs) for how keys are derived.

## Alternatives

### `ensure()` and `borrow()`

For one-off access outside the class constructor, use registry functions directly:

```ts twoslash
import { Cubit, borrow } from '@blac/core';

interface NotificationState {
  message: string;
}

class UserCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: '' });
  }
}

class NotificationCubit extends Cubit<NotificationState> {
  constructor() {
    super({ message: '' });
  }

  showUserError = () => {
    const user = borrow(UserCubit); // must already exist
    this.patch({ message: `Error for ${user.state.name}` });
  };
}
```

### When to use which

| Approach             | Use when                                               |
| -------------------- | ------------------------------------------------------ |
| `this.depend(Class)` | Ongoing dependency used in getters or multiple methods |
| `ensure(Class)`      | One-off access; creates if missing                     |
| `borrow(Class)`      | One-off access; instance must already exist            |

## Lifecycle: who keeps the dependency alive?

`depend()` resolves through `ensure()`, and **`ensure()` does not take a reference** — it creates the instance if needed but does not increment the dependency's ref count. This has a concrete consequence worth internalizing:

> A bloc you `depend()` on is not kept alive _by you_. If nothing else holds a reference to it, the registry may dispose it the moment its own ref count hits zero.

In practice this is usually fine, because the depended-on bloc is also mounted somewhere (a component holds a ref via [`useBloc`](/react/use-bloc)). But it is a real gotcha when the dependency is a "pure derived" service that no component renders directly.

There are two clean ways to guarantee a dependency stays alive:

- **`keepAlive`** — mark the dependency class with `@blac({ keepAlive: true })` so the registry never auto-disposes it. See [Configuration](/core/configuration).
- **The cascade does the right thing on teardown.** When a bloc that _created_ its dependencies (via `ensure`) is itself disposed and reaches zero refs, the registry cascades disposal to those deps if they too have zero refs and are not `keepAlive`. So a `depend()`-only dependency graph tears itself down cleanly without leaking.

::: details Why lazy resolution matters here
Because the handle re-resolves on every call, a dependency that _was_ disposed out from under you is not a dangling pointer — the next `shipping.untracked()` simply re-creates a fresh instance via `ensure()`. The cost is that any state the old instance held is gone. If that state must survive, use `keepAlive` rather than relying on re-creation.
:::

## Avoiding cycles and constructor-time reads

Two cross-bloc patterns reliably cause bugs. Both are easy to avoid once you know the rule: **resolve dependencies lazily, read them late.**

::: warning Common mistakes
**Reading a dependency's state in the constructor.** The dependency may not be initialized yet — its `init()` may not have run, so its state is still the raw initial value. Read deps inside getters or methods (or `init`), never in the constructor.

**Mutual `depend()` between two blocs.** `A` depends on `B` and `B` depends on `A`. Declaration alone is safe (resolution is lazy), but if you also wire explicit subscriptions both ways, a change in one re-emits the other forever. The channel's same-tick coalescing limits the blast radius, but a true mutual reactive cycle is a design smell — extract the shared concern into a third bloc that both depend on, with the dependency arrows pointing one way.
:::

When you find yourself wanting a cycle, it usually signals that two blocs are really one concern, or that a piece of shared state belongs in a third, lower-level bloc. See [Best Practices](/guide/best-practices) for when cross-bloc coupling is a smell versus a sound dependency.

## Calling methods on dependencies

Dependencies aren't just for reading state — you can call methods on them to trigger side effects in other blocs.

```ts twoslash
import { Cubit } from '@blac/core';

interface Message {
  userId: string;
  text: string;
}

interface ChannelState {
  channelId: string;
  messages: Message[];
}

class NotificationCubit extends Cubit<{ unread: number }> {
  constructor() {
    super({ unread: 0 });
  }

  incrementUnread = (_channelId: string) => {
    this.update((s) => ({ unread: s.unread + 1 }));
  };

  clearUnread = (_channelId: string) => {
    this.emit({ unread: 0 });
  };
}

class ChannelCubit extends Cubit<ChannelState> {
  private notifications = this.depend(NotificationCubit);

  constructor() {
    super({ channelId: '', messages: [] });
  }

  receiveMessage = (message: Message) => {
    this.update((s) => ({
      ...s,
      messages: [...s.messages, message],
    }));

    // Trigger a side effect in another bloc. `.untracked()` resolves the live
    // instance without subscribing — a method call needs no reactivity.
    this.notifications.untracked().incrementUnread(this.state.channelId);
  };

  markAsRead = () => {
    this.notifications.untracked().clearUnread(this.state.channelId);
  };
}
```

This keeps notification logic in `NotificationCubit` while letting `ChannelCubit` coordinate when it fires.

::: tip Reading state vs calling methods
These behave differently with respect to re-renders. **Reading** a dependency's `state` via `.track()` inside a getter subscribes the consuming component to that path (via the [auto-tracking proxy](/react/dependency-tracking)). **Calling a method** on a dependency through `.untracked()` — like `incrementUnread()` above — does not subscribe to anything; it just triggers a side effect in the other bloc. A component that only triggers actions on a dependency will not re-render when that dependency's state changes, which is exactly what you want for action-only coordination.
:::

## Derived getters across blocs

Getters that read from multiple blocs with `.track()` are wired through the proxy: a component reading `dashboard.summary` subscribes to every dependency path the getter touches (`auth.user.name`, `cart.items`), and re-renders only when one of those changes.

```ts twoslash
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ user: { name: string } | null }> {
  constructor() {
    super({ user: null });
  }
}

class CartCubit extends Cubit<{ items: string[] }> {
  constructor() {
    super({ items: [] });
  }
}

class DashboardCubit extends Cubit<Record<string, never>> {
  private auth = this.depend(AuthCubit);
  private cart = this.depend(CartCubit);

  constructor() {
    super({});
  }

  get summary() {
    const [authState] = this.auth.track();
    const [cartState] = this.cart.track();
    const user = authState.user;
    const itemCount = cartState.items.length;
    return `${user?.name ?? 'Guest'} has ${itemCount} items`;
  }
}
```

::: warning A coordinating bloc with empty state is a smell
`Cubit<{}>` here holds no state of its own — it exists purely to compose other blocs' state. That is fine for a small read-only aggregator, but if it grows methods and starts coordinating writes across many blocs, it tends to become a god-bloc that re-couples everything `depend()` was meant to decouple. Prefer reading derived values directly in the component (or a small focused bloc per view) over one central dashboard bloc. See [Best Practices](/guide/best-practices).
:::

## Auto-tracking with `.track()`

`this.depend(OtherBloc).untracked()` gets the live instance. Reading its state inside a getter — `this.shipping.untracked().state.rate` — is a plain live read. A React consumer won't re-render when `ShippingCubit` emits unless the component also calls `useBloc(ShippingCubit)` itself.

Calling `.track()` on the handle opts the **current render's consumer** into automatic cross-bloc subscriptions, without a second `useBloc` at the component level:

```ts
import { Cubit } from '@blac/core';

class PriceBloc extends Cubit<{ amount: number }> {
  constructor() {
    super({ amount: 100 });
  }
}

class CartBloc extends Cubit<{ qty: number }> {
  private price = this.depend(PriceBloc);
  constructor() {
    super({ qty: 2 });
  }

  get total() {
    const [priceState] = this.price.track(); // opt in to cross-bloc tracking
    return this.state.qty * priceState.amount;
  }
}
```

A component that reads `cart.total` during render auto-subscribes to both `CartBloc` **and** `PriceBloc` — no `useBloc(PriceBloc)` needed:

```ts
// In a React component:
const [, cart] = useBloc(CartBloc);
return <span>{cart.total}</span>; // re-renders when qty OR price.amount changes
```

### What `.track()` returns

```ts
handle.track(); // → [trackedState, depProxy]
```

| Element        | Type               | Description                                                                                                                                                                                   |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trackedState` | dep's state        | Snapshot recorded by the render-time tracker. Access fields here to record leaf paths (e.g. `priceState.amount`).                                                                             |
| `depProxy`     | dep instance proxy | The dep wrapped in a tracking proxy. Use this to call getters on the dep; those getters' own `this.state.x` reads are also tracked (see [Dep getter transitivity](#dep-getter-transitivity)). |

### Render-aware: safe everywhere

`.track()` is **render-aware**. Outside a React render — in an event handler, an effect, or a plain method — it degrades gracefully to live values with no subscription side effects:

```ts
import { Cubit } from '@blac/core';

class PriceBloc extends Cubit<{ amount: number }> {
  constructor() {
    super({ amount: 100 });
  }
}

class CartBloc extends Cubit<{ qty: number }> {
  private price = this.depend(PriceBloc);
  constructor() {
    super({ qty: 2 });
  }

  get total() {
    const [priceState] = this.price.track();
    return this.state.qty * priceState.amount;
  }

  logTotal() {
    // Called outside render — .track() returns live values, no subscription registered.
    const [priceState] = this.price.track();
    console.log('total:', this.state.qty * priceState.amount);
  }
}
```

You can safely call `.track()` from methods without worrying about accidentally registering subscriptions at the wrong time.

### Dep getter transitivity

The second element of `.track()` — the `depProxy` — threads tracking through the dep's own getters. If the dep's getter reads `this.state.field`, that read is also recorded for the consumer:

```ts
import { Cubit } from '@blac/core';

class SrcBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 5 });
  }
  get doubled() {
    return this.state.count * 2;
  }
}

class AggBloc extends Cubit<{ offset: number }> {
  private src = this.depend(SrcBloc);
  constructor() {
    super({ offset: 0 });
  }
  get computed() {
    const [, s] = this.src.track();
    // `s.doubled` calls the getter through the dep proxy. Inside `doubled`,
    // `this.state.count` is intercepted and records `count` as a tracked path
    // for the current consumer — so a SrcBloc emit on `count` wakes the consumer.
    return this.state.offset + s.doubled;
  }
}
```

This works transitively for deep chains: if `A.track(B)` and inside `B.computed` there is `B.track(C)`, a consumer reading `A.computed` is subscribed to C's channel too. Bumping C wakes the consumer.

### Conditional tracking

`.track()` is called during the render of the getter. If it runs conditionally, the subscription is added or dropped automatically after each render:

```ts
import { Cubit } from '@blac/core';

class FeatureFlagBloc extends Cubit<{ enabled: boolean }> {
  constructor() {
    super({ enabled: false });
  }
}

class LivePriceBloc extends Cubit<{ price: number }> {
  constructor() {
    super({ price: 0 });
  }
}

class ProductBloc extends Cubit<{ base: number }> {
  private flags = this.depend(FeatureFlagBloc);
  private livePrice = this.depend(LivePriceBloc);
  constructor() {
    super({ base: 10 });
  }

  get display() {
    const [flags] = this.flags.track(); // always tracked
    if (flags.enabled) {
      const [p] = this.livePrice.track(); // only tracked when feature is on
      return p.price;
    }
    return this.state.base;
  }
}
```

When `flags.enabled` becomes `false` on the next render, the `LivePriceBloc` subscription and ref are released. Turning it back on re-subscribes.

### Mutual dependencies and cycle safety

Two blocs can safely track each other (`A.track(B)` + `B.track(A)`). The reconciler detects re-entrant tracking within the same render and unions the paths rather than re-acquiring. No infinite loop occurs.

### `select` mode stays primary-only

When a consumer uses the `select` option on `useBloc`, `.track()` degrades to live values (same as outside-render). The `select` callback runs against the primary bloc only. This is by design — `select` is a manual subscription that opts out of auto-tracking entirely.

## On-demand instance creation

Sometimes a dependency doesn't exist yet and needs to be created conditionally. Use `borrowSafe` to check and `acquire` to create on demand:

```ts twoslash
import { Cubit, borrowSafe, acquire } from '@blac/core';

class UserCubit extends Cubit<{ userId: string }, { userId: string }> {
  static key = (a: { userId: string }) => a.userId;
  constructor() {
    super({ userId: '' });
  }

  protected init(args: { userId: string }) {
    this.patch({ userId: args.userId });
  }

  setUserId = (id: string) => this.patch({ userId: id });
}

interface ChannelState {
  messages: string[];
}

interface MessageData {
  userId: string;
  text: string;
}

class ChannelCubit extends Cubit<ChannelState> {
  constructor() {
    super({ messages: [] });
  }

  private ensureUserCubit(userId: string) {
    const result = borrowSafe(UserCubit, { args: { userId } });
    if (!result.error) return; // already exists

    // Create on demand, keyed by userId (init seeds the state)
    acquire(UserCubit, { args: { userId } });
  }

  receiveMessage = (message: MessageData) => {
    this.ensureUserCubit(message.userId);
    this.update((s) => ({ messages: [...s.messages, message.text] }));
  };
}
```

::: tip
Use `borrowSafe` over `borrow` when the instance may not exist yet. `borrow` throws, while `borrowSafe` returns `{ error, instance }` so you can handle the missing case gracefully.
:::

## See also

- [Instance Management](/core/instance-management) — the registry, ref counting, and `ensure`/`borrow`/`acquire`
- [Inputs and identity](/guide/inputs) — how `args` and `static key` resolve the instance a `depend()` targets
- [Best Practices](/guide/best-practices) — when cross-bloc coupling is sound versus a smell
- [Glossary](/guide/glossary) — definitions for registry, `ensure`, `keepAlive`, and auto-tracking
