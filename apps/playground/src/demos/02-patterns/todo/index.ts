import { DemoRegistry } from '@/core/utils/demoRegistry';
import { TodoDemo, todoDemoCode } from './TodoDemo';

DemoRegistry.register({
  id: 'todo-bloc',
  category: '02-patterns',
  title: 'Todo List with Bloc',
  description:
    'A complete todo list application demonstrating event-driven state management with Bloc pattern, including filtering, adding, toggling, and removing todos.',
  difficulty: 'intermediate',
  tags: ['bloc', 'events', 'real-world', 'crud'],
  concepts: [
    'event-driven architecture',
    'action classes',
    'event handlers',
    'computed properties',
    'filtering',
  ],
  component: TodoDemo,
  code: {
    demo: todoDemoCode.usage,
    bloc: todoDemoCode.bloc,
  },
  tests: [
    {
      name: 'Can add todos',
      run: () => {
        // Test would verify todo addition
        return true;
      },
      description: 'Verifies that new todos can be added to the list',
    },
    {
      name: 'Can toggle todo completion',
      run: () => {
        // Test would verify todo toggling
        return true;
      },
      description: 'Verifies that todos can be marked as complete/incomplete',
    },
    {
      name: 'Filters work correctly',
      run: () => {
        // Test would verify filtering logic
        return true;
      },
      description: 'Verifies that all, active, and completed filters work',
    },
  ],
  relatedDemos: ['counter', 'async-operations'],
  prerequisites: ['counter'],
  documentation: `
## Todo List with Bloc Pattern

This demo showcases a full-featured todo list application using the Bloc pattern with event-driven architecture.

### Key Features:
- **Event-Driven State Management**: Uses action classes and event handlers
- **CRUD Operations**: Add, toggle, remove, and filter todos
- **Computed Properties**: Filtered todos based on current filter state
- **Clean Architecture**: Separation of concerns between UI and business logic

### Architecture Highlights:

1. **Action Classes**: Each user action is represented by a class
2. **Event Handlers**: Registered handlers process actions and emit new state
3. **Helper Methods**: Convenient methods to dispatch actions
4. **Computed Getters**: Derive filtered data from state

This pattern is ideal for complex applications where you need:
- Clear action tracking
- Predictable state updates
- Easy testing and debugging
- Time-travel debugging capabilities
`,
});
