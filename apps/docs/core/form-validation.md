# Form Validation Example

This example shows a simple form state container using `Cubit`.

```ts
import { Cubit } from '@blac/core';

type FormState = {
  values: {
    email: string;
    password: string;
  };
  errors: {
    email?: string;
    password?: string;
  };
};

class LoginFormCubit extends Cubit<FormState> {
  constructor() {
    super({ values: { email: '', password: '' }, errors: {} });
  }

  setEmail = (email: string) => {
    this.patch({ values: { ...this.state.values, email } });
  };

  setPassword = (password: string) => {
    this.patch({ values: { ...this.state.values, password } });
  };

  validate = () => {
    const errors: FormState['errors'] = {};
    if (!this.state.values.email.includes('@')) {
      errors.email = 'Invalid email';
    }
    if (this.state.values.password.length < 8) {
      errors.password = 'Password too short';
    }
    this.patch({ errors });
  };
}
```
