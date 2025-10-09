import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BlocCommunicationDemo } from './BlocCommunicationDemo';
// eslint-disable-next-line import/no-unused-modules

const demoCode = `import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit, Blac } from '@blac/core';

// Auth Cubit - Shared globally
interface AuthState {
  isAuthenticated: boolean;
  userName: string | null;
  isLoading: boolean;
}

class AuthCubit extends Cubit<AuthState> {
  // Shared by default (no static isolated = true)
  constructor() {
    super({
      isAuthenticated: false,
      userName: null,
      isLoading: false,
    });
  }

  login = async (userName: string) => {
    this.patch({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300));
    this.patch({ isAuthenticated: true, userName, isLoading: false });
  };

  logout = async () => {
    this.patch({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.patch({
      isAuthenticated: false,
      userName: null,
      isLoading: false,
    });
  };
}

// Dashboard Stats Cubit - Isolated, but accesses shared AuthCubit
interface DashboardStatsState {
  statsMessage: string;
  isLoading: boolean;
  lastLoadedForUser: string | null;
}

class DashboardStatsCubit extends Cubit<DashboardStatsState> {
  static isolated = true; // Each instance gets its own stats cubit

  constructor() {
    super({
      statsMessage: 'No stats loaded yet.',
      isLoading: false,
      lastLoadedForUser: null,
    });
  }

  loadDashboard = async () => {
    this.patch({ isLoading: true, statsMessage: 'Loading dashboard data...' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    let userName: string | null = 'Guest';
    let isAuthenticated = false;

    try {
      // Bloc-to-Bloc communication: Access the shared AuthCubit
      const authCubit = Blac.getBloc(AuthCubit, { throwIfNotFound: true });
      isAuthenticated = authCubit.state.isAuthenticated;
      userName = authCubit.state.userName || 'Guest';
    } catch (error) {
      console.warn('DashboardStatsCubit: Could not access AuthCubit');
    }

    if (isAuthenticated) {
      this.patch({
        statsMessage: \`Personalized stats for \${userName}. Sales: $\${Math.floor(
          Math.random() * 10000
        )}\`,
        isLoading: false,
        lastLoadedForUser: userName,
      });
    } else {
      this.patch({
        statsMessage: 'Please log in for personalized data.',
        isLoading: false,
        lastLoadedForUser: 'Guest',
      });
    }
  };

  resetStats = () => {
    this.emit({
      statsMessage: 'No stats loaded yet.',
      isLoading: false,
      lastLoadedForUser: null,
    });
  };
}

// Notification Cubit - Subscribes to AuthCubit changes
class NotificationCubit extends Cubit<{ messages: string[]; unreadCount: number }> {
  private authSubscription?: () => void;

  constructor() {
    super({ messages: [], unreadCount: 0 });
    this.subscribeToAuth();
  }

  private subscribeToAuth = () => {
    try {
      const authCubit = Blac.getBloc(AuthCubit, { throwIfNotFound: false });
      if (authCubit) {
        // Subscribe to auth state changes
        this.authSubscription = authCubit.subscribe((authState) => {
          if (authState.isAuthenticated && authState.userName) {
            this.addMessage(\`Welcome back, \${authState.userName}!\`);
          } else if (!authState.isAuthenticated) {
            this.addMessage('You have been logged out.');
          }
        });
      }
    } catch (error) {
      console.warn('NotificationCubit: Could not subscribe to AuthCubit');
    }
  };

  addMessage = (message: string) => {
    this.patch({
      messages: [...this.state.messages, message],
      unreadCount: this.state.unreadCount + 1,
    });
  };

  clearMessages = () => {
    this.patch({ messages: [], unreadCount: 0 });
  };

  onDispose = () => {
    if (this.authSubscription) {
      this.authSubscription();
    }
  };
}

// Demo Component
export const BlocCommunicationDemo: React.FC = () => {
  const [authState, authCubit] = useBloc(AuthCubit);
  const [dashboardState, dashboardCubit] = useBloc(DashboardStatsCubit);
  const [notificationState, notificationCubit] = useBloc(NotificationCubit);
  const [userNameInput, setUserNameInput] = useState('DemoUser');

  return (
    <div className="space-y-6">
      {/* Auth Section */}
      {/* Dashboard Section */}
      {/* Notifications Section */}
      {/* Explanation */}
    </div>
  );
};`;

