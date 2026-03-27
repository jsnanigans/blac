# React Testing

The React testing utilities build on top of `@blac/core/testing` and `@testing-library/react` to provide a simple way to render components with controlled bloc state.

```ts
import { renderWithBloc, renderWithRegistry } from '@blac/react/testing';
```

::: tip
`@testing-library/react` is an optional peer dependency of `@blac/react`. Install it alongside your test runner to use these utilities.
:::

## `renderWithBloc(ui, options)`

```ts
function renderWithBloc<T extends StateContainerConstructor>(
  ui: ReactElement,
  options: {
    bloc: T;
    state?: Partial<ExtractState<T>>;
    methods?: Partial<Record<MethodKeys<InstanceType<T>>, Function>>;
    instanceKey?: string;
  },
): RenderResult & { bloc: InstanceType<T> };
```

Renders a React component with a single bloc pre-configured in an isolated registry. Under the hood it:

1. Creates a fresh test registry
2. Creates a cubit stub with the provided `state` and `methods`
3. Registers it as an override
4. Renders the component via `@testing-library/react`
5. Wraps `unmount()` to restore the previous registry

The returned object is the standard `RenderResult` from Testing Library, plus a `bloc` property containing the stub instance.

### Basic usage

```tsx
import { it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithBloc } from '@blac/react/testing';

it('displays the count', () => {
  renderWithBloc(<Counter />, {
    bloc: CounterCubit,
    state: { count: 7 },
  });
  expect(screen.getByText('7')).toBeInTheDocument();
});
```

### Interacting with the bloc

The returned `bloc` is the live stub instance. Mutate it to test how your component responds to state changes:

```tsx
import { act } from '@testing-library/react';

it('updates when count changes', () => {
  const { bloc } = renderWithBloc(<Counter />, {
    bloc: CounterCubit,
    state: { count: 0 },
  });

  act(() => bloc.increment());
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### Mocking methods

Pass `methods` to replace specific methods on the stub. This is useful for intercepting side effects like API calls or navigation:

```tsx
it('calls save on form submit', async () => {
  const mockSave = vi.fn();
  renderWithBloc(<SettingsForm />, {
    bloc: SettingsCubit,
    state: { theme: 'dark', locale: 'en' },
    methods: { save: mockSave },
  });

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(mockSave).toHaveBeenCalled();
});
```

### Named instances

If your component uses `useBloc(Cubit, { instanceId })`, pass the same key:

```tsx
it('renders the correct editor', () => {
  renderWithBloc(<Editor instanceId="doc-42" />, {
    bloc: EditorCubit,
    state: { content: 'Hello world' },
    instanceKey: 'doc-42',
  });
  expect(screen.getByText('Hello world')).toBeInTheDocument();
});
```

## `renderWithRegistry(ui, setup)`

```ts
function renderWithRegistry(
  ui: ReactElement,
  setup: (registry: StateContainerRegistry) => void,
): RenderResult;
```

Renders a component with a fresh registry that you configure via a callback. Use this when a component depends on multiple blocs, or when you need more control than `renderWithBloc` provides.

### Multi-bloc components

```tsx
import { renderWithRegistry } from '@blac/react/testing';
import { createCubitStub, registerOverride } from '@blac/core/testing';

it('shows dashboard with user and cart data', () => {
  renderWithRegistry(<Dashboard />, () => {
    registerOverride(
      AuthCubit,
      createCubitStub(AuthCubit, {
        state: { loggedIn: true, name: 'Alice' },
      }),
    );
    registerOverride(
      CartCubit,
      createCubitStub(CartCubit, {
        state: { items: [{ id: '1', name: 'Widget', price: 9.99 }] },
      }),
    );
  });

  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('$9.99')).toBeInTheDocument();
});
```

### Mixing with core helpers

The setup callback runs with the test registry active, so all `@blac/core/testing` helpers work inside it:

```tsx
import { withBlocState, withBlocMethod } from '@blac/core/testing';

it('renders notification list', () => {
  renderWithRegistry(<NotificationPanel />, () => {
    withBlocState(AuthCubit, { loggedIn: true, userId: 'u1' });
    withBlocState(NotificationCubit, {
      items: [
        { id: '1', message: 'Welcome!', read: false },
        { id: '2', message: 'New feature', read: true },
      ],
    });
  });

  expect(screen.getByText('Welcome!')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
```

## Cleanup

Both `renderWithBloc` and `renderWithRegistry` wrap the Testing Library `unmount()` to restore the original registry. This means cleanup happens automatically when:

- You call `unmount()` on the render result
- Testing Library's `cleanup()` runs (automatic in most setups)

If you're also using `blacTestSetup()` in the same file, that's fine — they don't conflict. The `afterEach` hook from `blacTestSetup` provides an extra safety net.

## Common patterns

### Testing loading states

```tsx
it('shows a spinner while loading', () => {
  renderWithBloc(<ArticleList />, {
    bloc: ArticleCubit,
    state: { articles: [], status: 'loading', error: null },
  });
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

it('shows articles after load', () => {
  renderWithBloc(<ArticleList />, {
    bloc: ArticleCubit,
    state: {
      articles: [{ id: '1', title: 'Hello' }],
      status: 'success',
      error: null,
    },
  });
  expect(screen.getByText('Hello')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('shows error message on failure', () => {
  renderWithBloc(<ArticleList />, {
    bloc: ArticleCubit,
    state: { articles: [], status: 'error', error: 'Network error' },
  });
  expect(screen.getByText('Network error')).toBeInTheDocument();
});
```

### Testing user interactions

```tsx
it('adds a todo item', async () => {
  const { bloc } = renderWithBloc(<TodoApp />, {
    bloc: TodoCubit,
    state: { items: [], filter: 'all' },
  });

  await userEvent.type(screen.getByRole('textbox'), 'Buy milk');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(bloc.state.items).toContainEqual(
    expect.objectContaining({ text: 'Buy milk' }),
  );
});
```

### Testing components with `onMount`

Components that use `onMount` to trigger data loading can have that method mocked:

```tsx
it('calls fetchData on mount', () => {
  const mockFetch = vi.fn();
  renderWithBloc(<DataView />, {
    bloc: DataCubit,
    state: { items: [], status: 'idle' },
    methods: { fetchData: mockFetch },
  });

  expect(mockFetch).toHaveBeenCalledOnce();
});
```

### Testing components that read getters

Components using `bloc.total` or similar getters work naturally since the stub is a real instance:

```tsx
it('displays computed total', () => {
  renderWithBloc(<CartSummary />, {
    bloc: CartCubit,
    state: {
      items: [
        { id: '1', price: 10 },
        { id: '2', price: 20 },
      ],
    },
  });
  expect(screen.getByText('$30')).toBeInTheDocument();
});
```

The getter runs against real state, so you test real logic — not a mocked return value.

See also: [Testing Overview](/testing/overview), [Core Testing API](/testing/core), [useBloc](/react/use-bloc)
