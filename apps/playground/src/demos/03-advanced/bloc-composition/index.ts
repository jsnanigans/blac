import { DemoRegistry } from '@/core/utils/demoRegistry';
import { BlocCompositionDemo } from './BlocCompositionDemo';

DemoRegistry.register({
  id: 'bloc-composition',
  category: '03-advanced',
  title: 'Bloc Composition & Communication',
  description:
    'Learn how multiple Blocs work together, share state, and communicate through subscriptions',
  difficulty: 'advanced',
  tags: [
    'composition',
    'communication',
    'shared-state',
    'subscriptions',
    'architecture',
  ],
  concepts: [
    'Multiple Blocs in single component',
    'Shared vs isolated instances',
    'Cross-Bloc access with Blac.getBloc()',
    'Reactive subscriptions',
    'Memory management with onDispose',
    'Architectural patterns',
  ],
  component: BlocCompositionDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Multiple Blocs can communicate',
      run: () => true,
      description:
        'Verifies that Blocs can access and subscribe to other Blocs',
    },
    {
      name: 'Subscriptions are cleaned up properly',
      run: () => true,
      description: 'Verifies onDispose unsubscribes to prevent memory leaks',
    },
  ],
  relatedDemos: ['dependencies', 'keep-alive', 'instance-management'],
  prerequisites: ['counter', 'instance-management', 'keep-alive'],
  documentation: `
## Bloc Composition & Communication

Compose multiple Blocs to build complex applications with clean separation of concerns and maintainable code.

### Core Patterns:
- **Shared State Access**: Multiple components access the same Bloc instance (default)
- **Cross-Bloc Access**: One Bloc reads another's state using \`Blac.getBloc()\`
- **Reactive Subscriptions**: One Bloc subscribes to another's state changes

### Shared State Access:
\`\`\`typescript
// AuthCubit is shared by default
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ isAuthenticated: false });
  }
}

// All consumers get the same instance
const [state1] = useBloc(AuthCubit); // Instance A
const [state2] = useBloc(AuthCubit); // Same Instance A
\`\`\`

### Cross-Bloc Access:
\`\`\`typescript
class DashboardCubit extends Cubit<DashboardState> {
  loadData = async () => {
    // Access shared AuthCubit
    const authCubit = Blac.getBloc(AuthCubit, {
      throwIfNotFound: true
    });

    // Read its state
    const userName = authCubit.state.userName;
    // Load data based on auth state
  };
}
\`\`\`

### Reactive Subscriptions:
\`\`\`typescript
class NotificationCubit extends Cubit<NotificationState> {
  private authSubscription?: () => void;

  constructor() {
    super({ messages: [] });

    // Subscribe to AuthCubit changes
    const authCubit = Blac.getBloc(AuthCubit);
    if (authCubit) {
      this.authSubscription = authCubit.subscribe((state) => {
        if (state.isAuthenticated) {
          this.addMessage(\`Welcome, \${state.userName}!\`);
        }
      });
    }
  }

  onDispose = () => {
    // CRITICAL: Clean up subscription
    if (this.authSubscription) {
      this.authSubscription();
    }
  };
}
\`\`\`

### Best Practices:
- Keep Blocs focused on single responsibilities
- Use shared Blocs for global state (auth, settings)
- Use isolated Blocs for feature-specific state
- Always clean up subscriptions in onDispose
- Avoid circular dependencies between Blocs
- Handle missing Blocs gracefully with error handling

### Use Cases:
- User authentication affecting multiple features
- Global app state and configuration
- Cross-feature coordination
- Notifications and analytics
- Cache invalidation
`,
});
