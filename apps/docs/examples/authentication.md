# Authentication Example

A complete authentication system demonstrating user login, registration, session management, and protected routes using BlaC.

## Basic Authentication Cubit

Let's start with a simple authentication implementation:

### State Definition

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: Date | null;
}
```

### Authentication Cubit

```typescript
import { Cubit } from '@blac/core';

export class AuthCubit extends Cubit<AuthState> {
  constructor(private authAPI: AuthAPI) {
    super({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
    });

    // Check for existing session on init
    this.checkSession();
  }

  // Session management
  checkSession = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    this.patch({ isLoading: true });

    try {
      const user = await this.authAPI.validateToken(token);
      this.patch({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    } catch (error) {
      // Invalid token, clear it
      localStorage.removeItem('auth_token');
      this.patch({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  // Login
  login = async (email: string, password: string) => {
    this.patch({ isLoading: true, error: null });

    try {
      const { user, token, expiresIn } = await this.authAPI.login(
        email,
        password,
      );

      // Store token
      localStorage.setItem('auth_token', token);

      // Update state
      this.patch({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpiry: new Date(Date.now() + expiresIn * 1000),
      });

      return { success: true };
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error.message || 'Login failed',
      });
      return { success: false, error: error.message };
    }
  };

  // Logout
  logout = async () => {
    this.patch({ isLoading: true });

    try {
      await this.authAPI.logout();
    } catch (error) {
      // Log error but continue with local logout
      console.error('Logout API error:', error);
    }

    // Clear local state regardless
    localStorage.removeItem('auth_token');
    this.emit({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
    });
  };

  // Registration
  register = async (email: string, password: string, name: string) => {
    this.patch({ isLoading: true, error: null });

    try {
      const { user, token, expiresIn } = await this.authAPI.register({
        email,
        password,
        name,
      });

      // Store token
      localStorage.setItem('auth_token', token);

      // Update state
      this.patch({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpiry: new Date(Date.now() + expiresIn * 1000),
      });

      return { success: true };
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      return { success: false, error: error.message };
    }
  };

  // Update user profile
  updateProfile = async (updates: Partial<User>) => {
    if (!this.state.user) return;

    // Optimistic update
    const previousUser = this.state.user;
    this.patch({
      user: { ...this.state.user, ...updates },
    });

    try {
      const updatedUser = await this.authAPI.updateProfile(updates);
      this.patch({ user: updatedUser });
    } catch (error) {
      // Revert on error
      this.patch({
        user: previousUser,
        error: 'Failed to update profile',
      });
    }
  };

  // Clear error
  clearError = () => {
    this.patch({ error: null });
  };

  // Computed properties
  get isSessionValid() {
    return this.state.sessionExpiry && this.state.sessionExpiry > new Date();
  }

  get sessionRemainingMinutes() {
    if (!this.state.sessionExpiry) return 0;
    const remaining = this.state.sessionExpiry.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 60000));
  }
}
```

## React Components

### Login Form

```tsx
import { useBloc } from '@blac/react';
import { AuthCubit } from './AuthCubit';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [state, auth] = useBloc(AuthCubit);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await auth.login(email, password);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>

