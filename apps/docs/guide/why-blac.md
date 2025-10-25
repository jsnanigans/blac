# Why BlaC?

## Design Philosophy

BlaC is designed with several core principles:

1. **Simplicity**: Easy to learn, with clear patterns and conventions
2. **Type Safety**: TypeScript-first design with excellent type inference
3. **Performance**: Fine-grained reactivity with minimal re-renders
4. **Testability**: Business logic isolated from UI concerns
5. **Extensibility**: Plugin architecture for custom functionality

## When to Use BlaC

// TODO: add

## When Not to Use BlaC

// TODO: add

Consider alternatives if:

- You need the smallest possible bundle size
- Your state management is extremely simple
- You require a very large ecosystem of middleware
- You prefer functional programming over class-based patterns

## Real-World Use Cases

### Form Management
```typescript
class FormBloc extends Bloc<FormState, FormEvent> {
  constructor() {
    super({ values: {}, errors: {}, isSubmitting: false });

    this.on(FieldChanged, (event, emit) => {
      emit({
        ...this.state,
        values: { ...this.state.values, [event.field]: event.value },
      });
    });

    this.on(FormSubmitted, async (event, emit) => {
      emit({ ...this.state, isSubmitting: true });
      // Handle submission...
    });
  }
}
```

### Data Fetching
```typescript
class DataBloc extends Cubit<DataState> {
  constructor(private api: ApiClient) {
    super({ status: 'idle', data: null, error: null });
  }

  fetchData = async (params: Params) => {
    this.emit({ status: 'loading', data: null, error: null });

    try {
      const data = await this.api.fetch(params);
      this.emit({ status: 'success', data, error: null });
    } catch (error) {
      this.emit({ status: 'error', data: null, error });
    }
  };
}
```

### Authentication
```typescript
class AuthBloc extends Bloc<AuthState, AuthEvent> {
  constructor(private authService: AuthService) {
    super({ user: null, isAuthenticated: false });

    this.on(LoginRequested, async (event, emit) => {
      const user = await this.authService.login(event.credentials);
      emit({ user, isAuthenticated: true });
    });

    this.on(LogoutRequested, async (event, emit) => {
      await this.authService.logout();
      emit({ user: null, isAuthenticated: false });
    });
  }
}
```
