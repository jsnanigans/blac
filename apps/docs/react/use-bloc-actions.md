# useBlocActions

`useBlocActions` is not part of the current `@blac/react` API.

If you only need to call methods and do not want fine-grained tracking, use `useBloc` with one of these patterns:

- Ignore the `state` return value and use the bloc instance for actions.
- Set `autoTrack: false` to re-render on any state change without proxy tracking.
- Provide a manual `dependencies` selector when you only care about specific values.

```tsx
import { useBloc } from '@blac/react';

const [, bloc] = useBloc(CounterCubit, { autoTrack: false });

return <button onClick={bloc.increment}>+</button>;
```
