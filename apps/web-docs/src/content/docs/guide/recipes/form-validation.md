---
title: Form Validation
description: Model form fields and a touched map in Cubit state, derive validation errors as a getter, and show errors only for touched fields.
---

**Use when:** a form has non-trivial cross-field validation rules, async field-level
checks (e.g. "username already taken"), or multi-step workflows that share state
across steps.
**Don't use when:** a form is a simple uncontrolled HTML form or a library like
React Hook Form already owns it — adding a Cubit on top creates two sources of
truth.

## Pattern

Keep field values and a `touched` map in state. Derive validation errors as a
getter — they recompute on every read and can never go stale. Show errors only for
touched fields so the initial load is clean.

```ts twoslash
import { Cubit } from '@blac/core';

interface RegisterState {
  email: string;
  password: string;
  confirmPassword: string;
  touched: Partial<Record<'email' | 'password' | 'confirmPassword', boolean>>;
  submitStatus: 'idle' | 'loading' | 'success' | 'error';
  submitError: string | null;
}

declare const api: {
  register(email: string, password: string): Promise<void>;
};
// ---cut---
class RegisterCubit extends Cubit<RegisterState> {
  constructor() {
    super({
      email: '',
      password: '',
      confirmPassword: '',
      touched: {},
      submitStatus: 'idle',
      submitError: null,
    });
  }

  // ── field setters ──────────────────────────────────────────────────────

  setEmail = (email: string) => this.patch({ email });
  setPassword = (password: string) => this.patch({ password });
  setConfirmPassword = (confirmPassword: string) =>
    this.patch({ confirmPassword });

  /** Mark a field as interacted with so its error becomes visible. */
  touchField = (field: keyof RegisterState['touched']) => {
    this.patch({ touched: { ...this.state.touched, [field]: true } });
  };

  // ── derived validation ─────────────────────────────────────────────────

  /** All errors keyed by field name (always computed, never stored). */
  get errors(): Partial<
    Record<'email' | 'password' | 'confirmPassword', string>
  > {
    const { email, password, confirmPassword } = this.state;
    const errors: Partial<
      Record<'email' | 'password' | 'confirmPassword', string>
    > = {};

    if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    if (password.length < 8)
      errors.password = 'Password must be ≥ 8 characters.';
    if (confirmPassword !== password)
      errors.confirmPassword = 'Passwords do not match.';

    return errors;
  }

  get isValid() {
    return Object.keys(this.errors).length === 0;
  }

  // ── submit ─────────────────────────────────────────────────────────────

  submit = async () => {
    // Touch all fields so every error surfaces on an attempted submit.
    this.patch({
      touched: { email: true, password: true, confirmPassword: true },
    });

    if (!this.isValid) return;

    this.patch({ submitStatus: 'loading', submitError: null });

    try {
      await api.register(this.state.email, this.state.password);
      this.patch({ submitStatus: 'success' });
    } catch (e) {
      // ⚠️ Do NOT include the raw password in any error log or analytics event.
      this.patch({ submitStatus: 'error', submitError: String(e) });
    }
  };
}
```

```tsx
function RegisterForm() {
  const [state, form] = useBloc(RegisterCubit);
  const { errors, touched } = state;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <label>
        Email
        <input
          type="email"
          value={state.email}
          onChange={(e) => form.setEmail(e.target.value)}
          onBlur={() => form.touchField('email')}
        />
        {touched.email && errors.email && <span>{errors.email}</span>}
      </label>

      <label>
        Password
        <input
          type="password"
          value={state.password}
          onChange={(e) => form.setPassword(e.target.value)}
          onBlur={() => form.touchField('password')}
        />
        {touched.password && errors.password && <span>{errors.password}</span>}
      </label>

      <label>
        Confirm password
        <input
          type="password"
          value={state.confirmPassword}
          onChange={(e) => form.setConfirmPassword(e.target.value)}
          onBlur={() => form.touchField('confirmPassword')}
        />
        {touched.confirmPassword && errors.confirmPassword && (
          <span>{errors.confirmPassword}</span>
        )}
      </label>

      {state.submitError && <p role="alert">{state.submitError}</p>}

      <button type="submit" disabled={state.submitStatus === 'loading'}>
        {state.submitStatus === 'loading' ? 'Submitting…' : 'Register'}
      </button>
    </form>
  );
}
```

:::tip[Errors as a getter, not state]
Storing computed errors in state means every field change requires updating two
places — they will eventually drift. A getter recalculates on read and is always
in sync. Reading `form.errors` off the bloc in render needs a `select` or a
`void state.*` dependency read; see [Dependency Tracking](/react/dependency-tracking).
:::

:::caution[PII in state]
Form state (email addresses, passwords, health data) is observable by plugins
and `watch` callbacks. If you install analytics or logging plugins, ensure they
scrub sensitive field names before shipping to a sink. Consider `excludeFromDevTools`
on forms that handle passwords:

```ts twoslash
import { blac, Cubit } from '@blac/core';

@blac({ excludeFromDevTools: true })
class SecureFormCubit extends Cubit<{ password: string }> {
  constructor() {
    super({ password: '' });
  }
}
```

:::

## Async field-level validation

For async checks (username availability, coupon validation), pattern them like a
debounced async action — see [Debounce](/guide/recipes/debounce) — and merge the
result into the errors object or a separate `asyncErrors` field.

## See also

- [Cubit](/core/cubit) — `patch`, `emit`, getters
- [Patterns](/guide/patterns) — named instances for billing/shipping form sections
- [Debounce](/guide/recipes/debounce) — async field-level validation
