# React adapter — `useStructural`

Source: `react-hook.ts`. Subpath: `@dirtytalk/structural/react`.

```tsx
import { useStructural } from '@dirtytalk/structural/react';

function Total() {
  const [state, container] = useStructural(cart);  // reads state.total only
  return <span>{state.total}</span>;                // re-renders ONLY on `total`
}
```

No selector to declare. **Accessing `state.total` during render *is* the
subscription.** A `patch({ shippingAddress })` never wakes `Total`. If props or
context change *which* fields are read, the interest updates automatically on
the next render.

## How a render flows

1. `useId()` → stable `consumerId`.
2. `trackRender(container.state, container.interner)` wraps state in a recording
   Proxy; `pathRef.current` is set to the (initially empty) `paths` set the
   proxy will fill as JSX reads fields.
3. JSX evaluates → proxy records read paths into the set.
4. A `useReducer`-backed `force()` is the re-render trigger
   (`useReducer((x) => x + 1, 0)`). The README's "no virtual DOM" note: the hook
   just bumps a counter; reconciliation is React's job.

## The registration-timing subtlety (important)

Path registration happens in **`useLayoutEffect`, after render — never in the
render body** (`react-hook.ts:42–51`). Why:

> At render time the proxy hasn't been accessed yet, so `paths` is an empty Set
> that the proxy *mutates during JSX evaluation*. Registering then would store
> empty interest and freeze the skeleton at that snapshot — subsequent `emit`s
> would diff against an empty skeleton and **silently drop wakeups**.

So the order is: render fills `pathRef.current` → `useLayoutEffect` registers
the now-populated set → skeleton recomputes. There are recent commits in this
repo specifically fixing "register consumer paths after render commits" — this
is a real, load-bearing ordering, not incidental.

## StrictMode handling

A separate `useEffect` re-registers paths from the ref on mount and subscribes
to the channel (`react-hook.ts:26`). The comment notes it re-registers in case
the effect re-runs after a StrictMode cleanup cycle where the render body did
*not* re-run. Subscription interest is the thunk `() => pathRef.current`, so it
always reflects the latest recorded paths at flush time. Cleanup unsubscribes
**and** unregisters the consumer (shrinking the skeleton).

## Options

`UseStructuralOptions.select?: never` — `select` is intentionally **typed
out**. The whole point is automatic tracking; a manual selector would defeat it.
Returns a `readonly [state, container]` tuple.
