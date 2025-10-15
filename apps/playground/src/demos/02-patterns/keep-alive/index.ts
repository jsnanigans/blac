import { DemoRegistry } from '@/core/utils/demoRegistry';
import { KeepAliveDemo } from './KeepAliveDemo';
// eslint-disable-next-line import/no-unused-modules

DemoRegistry.register({
  id: 'keep-alive',
  category: '02-patterns',
  title: 'KeepAlive Pattern',
  description:
    'Demonstrates the keepAlive pattern for Cubits that should persist in memory even when no components are using them. Perfect for global app state.',
  difficulty: 'intermediate',
  tags: ['cubit', 'keepAlive', 'lifecycle', 'persistence', 'global-state'],
  concepts: [
    'lifecycle management',
    'memory persistence',
    'global state',
    'instance management',
  ],
  component: KeepAliveDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'KeepAlive persists state',
      run: () => true,
      description:
        'Verifies that keepAlive Cubits maintain state when unmounted',
    },
    {
      name: 'Regular Cubits dispose',
      run: () => true,
      description: 'Verifies that regular Cubits are disposed when unmounted',
    },
  ],
  relatedDemos: ['instance-management', 'persistence'],
  prerequisites: ['counter', 'instance-management'],
  documentation: `
## KeepAlive Pattern

The keepAlive pattern ensures that certain Cubits persist in memory even when no components are actively using them.

### When to Use KeepAlive:

1. **Global App State**: User authentication, app settings, theme preferences
2. **Cached Data**: API responses that should persist across navigation
3. **Background Tasks**: Cubits managing background operations
4. **Expensive Computations**: Results that are costly to recalculate

### How It Works:

\`\`\`typescript
class GlobalStateCubit extends Cubit<State> {
  static keepAlive = true; // This is all you need!
}
\`\`\`

### Lifecycle Differences:

**Regular Cubit:**
- Created when first component mounts
- Disposed when last component unmounts
- State is lost between mount cycles

**KeepAlive Cubit:**
- Created when first component mounts
- Persists even when all components unmount
- State is preserved across mount cycles
- Only disposed when explicitly cleared or app terminates

### Best Practices:

- Use sparingly - only for truly global state
- Consider memory implications for large state objects
- Combine with persistence plugins for app restart survival
- Clear keepAlive Cubits when user logs out or resets app
`,
});
