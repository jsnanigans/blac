# Form Validation with Zod

This guide shows how to build type-safe forms using Cubit and [Zod v4](https://zod.dev/). You'll learn patterns for handling validation, touched states, async validation, and creating reusable form abstractions.

## Why Cubit for Forms?

Forms are a natural fit for Cubit because:

- **Direct state updates** - Form fields change frequently; Cubit's `patch()` and `update()` methods make this simple
- **Derived state** - Computed getters like `isValid` or `isDirty` are automatically tracked
- **No event overhead** - Unlike Vertex, you don't need to define events for every field change
- **Isolated instances** - Each form component gets its own Cubit instance by default

## Step 1: Define the Schema

Start by defining your validation schema with Zod. This gives you both runtime validation and TypeScript types from a single source of truth:

```typescript
import { z } from 'zod';

// Define the schema with validation rules and error messages
const LoginSchema = z.object({
  email: z.string().email({ error: 'Please enter a valid email' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
});

// Infer the TypeScript type from the schema
// This ensures your form values always match your validation rules
type LoginForm = z.infer<typeof LoginSchema>;
// => { email: string; password: string }
```

## Step 2: Define Form State

Form state typically includes more than just values. Track errors and submission status:

```typescript
interface FormState<T> {
  values: T;                                    // Current form values
  errors: Partial<Record<keyof T, string>>;     // Validation errors per field
  touched: Partial<Record<keyof T, boolean>>;   // Which fields have been interacted with
  isSubmitting: boolean;                        // Prevents double-submission
}
```

**Why track `touched`?** Users don't want to see errors before they've had a chance to fill in a field. By tracking which fields have been touched, you can show errors only after the user has interacted with that field.

## Step 3: Build the Form Cubit

```typescript
import { Cubit } from '@blac/core';

class LoginFormCubit extends Cubit<FormState<LoginForm>> {
  constructor() {
    super({
      values: { email: '', password: '' },
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }

  // Update a field value and mark it as touched
  setField = <K extends keyof LoginForm>(field: K, value: LoginForm[K]) => {
    this.update((state) => ({
      ...state,
      values: { ...state.values, [field]: value },
      touched: { ...state.touched, [field]: true },
    }));

    // Validate immediately for real-time feedback
    this.validateField(field);
  };

  // Validate a single field using the schema
  private validateField = (field: keyof LoginForm) => {
    // Extract the specific field's schema for targeted validation
    const fieldSchema = LoginSchema.shape[field];
    const result = fieldSchema.safeParse(this.state.values[field]);

    this.update((state) => ({
      ...state,
      errors: {
        ...state.errors,
        [field]: result.success ? undefined : result.error.issues[0]?.message,
      },
    }));
  };

  // Validate all fields before submission
  validateAll = (): boolean => {
    const result = LoginSchema.safeParse(this.state.values);

    if (!result.success) {
      const errors: Partial<Record<keyof LoginForm, string>> = {};

      // Map Zod issues to field errors (take first error per field)
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginForm;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }

      // Mark all fields as touched so errors display
      const touched = Object.keys(this.state.values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof LoginForm, boolean>
      );

      this.patch({ errors, touched });
      return false;
    }

    this.patch({ errors: {} });
    return true;
  };

  submit = async (onSuccess: (values: LoginForm) => Promise<void>) => {
    if (!this.validateAll()) return;

    this.patch({ isSubmitting: true });
    try {
      await onSuccess(this.state.values);
    } catch (error) {
      // Handle API errors (e.g., "email already registered")
      if (error instanceof Error) {
        this.patch({ errors: { email: error.message } });
      }
    } finally {
      this.patch({ isSubmitting: false });
    }
  };

  // Computed: check if form has any validation errors
  get isValid() {
    return Object.values(this.state.errors).every((error) => error === undefined);
  }

  // Computed: check if user has interacted with the form
  get isDirty() {
    return Object.values(this.state.touched).some(Boolean);
  }

  // Helper: get error only if field has been touched
  getFieldError = (field: keyof LoginForm): string | undefined => {
    return this.state.touched[field] ? this.state.errors[field] : undefined;
  };
}
```

## Step 4: React Integration

```tsx
import { useBloc } from '@blac/react';

function LoginForm() {
  const form = useBloc(LoginFormCubit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await form.submit(async (values) => {
      await api.login(values);
      navigate('/dashboard');
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.state.values.email}
          onChange={(e) => form.setField('email', e.target.value)}
          aria-invalid={!!form.getFieldError('email')}
          aria-describedby={form.getFieldError('email') ? 'email-error' : undefined}
        />
        {form.getFieldError('email') && (
          <span id="email-error" className="error" role="alert">
            {form.getFieldError('email')}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.state.values.password}
          onChange={(e) => form.setField('password', e.target.value)}
          aria-invalid={!!form.getFieldError('password')}
        />
        {form.getFieldError('password') && (
          <span className="error" role="alert">
            {form.getFieldError('password')}
          </span>
        )}
      </div>

      <button type="submit" disabled={form.state.isSubmitting}>
        {form.state.isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

## Async Validation with Debouncing

Some validations require API calls, like checking if a username is available. Always debounce these to avoid excessive requests:

```typescript
import { Cubit } from '@blac/core';
import { z } from 'zod';

const SignupSchema = z.object({
  username: z
    .string()
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(20, { error: 'Username must be at most 20 characters' })
    .regex(/^[a-z0-9_]+$/, { error: 'Only lowercase letters, numbers, and underscores' }),
  email: z.string().email({ error: 'Invalid email' }),
});

type SignupForm = z.infer<typeof SignupSchema>;

interface SignupState {
  values: SignupForm;
  errors: Partial<Record<keyof SignupForm, string>>;
  touched: Partial<Record<keyof SignupForm, boolean>>;
  validating: Partial<Record<keyof SignupForm, boolean>>; // Track async validation
  isSubmitting: boolean;
}

class SignupFormCubit extends Cubit<SignupState> {
  private usernameCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastCheckedUsername = '';

  constructor() {
    super({
      values: { username: '', email: '' },
      errors: {},
      touched: {},
      validating: {},
      isSubmitting: false,
    });
  }

  setUsername = (username: string) => {
    // Clear any pending async validation
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }

    this.update((state) => ({
      ...state,
      values: { ...state.values, username },
      touched: { ...state.touched, username: true },
    }));

    // Step 1: Run synchronous validation first
    const syncResult = SignupSchema.shape.username.safeParse(username);
    if (!syncResult.success) {
      this.update((state) => ({
        ...state,
        errors: { ...state.errors, username: syncResult.error.issues[0]?.message },
        validating: { ...state.validating, username: false },
      }));
      return;
    }

    // Step 2: Debounce async validation (300ms wait)
    this.update((state) => ({
      ...state,
      errors: { ...state.errors, username: undefined },
      validating: { ...state.validating, username: true },
    }));

    this.usernameCheckTimeout = setTimeout(async () => {
      // Skip if username changed while waiting
      if (username !== this.state.values.username) return;
      // Skip if we already checked this username
      if (username === this.lastCheckedUsername) return;

      try {
        const available = await api.checkUsernameAvailable(username);
        this.lastCheckedUsername = username;

        // Only update if username hasn't changed during the API call
        if (username === this.state.values.username) {
          this.update((state) => ({
            ...state,
            errors: {
              ...state.errors,
              username: available ? undefined : 'Username is already taken',
            },
            validating: { ...state.validating, username: false },
          }));
        }
      } catch {
        this.update((state) => ({
          ...state,
          validating: { ...state.validating, username: false },
        }));
      }
    }, 300);
  };

  // Show loading indicator during async validation
  get isValidating() {
    return Object.values(this.state.validating).some(Boolean);
  }

  // Cleanup timer when Cubit is disposed
  protected override onDispose = () => {
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }
  };
}
```

**Key points:**
- Debounce API calls to reduce server load
- Track `validating` state to show loading indicators
- Check if the value changed during async operation before updating state
- Clean up timers in `onDispose`

## Complex Nested Schemas

For forms with nested objects like addresses, use dot-notation paths for error tracking:

```typescript
const AddressSchema = z.object({
  street: z.string().min(1, { error: 'Street is required' }),
  city: z.string().min(1, { error: 'City is required' }),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, { error: 'Invalid ZIP code' }),
  country: z.enum(['US', 'CA', 'UK'], { error: 'Select a country' }),
});

const CheckoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().min(1).max(99),
        })
      )
      .min(1, { error: 'Add at least one item' }),
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema.optional(),
    sameAsShipping: z.boolean(),
  })
  .refine(
    // Cross-field validation: billing required unless same as shipping
    (data) => data.sameAsShipping || data.billingAddress !== undefined,
    {
      error: 'Billing address is required when different from shipping',
      path: ['billingAddress'], // Attach error to specific field
    }
  );

type CheckoutForm = z.infer<typeof CheckoutSchema>;

class CheckoutFormCubit extends Cubit<{
  values: CheckoutForm;
  errors: Record<string, string>; // Use string keys for nested paths
  isSubmitting: boolean;
}> {
  // Validate and convert Zod issues to dot-notation paths
  validate = (): boolean => {
    const result = CheckoutSchema.safeParse(this.state.values);

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        // Convert path array to dot notation: ['shippingAddress', 'city'] => 'shippingAddress.city'
        const path = issue.path.join('.');
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      }
      this.patch({ errors });
      return false;
    }

    this.patch({ errors: {} });
    return true;
  };

  // Helper to get error for any path
  getError = (path: string): string | undefined => {
    return this.state.errors[path];
  };

  // Update nested value using path
  setNestedField = (path: string, value: unknown) => {
    this.update((state) => {
      const newValues = { ...state.values };
      const parts = path.split('.');
      let current: Record<string, unknown> = newValues;

      // Navigate to parent and set value
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = { ...(current[parts[i]] as Record<string, unknown>) };
        current = current[parts[i]] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;

      return { ...state, values: newValues as CheckoutForm };
    });
  };
}
```

Usage in React:

```tsx
function AddressFields({ prefix }: { prefix: 'shippingAddress' | 'billingAddress' }) {
  const form = useBloc(CheckoutFormCubit);

  return (
    <fieldset>
      <input
        value={form.state.values[prefix]?.street ?? ''}
        onChange={(e) => form.setNestedField(`${prefix}.street`, e.target.value)}
        placeholder="Street"
      />
      {form.getError(`${prefix}.street`) && (
        <span className="error">{form.getError(`${prefix}.street`)}</span>
      )}
      {/* ... more fields */}
    </fieldset>
  );
}
```

## Reusable Form Base Class

For applications with many forms, create a reusable base class:

```typescript
import { Cubit } from '@blac/core';
import { z } from 'zod';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