      {state.error && (
        <div className="error-message">
          {state.error}
          <button type="button" onClick={auth.clearError}>
            ×
          </button>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={state.isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={state.isLoading}
        />
      </div>

      <button type="submit" disabled={state.isLoading}>
        {state.isLoading ? 'Logging in...' : 'Login'}
      </button>

      <p>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </form>
  );
}
```

### Protected Route Component

```tsx
import { useBloc } from '@blac/react';
import { AuthCubit } from './AuthCubit';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const [state] = useBloc(AuthCubit);
  const location = useLocation();

  // Still loading initial session
  if (state.isLoading && !state.user) {
    return <div>Loading...</div>;
  }

  // Not authenticated
  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole && state.user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### User Profile Component

```tsx
function UserProfile() {
  const [state, auth] = useBloc(AuthCubit);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: state.user?.name || '',
    avatarUrl: state.user?.avatarUrl || '',
  });

  if (!state.user) return null;

  const handleSave = async () => {
    await auth.updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="user-profile">
      <h2>Profile</h2>

      {state.error && <div className="error">{state.error}</div>}

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Name"
          />
          <input
            type="url"
            value={formData.avatarUrl}
            onChange={(e) =>
              setFormData({ ...formData, avatarUrl: e.target.value })
            }
            placeholder="Avatar URL"
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div>
          <img
            src={state.user.avatarUrl || '/default-avatar.png'}
            alt="Avatar"
          />
          <h3>{state.user.name}</h3>
          <p>{state.user.email}</p>
          <p>Role: {state.user.role}</p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      )}

      <div className="session-info">
        <p>Session expires in: {auth.sessionRemainingMinutes} minutes</p>
      </div>

      <button onClick={auth.logout} className="logout-button">
        Logout
      </button>
    </div>
  );
}
```

## Advanced: Event-Driven Auth with Bloc

For more complex authentication flows, use the Bloc pattern:

### Auth Events

```typescript
abstract class AuthEvent {}

class LoginRequested extends AuthEvent {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}

class LogoutRequested extends AuthEvent {}

class RegisterRequested extends AuthEvent {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
  ) {
    super();
  }
}

class SessionChecked extends AuthEvent {}

class TokenRefreshed extends AuthEvent {
  constructor(public readonly token: string) {
    super();
  }
}

class SessionExpired extends AuthEvent {}

class ProfileUpdateRequested extends AuthEvent {
  constructor(public readonly updates: Partial<User>) {
    super();
  }
}

type AuthEventType =
  | LoginRequested
  | LogoutRequested
  | RegisterRequested
  | SessionChecked
  | TokenRefreshed
  | SessionExpired
  | ProfileUpdateRequested;
```

### Auth Bloc

```typescript
import { Bloc } from '@blac/core';

export class AuthBloc extends Bloc<AuthState, AuthEventType> {
  private refreshTimer?: NodeJS.Timeout;

  constructor(private authAPI: AuthAPI) {
    super({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
    });

    // Register event handlers
    this.on(LoginRequested, this.handleLogin);
    this.on(LogoutRequested, this.handleLogout);
    this.on(RegisterRequested, this.handleRegister);
    this.on(SessionChecked, this.handleSessionCheck);
    this.on(TokenRefreshed, this.handleTokenRefresh);
    this.on(SessionExpired, this.handleSessionExpired);
    this.on(ProfileUpdateRequested, this.handleProfileUpdate);

    // Check session on init
    this.add(new SessionChecked());
  }

  private handleLogin = async (
    event: LoginRequested,
    emit: (state: AuthState) => void,
  ) => {
    emit({ ...this.state, isLoading: true, error: null });

    try {
      const response = await this.authAPI.login(event.email, event.password);

      localStorage.setItem('auth_token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refresh_token', response.refreshToken);
      }

      emit({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiry: new Date(Date.now() + response.expiresIn * 1000),
      });

      // Set up token refresh
      this.scheduleTokenRefresh(response.expiresIn);
    } catch (error) {
      emit({
        ...this.state,
        isLoading: false,
        error: error.message || 'Login failed',
      });
    }
  };

  private handleLogout = async (
    _: LogoutRequested,
    emit: (state: AuthState) => void,
  ) => {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    try {
      await this.authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

    emit({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
    });
  };

  private handleTokenRefresh = async (
    _: TokenRefreshed,
    emit: (state: AuthState) => void,
  ) => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.add(new SessionExpired());
      return;
    }

    try {
      const response = await this.authAPI.refreshToken(refreshToken);

      localStorage.setItem('auth_token', response.token);

      emit({
        ...this.state,
        sessionExpiry: new Date(Date.now() + response.expiresIn * 1000),
      });

      // Schedule next refresh
      this.scheduleTokenRefresh(response.expiresIn);
    } catch (error) {
      this.add(new SessionExpired());
    }
  };

  private scheduleTokenRefresh(expiresIn: number) {
    // Refresh 5 minutes before expiry
    const refreshIn = (expiresIn - 300) * 1000;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.add(new TokenRefreshed(localStorage.getItem('auth_token')!));
    }, refreshIn);
  }

  // Public methods
  login = (email: string, password: string) => {
    this.add(new LoginRequested(email, password));
  };

  logout = () => this.add(new LogoutRequested());

  register = (email: string, password: string, name: string) => {
    this.add(new RegisterRequested(email, password, name));
  };

  updateProfile = (updates: Partial<User>) => {
    this.add(new ProfileUpdateRequested(updates));
  };

  dispose() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    super.dispose();
  }
}
```

## Social Authentication

Extend authentication with social providers:

```typescript
interface SocialAuthState extends AuthState {
  availableProviders: string[];
  isLinkingAccount: boolean;
}

export class SocialAuthCubit extends Cubit<SocialAuthState> {
  constructor(private authAPI: AuthAPI) {
    super({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      availableProviders: ['google', 'github', 'twitter'],
      isLinkingAccount: false,
    });
  }

  loginWithProvider = async (provider: string) => {
    this.patch({ isLoading: true, error: null });

    try {
      // Redirect to OAuth provider
      const authUrl = await this.authAPI.getOAuthUrl(provider);
      window.location.href = authUrl;
    } catch (error) {
      this.patch({
        isLoading: false,
        error: `Failed to login with ${provider}`,
      });
    }
  };

  handleOAuthCallback = async (code: string, provider: string) => {
    this.patch({ isLoading: true, error: null });

    try {
      const response = await this.authAPI.handleOAuthCallback(code, provider);

      localStorage.setItem('auth_token', response.token);

      this.patch({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpiry: new Date(Date.now() + response.expiresIn * 1000),
      });

      return { success: true };
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  };

  linkAccount = async (provider: string) => {
    if (!this.state.user) return;

    this.patch({ isLinkingAccount: true, error: null });

    try {
      const updatedUser = await this.authAPI.linkSocialAccount(
        this.state.user.id,
        provider,
      );

      this.patch({
        user: updatedUser,
        isLinkingAccount: false,
      });
    } catch (error) {
      this.patch({
        isLinkingAccount: false,
        error: `Failed to link ${provider} account`,
      });
    }
  };
}
```

### Social Login Component

```tsx
function SocialLoginButtons() {
  const [state, auth] = useBloc(SocialAuthCubit);

  return (
    <div className="social-login">
      <div className="divider">Or login with</div>

      {state.availableProviders.map((provider) => (
        <button
          key={provider}
          onClick={() => auth.loginWithProvider(provider)}
          disabled={state.isLoading}
          className={`social-button ${provider}`}
        >
          <img src={`/icons/${provider}.svg`} alt={provider} />
          Continue with {provider}
        </button>
      ))}
    </div>
  );
}
```

## Session Management

Advanced session handling with activity tracking:

```typescript
export class SessionCubit extends Cubit<SessionState> {
  private activityTimer?: NodeJS.Timeout;
  private warningTimer?: NodeJS.Timeout;

  constructor(
    private authAPI: AuthAPI,
    private options = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      warningBefore: 5 * 60 * 1000, // 5 minutes
    },
  ) {
    super({
      lastActivity: new Date(),
      showWarning: false,
      remainingTime: options.sessionTimeout,
    });

    // Start monitoring
    this.startActivityMonitoring();
  }

  private startActivityMonitoring() {
    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const updateActivity = () => {
      this.patch({ lastActivity: new Date() });
      this.resetTimers();
    };

    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    this.resetTimers();
  }

  private resetTimers() {
    // Clear existing timers
    if (this.activityTimer) clearTimeout(this.activityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      this.patch({ showWarning: true });
    }, this.options.sessionTimeout - this.options.warningBefore);

    // Set logout timer
    this.activityTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.options.sessionTimeout);
  }

  private handleTimeout = async () => {
    // Emit session expired event or logout
    await this.authAPI.logout();
    window.location.href = '/login?reason=timeout';
  };

  extendSession = () => {
    this.patch({ showWarning: false });
    this.resetTimers();
  };

  get timeRemaining() {
    const elapsed = Date.now() - this.state.lastActivity.getTime();
    const remaining = this.options.sessionTimeout - elapsed;
    return Math.max(0, remaining);
  }
}
```

## Testing

Test authentication flows:

```typescript
import { AuthCubit } from './AuthCubit';
import { MockAuthAPI } from './mocks';

describe('AuthCubit', () => {
  let cubit: AuthCubit;
  let mockAPI: MockAuthAPI;

  beforeEach(() => {
    mockAPI = new MockAuthAPI();
    cubit = new AuthCubit(mockAPI);
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      mockAPI.login.mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'mock-token',
        expiresIn: 3600,
      });

      const result = await cubit.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(cubit.state.isAuthenticated).toBe(true);
      expect(cubit.state.user?.email).toBe('test@example.com');
      expect(localStorage.getItem('auth_token')).toBe('mock-token');
    });

    it('should handle login failure', async () => {
      mockAPI.login.mockRejectedValue(new Error('Invalid credentials'));

      const result = await cubit.login('test@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(cubit.state.isAuthenticated).toBe(false);
      expect(cubit.state.error).toBe('Invalid credentials');
    });
  });

  describe('session management', () => {
    it('should restore session from token', async () => {
      localStorage.setItem('auth_token', 'valid-token');

      mockAPI.validateToken.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });

      await cubit.checkSession();

      expect(cubit.state.isAuthenticated).toBe(true);
      expect(cubit.state.user?.email).toBe('test@example.com');
    });

    it('should clear invalid token', async () => {
      localStorage.setItem('auth_token', 'invalid-token');
      mockAPI.validateToken.mockRejectedValue(new Error('Invalid token'));

      await cubit.checkSession();

      expect(cubit.state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});
```

## Key Patterns Demonstrated

1. **Session Management**: Token storage, validation, and refresh
2. **Protected Routes**: Role-based access control
3. **Error Handling**: User-friendly error messages
4. **Optimistic Updates**: Immediate UI feedback
5. **Social Authentication**: OAuth integration
6. **Session Timeout**: Activity monitoring and warnings
7. **Event-Driven Architecture**: Clear authentication flow with Bloc
8. **Testing**: Comprehensive auth flow testing

## Security Best Practices

1. **Never store sensitive data in state**: Only non-sensitive user info
2. **Use HTTPS-only cookies**: For production auth tokens
3. **Implement CSRF protection**: For state-changing operations
4. **Rate limiting**: Prevent brute force attacks
5. **Token rotation**: Regular token refresh
6. **Secure storage**: Use secure storage APIs when available

## Next Steps

- [Form Management](/examples/forms) - Complex form validation
- [API Integration](/examples/api-integration) - Advanced API patterns
- [Real-time Features](/examples/real-time) - WebSocket authentication
- [Testing Guide](/guides/testing) - Comprehensive testing strategies
