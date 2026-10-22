---
title: 'Proposal: Testing Helpers'
description: Adoption preview of waitForState, renderWithBlocs and withBlocs, which replace polling, hand-written useBloc mocks and per-app Storybook decorators.
---

:::note[Built — adoption preview]
`waitForState` is in `@blac/core/testing`; `renderWithBlocs` and `withBlocs` are in `@blac/react/testing`. They are documented in [Core Testing API](/testing/core/) and [React Testing](/testing/react/). This page shows what adopting them replaces. The "before" code is a typical shape, not a copy of a real app.
:::

## Problem

Three kinds of duplication show up in a large test and Storybook suite:

- **Waiting for async state.** Tests poll with `vi.waitFor` or loop on a `flushPromises` helper, which is slow to fail and hides which state they were waiting for.
- **Mocking `useBloc`.** A per-class `vi.mock('@blac/react')` returns a fake `[state, cubit]` tuple. It bypasses the registry and the real hook, and every class needs its own copy.
- **Storybook seeding.** Each app grows its own `mockBloc` and `withSeededBloc` decorators.

## API

```ts
import { waitForState } from '@blac/core/testing';
import { renderWithBlocs, withBlocs } from '@blac/react/testing';

await waitForState(bloc, (s) => s.status === 'success', { timeout: 1000 });

renderWithBlocs(<Dashboard />, [[AuthCubit, { state, methods }], [CartCubit, { state }]]);

decorators: [withBlocs([[AuthCubit, { state }]])];
```

`waitForState` resolves with the current state if it already matches, otherwise with the first matching change, and rejects on timeout. The two React helpers render in their own `RegistryProvider` and seed stubs per class, so the real `useBloc` runs.

## Before and after

### Waiting for state

```ts title="Before — polling"
cubit.load();
await vi.waitFor(() => expect(cubit.state.status).toBe('success'));
// or
cubit.load();
await flushPromises();
expect(cubit.state.status).toBe('success');
```

```ts title="After"
void cubit.load();
await expect(
  waitForState(cubit, (s) => s.status === 'success'),
).resolves.toMatchObject({
  status: 'success',
});
```

### Mocking `useBloc`

```tsx title="Before — a fake hook per class"
vi.mock('@blac/react', () => ({
  useBloc: (Class) =>
    Class === AuthCubit
      ? [{ loggedIn: true, name: 'Alice' }, { logout: vi.fn() }]
      : [{ items: [] }, {}],
}));

render(<Dashboard />);
```

```tsx title="After — seeded stubs, real hook"
const logout = vi.fn();

renderWithBlocs(<Dashboard />, [
  [
    AuthCubit,
    { state: { loggedIn: true, name: 'Alice' }, methods: { logout } },
  ],
  [CartCubit, { state: { items: [] } }],
]);
```

### Storybook

```tsx title="Before — a decorator written per app"
const withSeededBloc = (Class, state) => (Story) => {
  const registry = new Registry();
  registry.override(Class, createStub(Class, state));
  return (
    <RegistryProvider registry={registry}>
      <Story />
    </RegistryProvider>
  );
};

decorators: [
  withSeededBloc(AuthCubit, authState),
  withSeededBloc(CartCubit, cartState),
];
```

```tsx title="After"
decorators: [
  withBlocs([
    [AuthCubit, { state: authState }],
    [CartCubit, { state: cartState }],
  ]),
];
```

What goes away: the polling helpers, the per-class mock modules, and the per-app decorators.

## Differences to review

- **Timeouts fail loudly.** `waitForState` rejects after 1000 ms by default, where `flushPromises` just returned. Slow tests may need an explicit `timeout`.
- **Stubs are not real instances.** `renderWithBlocs` seeds stubs. A test that needs real behavior uses `withBlocState` or a real instance, as before.
