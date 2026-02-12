# Configuration

BlaC configuration is applied per class via the `@blac` decorator.

```ts
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}

@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {}

@blac({ excludeFromDevTools: true })
class InternalCubit extends Cubit<State> {}
```

## Options

`BlacOptions` is a union type, so only one option can be specified at a time:

- `{ isolated: true }`
- `{ keepAlive: true }`
- `{ excludeFromDevTools: true }`
