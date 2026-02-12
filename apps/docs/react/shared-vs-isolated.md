# Shared vs Isolated Instances

By default, `useBloc` uses shared instances. Use `@blac({ isolated: true })` for component-scoped instances.

## Shared (Default)

```tsx
useBloc(CounterCubit); // shared instance
```

## Isolated

```tsx
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}

function FormA() {
  useBloc(FormCubit); // unique instance
}
```

## Named Instances

```tsx
useBloc(EditorCubit, { instanceId: 'editor-1' });
useBloc(EditorCubit, { instanceId: 'editor-1' }); // same instance
useBloc(EditorCubit, { instanceId: 'editor-2' }); // different instance
```
