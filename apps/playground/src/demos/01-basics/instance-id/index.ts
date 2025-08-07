import { DemoRegistry } from '@/core/utils/demoRegistry';
import { InstanceIdDemo, instanceIdCode } from './InstanceIdDemo';

DemoRegistry.register({
  id: 'instance-id',
  category: '01-basics',
  title: 'InstanceId Explained',
  description:
    'Visual demonstration of how instanceId creates separate Cubit instances vs shared instances.',
  difficulty: 'beginner',
  tags: ['instanceId', 'instances', 'shared', 'isolation'],
  concepts: ['instance management', 'instance lifecycle', 'shared vs unique'],
  component: InstanceIdDemo,
  code: {
    demo: instanceIdCode.usage,
    bloc: instanceIdCode.bloc,
  },
  tests: [
    {
      name: 'Shared instances sync',
      run: () => true,
      description: 'Components without instanceId share state',
    },
    {
      name: 'Unique instances are independent',
      run: () => true,
      description: 'Different instanceIds create separate instances',
    },
  ],
  relatedDemos: ['isolated-counter', 'props'],
  prerequisites: ['counter'],
  documentation: `
## Understanding InstanceId

InstanceId is a powerful feature that controls instance creation and sharing in BlaC.

### Default Behavior (No InstanceId)
- All components using the same Cubit class share ONE instance
- State changes affect all components
- Perfect for global state (auth, settings)

### With InstanceId
- Components with the SAME instanceId share that instance
- Components with DIFFERENT instanceIds get separate instances
- Perfect for user-specific or context-specific state

### Common Patterns:

\`\`\`typescript
// User-specific state
instanceId: \`user-\${userId}\`

// Form instances
instanceId: \`form-\${formId}\`

// Chat rooms
instanceId: \`room-\${roomId}\`

// Shopping carts
instanceId: \`cart-\${sessionId}\`
\`\`\`

### InstanceId vs Static Isolated:

| Feature | InstanceId | Static Isolated |
|---------|-----------|-----------------|
| Flexibility | Dynamic | Fixed |
| Sharing | Can share with same ID | Never shares |
| Use Case | Runtime determination | Always separate |

### Best Practices:
- Use meaningful IDs that reflect the data context
- Clean up instances when no longer needed
- Consider memory usage with many instances
- Use static isolated for simpler cases
`,
});