abstract class FormCubit<T extends Record<string, unknown>> extends Cubit<FormState<T>> {
  protected abstract schema: z.ZodType<T>;

  constructor(initialValues: T) {
    super({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }

  setField = <K extends keyof T>(field: K, value: T[K]) => {
    this.update((state) => ({
      ...state,
      values: { ...state.values, [field]: value },
      touched: { ...state.touched, [field]: true },
    }));
    this.validateField(field);
  };

  private validateField = (field: keyof T) => {
    // For object schemas, validate individual field
    if (this.schema instanceof z.ZodObject) {
      const fieldSchema = this.schema.shape[field as string];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(this.state.values[field]);
        this.update((state) => ({
          ...state,
          errors: {
            ...state.errors,
            [field]: result.success ? undefined : result.error.issues[0]?.message,
          },
        }));
      }
    }
  };

  validate = (): boolean => {
    const result = this.schema.safeParse(this.state.values);

    if (!result.success) {
      const errors: Partial<Record<keyof T, string>> = {};
      const touched: Partial<Record<keyof T, boolean>> = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof T;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
        touched[field] = true;
      }

      this.patch({ errors, touched });
      return false;
    }

    this.patch({ errors: {} });
    return true;
  };

  reset = (values?: Partial<T>) => {
    this.emit({
      values: values ? { ...this.state.values, ...values } : this.state.values,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  };

  get isValid() {
    return Object.values(this.state.errors).every((e) => e === undefined);
  }

  get isDirty() {
    return Object.values(this.state.touched).some(Boolean);
  }

  getFieldError = (field: keyof T): string | undefined => {
    return this.state.touched[field] ? this.state.errors[field] : undefined;
  };
}
```

Now creating a new form is simple:

```typescript
const ContactSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }),
  email: z.string().email({ error: 'Invalid email address' }),
  subject: z.string().min(1, { error: 'Subject is required' }),
  message: z.string().min(10, { error: 'Message must be at least 10 characters' }),
});

class ContactFormCubit extends FormCubit<z.infer<typeof ContactSchema>> {
  protected schema = ContactSchema;

  constructor() {
    super({ name: '', email: '', subject: '', message: '' });
  }

  submit = async () => {
    if (!this.validate()) return;

    this.patch({ isSubmitting: true });
    try {
      await api.sendContactForm(this.state.values);
      this.reset({ name: '', email: '', subject: '', message: '' });
    } finally {
      this.patch({ isSubmitting: false });
    }
  };
}
```

## Common Pitfalls

### 1. Showing errors before user interaction

```typescript
// ❌ Bad: Shows error immediately
{form.state.errors.email && <span>{form.state.errors.email}</span>}

// ✅ Good: Only show after user has touched the field
{form.getFieldError('email') && <span>{form.getFieldError('email')}</span>}
```

### 2. Not handling API errors

```typescript
// ❌ Bad: Ignores server-side validation errors
submit = async () => {
  await api.register(this.state.values);
};

// ✅ Good: Maps API errors to form fields
submit = async () => {
  try {
    await api.register(this.state.values);
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') {
      this.patch({ errors: { email: 'This email is already registered' } });
    }
  }
};
```

### 3. Missing validation on blur

For better UX, validate when a field loses focus:

```tsx
<input
  onBlur={() => form.validateField('email')}
  onChange={(e) => form.setField('email', e.target.value)}
/>
```

## See Also

- [Cubit](/core/cubit) - Cubit fundamentals
- [useBloc](/react/use-bloc) - React hook usage
- [Zod Documentation](https://zod.dev/) - Full Zod API reference
