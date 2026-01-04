# Authentication Flow

This guide demonstrates building a complete authentication system using Vertex. You'll learn how to manage user sessions, handle JWT tokens, implement role-based access control, and integrate with React.

## Why Vertex for Authentication?

Authentication is a great fit for Vertex because:

- **Audit trail** - Events like `LoginSuccessEvent` and `LogoutEvent` create a clear history of what happened
- **Explicit state transitions** - Auth flows have distinct states (logged out → logging in → logged in) that map naturally to events
- **Debugging** - When something goes wrong, you can trace exactly which events led to the current state
- **Side effects** - Token storage, refresh scheduling, and API calls are easier to reason about when tied to specific events

## Part 1: Define Types

Start by defining the types that represent your authentication domain:

```typescript
// User roles for access control
// Order matters: admins have all editor permissions, editors have all viewer permissions
type UserRole = 'admin' | 'editor' | 'viewer';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

// JWT token pair with expiration
interface AuthTokens {
  accessToken: string; // Short-lived, sent with API requests
  refreshToken: string; // Long-lived, used to get new access tokens
  expiresAt: number; // Timestamp when accessToken expires
}

// Structured error for better error handling
interface AuthError {
  code:
    | 'invalid_credentials'
    | 'network_error'
    | 'token_expired'
    | 'unauthorized'
    | 'unknown';
  message: string;
}

// Complete auth state
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean; // True during login attempt
  isRefreshing: boolean; // True during token refresh
  error: AuthError | null;
}
```

**Why separate `isLoading` and `isRefreshing`?** During a login attempt, you want to disable the form. During a token refresh (which happens in the background), you might show a subtle indicator but shouldn't block the UI.

## Part 2: Define Events

Events are defined as a discriminated union type. TypeScript enforces that all event types are handled:

```typescript
// Define all auth events as a discriminated union
type AuthEvent =
  // Login flow
  | { type: 'loginStart'; email: string }
  | { type: 'loginSuccess'; user: User; tokens: AuthTokens }
  | { type: 'loginFailed'; error: AuthError }
  // Logout with reason tracking (useful for analytics and debugging)
  | { type: 'logout'; reason: 'user_initiated' | 'session_expired' | 'forced' }
  // Token refresh events (happens automatically in background)
  | { type: 'tokenRefreshStart' }
  | { type: 'tokenRefreshSuccess'; tokens: AuthTokens }
  | { type: 'tokenRefreshFailed'; error: AuthError }
  // Clear error (e.g., when user dismisses error message)
  | { type: 'clearError' };
```

**Benefits of discriminated unions:**

- TypeScript enforces exhaustive handling - you'll get a compile-time error if you miss an event type
- Full autocomplete when dispatching events
- Type narrowing in handlers - TypeScript knows exactly which properties are available

## Part 3: API Service

Create a service to handle all auth-related API calls. This keeps network logic separate from state management:

<details class="code-collapse">
<summary>Show code</summary>

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

class AuthApi {
  private baseUrl: string;

  constructor(baseUrl = '/api/auth') {
    this.baseUrl = baseUrl;
  }

  login = async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw this.mapHttpError(response.status, body);
    }

    return response.json();
  };

  refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failures mean the session is invalid
      throw {
        code: 'token_expired',
        message: 'Your session has expired',
      } as AuthError;
    }

    return response.json();
  };

  logout = async (accessToken: string): Promise<void> => {
    // Best effort - don't fail if this doesn't work
    await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  };

  getProfile = async (accessToken: string): Promise<User> => {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw {
        code: 'unauthorized',
        message: 'Failed to load profile',
      } as AuthError;
    }

    return response.json();
  };

  // Convert HTTP status codes to structured errors
  private mapHttpError = (
    status: number,
    body: { message?: string },
  ): AuthError => {
    switch (status) {
      case 401:
        return {
          code: 'invalid_credentials',
          message: body.message ?? 'Invalid email or password',
        };
      case 403:
        return {
          code: 'unauthorized',
          message: body.message ?? 'Access denied',
        };
      case 500:
      case 502:
      case 503:
        return {
          code: 'network_error',
          message: 'Server error. Please try again later.',
        };
      default:
        return {
          code: 'unknown',
          message: body.message ?? 'An unexpected error occurred',
        };
    }
  };
}

// Export singleton instance
export const authApi = new AuthApi();
```

</details>

## Part 4: Token Storage

Tokens need to persist across page refreshes. Use localStorage with proper error handling:

<details class="code-collapse">
<summary>Show code</summary>

```typescript
const TOKEN_STORAGE_KEY = 'auth_tokens';