const testCode = `import { describe, it, expect, beforeEach } from 'vitest';
import { AuthCubit, DashboardStatsCubit, NotificationCubit } from './BlocCommunicationDemo';
import { Blac } from '@blac/core';

describe('BlocCommunicationDemo', () => {
  beforeEach(() => {
    // Clear all Blocs before each test
    Blac.clear();
  });

  describe('AuthCubit', () => {
    it('should handle login and logout', async () => {
      const authCubit = new AuthCubit();
      
      expect(authCubit.state.isAuthenticated).toBe(false);
      expect(authCubit.state.userName).toBeNull();
      
      // Login
      await authCubit.login('TestUser');
      expect(authCubit.state.isAuthenticated).toBe(true);
      expect(authCubit.state.userName).toBe('TestUser');
      
      // Logout
      await authCubit.logout();
      expect(authCubit.state.isAuthenticated).toBe(false);
      expect(authCubit.state.userName).toBeNull();
    });
  });

  describe('DashboardStatsCubit', () => {
    it('should load different stats based on auth state', async () => {
      const authCubit = new AuthCubit();
      const dashboardCubit = new DashboardStatsCubit();
      
      // Load stats when not authenticated
      await dashboardCubit.loadDashboard();
      expect(dashboardCubit.state.statsMessage).toContain('Please log in');
      expect(dashboardCubit.state.lastLoadedForUser).toBe('Guest');
      
      // Login and load stats again
      await authCubit.login('TestUser');
      await dashboardCubit.loadDashboard();
      expect(dashboardCubit.state.statsMessage).toContain('Personalized stats for TestUser');
      expect(dashboardCubit.state.lastLoadedForUser).toBe('TestUser');
    });

    it('should access shared AuthCubit state', async () => {
      const authCubit = new AuthCubit();
      await authCubit.login('SharedUser');
      
      // Create a new dashboard cubit that should access the shared auth
      const dashboardCubit = new DashboardStatsCubit();
      await dashboardCubit.loadDashboard();
      
      expect(dashboardCubit.state.lastLoadedForUser).toBe('SharedUser');
    });
  });

  describe('NotificationCubit', () => {
    it('should react to auth state changes', async () => {
      const authCubit = new AuthCubit();
      const notificationCubit = new NotificationCubit();
      
      expect(notificationCubit.state.messages.length).toBe(0);
      
      // Login should trigger a notification
      await authCubit.login('NotifyUser');
      // Wait for subscription to process
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(notificationCubit.state.messages.length).toBe(1);
      expect(notificationCubit.state.messages[0]).toContain('Welcome back, NotifyUser');
      expect(notificationCubit.state.unreadCount).toBe(1);
      
      // Logout should trigger another notification
      await authCubit.logout();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(notificationCubit.state.messages.length).toBe(2);
      expect(notificationCubit.state.messages[1]).toContain('logged out');
      expect(notificationCubit.state.unreadCount).toBe(2);
    });
  });

  describe('Bloc-to-Bloc Communication', () => {
    it('should allow isolated Cubits to access shared Cubits', () => {
      const authCubit = new AuthCubit();
      
      // DashboardStatsCubit is isolated
      expect(DashboardStatsCubit.isolated).toBe(true);
      
      // But it can still access the shared AuthCubit
      const foundAuthCubit = Blac.getBloc(AuthCubit);
      expect(foundAuthCubit).toBe(authCubit);
    });

    it('should handle missing Bloc gracefully', async () => {
      // Don't create AuthCubit
      const dashboardCubit = new DashboardStatsCubit();
      
      // Should handle missing AuthCubit gracefully
      await dashboardCubit.loadDashboard();
      expect(dashboardCubit.state.statsMessage).toContain('Please log in');
    });
  });
});`;

DemoRegistry.register({
  id: 'bloc-communication',
  title: 'Bloc-to-Bloc Communication',
  description:
    'Demonstrates how different Blocs can communicate with each other, access shared state, and subscribe to changes',
  category: '03-advanced',
  difficulty: 'advanced',
  tags: ['communication', 'shared-state', 'subscriptions', 'patterns'],
  concepts: [
    'Accessing other Blocs using Blac.getBloc()',
    'Shared vs isolated Bloc instances',
    'Subscribing to other Bloc state changes',
    'Cross-feature state coordination',
    'Dependency injection patterns',
    'Event-driven communication',
  ],
  component: BlocCommunicationDemo,
  code: {
    demo: '',
  },
});
