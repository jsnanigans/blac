import { DemoRegistry } from '@/core/utils/demoRegistry';
import { StreamDemo } from './StreamDemo';
// eslint-disable-next-line import/no-unused-modules

DemoRegistry.register({
  id: 'stream-api',
  category: '03-advanced',
  title: 'Stream API & Observables',
  description:
    'Demonstrates how BlaC Cubits can act as observables, streaming state changes to multiple subscribers in real-time.',
  difficulty: 'advanced',
  tags: ['stream', 'observable', 'real-time', 'subscription'],
  concepts: [
    'observable pattern',
    'streaming data',
    'real-time updates',
    'pub-sub pattern',
  ],
  component: StreamDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'Stream delivers to all subscribers',
      run: () => true,
      description: 'Verifies all subscribers receive stream updates',
    },
  ],
  relatedDemos: ['async-operations', 'keep-alive'],
  prerequisites: ['counter', 'async-operations'],
  documentation: `
## Stream API & Observable Pattern

BlaC Cubits naturally work as observables, making them perfect for streaming data scenarios.

### Use Cases:

1. **Real-time Data**: WebSocket messages, server-sent events
2. **Live Updates**: Stock prices, chat messages, notifications
3. **Progress Tracking**: File uploads, long-running operations
4. **Sensor Data**: IoT devices, monitoring systems

### Key Features:

- Multiple subscribers to single source
- Dynamic subscription/unsubscription
- Automatic state synchronization
- Memory-efficient with automatic cleanup

### Best Practices:

- Clean up streams on component unmount
- Limit message buffer size for memory efficiency
- Use selectors to filter stream data
- Consider throttling/debouncing for high-frequency updates
`,
});