export const tokenStorage = {
  save(tokens: AuthTokens): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // localStorage might be full or disabled
      console.warn('Failed to save auth tokens to localStorage');
    }
  },

  load(): AuthTokens | null {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as AuthTokens;
    } catch {
      // Invalid JSON or localStorage disabled
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  },

  // Check if token is expired or about to expire
  isExpired(tokens: AuthTokens, bufferMs = 60_000): boolean {
    return Date.now() >= tokens.expiresAt - bufferMs;
  },
};
```

**Why the buffer?** Tokens might expire during an API request. A 60-second buffer ensures we refresh before that happens.

</details>

## Part 5: The AuthVertex

Now combine everything into the Vertex. This is where state transitions and side effects live:

```typescript
import { Vertex, blac } from '@blac/core';

class AuthVertex extends Vertex<AuthState, AuthEvent> {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      user: null,
      tokens: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    this.registerEventHandlers();
    this.restoreSession();
  }

  // ─────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────

  private registerEventHandlers() {
    // TypeScript enforces that ALL event types are handled
    this.createHandlers({
      // Login flow
      loginStart: (_, emit) => {
        emit({
          ...this.state,
          isLoading: true,
          error: null, // Clear any previous error
        });
      },

      loginSuccess: (event, emit) => {
        emit({
          user: event.user,
          tokens: event.tokens,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });

        // Side effects after state update
        tokenStorage.save(event.tokens);
        this.scheduleTokenRefresh(event.tokens);
      },

      loginFailed: (event, emit) => {
        emit({
          ...this.state,
          isLoading: false,
          error: event.error,
        });
      },

      // Logout
      logout: (_, emit) => {
        emit({
          user: null,
          tokens: null,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });

        tokenStorage.clear();
        this.cancelTokenRefresh();
      },

      // Token refresh flow
      tokenRefreshStart: (_, emit) => {
        emit({ ...this.state, isRefreshing: true });
      },

      tokenRefreshSuccess: (event, emit) => {
        emit({
          ...this.state,
          tokens: event.tokens,
          isRefreshing: false,
        });

        tokenStorage.save(event.tokens);
        this.scheduleTokenRefresh(event.tokens);
      },

      tokenRefreshFailed: (_, emit) => {
        // Refresh failed = session is invalid, log user out
        emit({
          user: null,
          tokens: null,
          isLoading: false,
          isRefreshing: false,
          error: {
            code: 'token_expired',
            message: 'Your session has expired. Please sign in again.',
          },
        });

        tokenStorage.clear();
        this.cancelTokenRefresh();
      },

      clearError: (_, emit) => {
        emit({ ...this.state, error: null });
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Session Management
  // ─────────────────────────────────────────────────────────────────

  private async restoreSession() {
    const tokens = tokenStorage.load();
    if (!tokens) return;

    // If token is expired, try to refresh
    if (tokenStorage.isExpired(tokens)) {
      await this.refreshToken();
      return;
    }

    // Token looks valid, verify with server and get user data
    try {
      const user = await authApi.getProfile(tokens.accessToken);
      this.add({ type: 'loginSuccess', user, tokens });
    } catch {
      // Token was invalid, clear storage
      tokenStorage.clear();
    }
  }

  private scheduleTokenRefresh(tokens: AuthTokens) {
    this.cancelTokenRefresh();

    // Refresh 5 minutes before expiry
    const refreshIn = tokens.expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshIn <= 0) {
      // Token already expired or about to, refresh immediately
      this.refreshToken();
      return;
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshIn);
  }

  private cancelTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────

  login = async (email: string, password: string): Promise<boolean> => {
    this.add({ type: 'loginStart', email });

    try {
      const { user, tokens } = await authApi.login({ email, password });
      this.add({ type: 'loginSuccess', user, tokens });
      return true;
    } catch (error) {
      this.add({ type: 'loginFailed', error: error as AuthError });
      return false;
    }
  };

  logout = async (
    reason: 'user_initiated' | 'session_expired' | 'forced' = 'user_initiated',
  ): Promise<void> => {
    // Notify server (best effort)
    if (this.state.tokens) {
      await authApi.logout(this.state.tokens.accessToken);
    }

    this.add({ type: 'logout', reason });
  };

  refreshToken = async (): Promise<boolean> => {
    const tokens = this.state.tokens ?? tokenStorage.load();
    if (!tokens?.refreshToken) return false;

    this.add({ type: 'tokenRefreshStart' });

    try {
      const newTokens = await authApi.refreshToken(tokens.refreshToken);
      this.add({ type: 'tokenRefreshSuccess', tokens: newTokens });
      return true;
    } catch (error) {
      this.add({ type: 'tokenRefreshFailed', error: error as AuthError });
      return false;
    }
  };

  clearError = () => {
    this.add({ type: 'clearError' });
  };

  // ─────────────────────────────────────────────────────────────────
  // Computed Properties
  // ─────────────────────────────────────────────────────────────────

  get isAuthenticated(): boolean {
    return this.state.user !== null && this.state.tokens !== null;
  }

  get accessToken(): string | null {
    return this.state.tokens?.accessToken ?? null;
  }

  get currentUser(): User | null {
    return this.state.user;
  }

  // ─────────────────────────────────────────────────────────────────
  // Role-Based Access Control
  // ─────────────────────────────────────────────────────────────────

  // Role hierarchy: admin > editor > viewer
  private static readonly ROLE_LEVELS: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  hasRole = (role: UserRole): boolean => {
    if (!this.state.user) return false;
    return this.state.user.role === role;
  };

  hasMinimumRole = (minimumRole: UserRole): boolean => {
    if (!this.state.user) return false;
    const userLevel = AuthVertex.ROLE_LEVELS[this.state.user.role];
    const requiredLevel = AuthVertex.ROLE_LEVELS[minimumRole];
    return userLevel >= requiredLevel;
  };

  hasAnyRole = (roles: UserRole[]): boolean => {
    if (!this.state.user) return false;
    return roles.includes(this.state.user.role);
  };

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  protected override onDispose = () => {
    this.cancelTokenRefresh();
  };

  protected override onEventError = (event: AuthEvent, error: Error): void => {
    console.error(`Auth error during ${event.type}:`, error);
  };
}

export { AuthVertex };
```

## Part 6: React Components

### Login Form

```tsx
import { useState } from 'react';
import { useBloc } from '@blac/react';

function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const auth = useBloc(AuthVertex);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await auth.login(email, password);
    if (success) {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {auth.state.error && (
        <div className="error-banner" role="alert">
          <span>{auth.state.error.message}</span>
          <button type="button" onClick={auth.clearError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={auth.state.isLoading}
          required
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={auth.state.isLoading}
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" disabled={auth.state.isLoading}>
        {auth.state.isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

### Protected Routes

Create a wrapper component for routes that require authentication:

```tsx
import { useBloc } from '@blac/react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  minimumRole?: UserRole; // Require at least this role level
  allowedRoles?: UserRole[]; // Or allow specific roles
  redirectTo?: string;
}

function ProtectedRoute({
  minimumRole,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const auth = useBloc(AuthVertex);
  const location = useLocation();

  // Show loading while restoring session
  if (auth.state.isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Not authenticated
  if (!auth.isAuthenticated) {
    // Save the attempted URL for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (minimumRole && !auth.hasMinimumRole(minimumRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !auth.hasAnyRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

Usage in your router:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // Authenticated routes (any logged-in user)
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },

  // Editor and admin only
  {
    element: <ProtectedRoute minimumRole="editor" />,
    children: [{ path: '/content', element: <ContentEditor /> }],
  },

  // Admin only
  {
    element: <ProtectedRoute minimumRole="admin" />,
    children: [
      { path: '/admin', element: <AdminPanel /> },
      { path: '/admin/users', element: <UserManagement /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### User Menu

Display current user and sign-out button:

```tsx
function UserMenu() {
  const auth = useBloc(AuthVertex);

  if (!auth.isAuthenticated) {
    return <Link to="/login">Sign In</Link>;
  }

  return (
    <div className="user-menu">
      {auth.state.user?.avatarUrl && (
        <img src={auth.state.user.avatarUrl} alt="" className="avatar" />
      )}
      <span className="name">{auth.state.user?.name}</span>
      <span className="role">{auth.state.user?.role}</span>

      {auth.state.isRefreshing && (
        <span className="refreshing" title="Refreshing session...">
          ⟳
        </span>
      )}

      <button onClick={() => auth.logout()}>Sign Out</button>
    </div>
  );
}
```

### Conditional UI Based on Role

```tsx
function Dashboard() {
  const auth = useBloc(AuthVertex);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Everyone sees this */}
      <section>
        <h2>Overview</h2>
        <StatsCards />
      </section>

      {/* Editors and admins */}
      {auth.hasMinimumRole('editor') && (
        <section>
          <h2>Recent Content</h2>
          <ContentList editable />
        </section>
      )}

      {/* Admins only */}
      {auth.hasRole('admin') && (
        <section>
          <h2>System Health</h2>
          <SystemMonitor />
        </section>
      )}
    </div>
  );
}
```

## Part 7: Authenticated API Requests

Create a wrapper around fetch that automatically handles authentication:

<details class="code-collapse">
<summary>Show code</summary>

```typescript
export function createAuthenticatedFetch(auth: AuthVertex) {
  return async function authFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = auth.accessToken;

    // Add auth header if we have a token
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(url, { ...options, headers });

    // Handle 401 by refreshing and retrying once
    if (response.status === 401 && token) {
      const refreshed = await auth.refreshToken();

      if (refreshed && auth.accessToken) {
        // Retry with new token
        headers.set('Authorization', `Bearer ${auth.accessToken}`);
        response = await fetch(url, { ...options, headers });
      } else {
        // Refresh failed, user will be logged out by the event handler
      }
    }

    return response;
  };
}

// Usage
import { acquire } from '@blac/core';

const auth = acquire(AuthVertex);
const authFetch = createAuthenticatedFetch(auth);

// Now use authFetch instead of fetch for protected endpoints
const response = await authFetch('/api/protected/data');
const data = await response.json();
```

</details>

## Part 8: Testing

<details class="code-collapse">
<summary>Show code</summary>

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('AuthVertex', () => {
  let auth: AuthVertex;

  beforeEach(() => {
    // Clear storage and mocks
    localStorage.clear();
    vi.clearAllMocks();

    // Create fresh instance
    auth = new AuthVertex();
  });

  afterEach(() => {
    auth.dispose();
  });

  describe('initial state', () => {
    it('starts unauthenticated', () => {
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.state.user).toBeNull();
      expect(auth.state.tokens).toBeNull();
    });
  });

  describe('login', () => {
    it('handles successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'viewer' as const,
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      vi.spyOn(authApi, 'login').mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const success = await auth.login('test@example.com', 'password');

      expect(success).toBe(true);
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.state.user).toEqual(mockUser);
      expect(auth.state.error).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeTruthy();
    });

    it('handles login failure', async () => {
      const error: AuthError = {
        code: 'invalid_credentials',
        message: 'Wrong password',
      };
      vi.spyOn(authApi, 'login').mockRejectedValue(error);

      const success = await auth.login('test@example.com', 'wrong');

      expect(success).toBe(false);
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.state.error).toEqual(error);
    });

    it('clears previous error on new login attempt', async () => {
      // First, fail a login
      vi.spyOn(authApi, 'login').mockRejectedValueOnce({
        code: 'invalid_credentials',
        message: 'Wrong',
      });
      await auth.login('test@example.com', 'wrong');
      expect(auth.state.error).not.toBeNull();

      // Start new login - error should clear
      vi.spyOn(authApi, 'login').mockImplementation(
        () => new Promise(() => {}),
      ); // Never resolves
      auth.login('test@example.com', 'password');
      expect(auth.state.error).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears state and storage', async () => {
      // Setup: log in first
      vi.spyOn(authApi, 'login').mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          role: 'viewer',
        },
        tokens: {
          accessToken: 'a',
          refreshToken: 'r',
          expiresAt: Date.now() + 3600000,
        },
      });
      await auth.login('test@example.com', 'password');
      expect(auth.isAuthenticated).toBe(true);

      // Logout
      vi.spyOn(authApi, 'logout').mockResolvedValue();
      await auth.logout();

      expect(auth.isAuthenticated).toBe(false);
      expect(auth.state.tokens).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });
  });

  describe('role checking', () => {
    beforeEach(async () => {
      vi.spyOn(authApi, 'login').mockResolvedValue({
        user: {
          id: '1',
          email: 'editor@example.com',
          name: 'Editor',
          role: 'editor',
        },
        tokens: {
          accessToken: 'a',
          refreshToken: 'r',
          expiresAt: Date.now() + 3600000,
        },
      });
      await auth.login('editor@example.com', 'password');
    });

    it('hasRole checks exact role', () => {
      expect(auth.hasRole('editor')).toBe(true);
      expect(auth.hasRole('admin')).toBe(false);
      expect(auth.hasRole('viewer')).toBe(false);
    });

    it('hasMinimumRole checks role hierarchy', () => {
      expect(auth.hasMinimumRole('viewer')).toBe(true); // Editor >= Viewer
      expect(auth.hasMinimumRole('editor')).toBe(true); // Editor >= Editor
      expect(auth.hasMinimumRole('admin')).toBe(false); // Editor < Admin
    });

    it('hasAnyRole checks role list', () => {
      expect(auth.hasAnyRole(['admin', 'editor'])).toBe(true);
      expect(auth.hasAnyRole(['admin'])).toBe(false);
    });
  });
});
```

</details>

## Security Considerations

1. **Never store sensitive data in state** - Passwords should never be stored in the Cubit/Vertex state
2. **Use HTTPS** - Always use HTTPS in production to protect tokens in transit
3. **Token storage** - localStorage is vulnerable to XSS. For higher security, consider httpOnly cookies
4. **Refresh token rotation** - Implement refresh token rotation on the server to detect token theft
5. **Short-lived access tokens** - Keep access token lifetime short (15-60 minutes)

## See Also

- [Vertex](/core/vertex) - Vertex fundamentals
- [Form Validation](/core/form-validation) - Building forms with Cubit
- [Shared vs Isolated](/react/shared-vs-isolated) - When to use singleton instances
