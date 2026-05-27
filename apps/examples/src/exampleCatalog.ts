export interface RouteMeta {
  id: string;
  path: string;
  title: string;
  navLabel: string;
  category: string;
  badge: string;
  blurb: string;
  concepts: string[];
}

export const homeMeta: RouteMeta = {
  id: '00',
  path: '/',
  title: 'Examples Atlas',
  navLabel: 'Overview',
  category: 'Curated Tour',
  badge: 'Guide',
  blurb:
    'A guided set of BlaC demos, sequenced from tiny state containers to a full messenger workspace.',
  concepts: ['Routing', 'Pattern map', 'Performance mindset'],
};

export const exampleCatalog: RouteMeta[] = [
  {
    id: '01',
    path: '/counter',
    title: 'Counter',
    navLabel: 'Counter',
    category: 'Foundations',
    badge: 'Starter',
    blurb:
      'The quickest way to understand Cubits, tracked reads, and shared versus named instances.',
    concepts: ['Cubit', 'useBloc', 'emit / patch', 'Auto-Tracking'],
  },
  {
    id: '02',
    path: '/async',
    title: 'Async Data',
    navLabel: 'Async',
    category: 'Data Flow',
    badge: 'Starter',
    blurb:
      'Load, retry, and recover from failures while individual views re-render only when their slice changes.',
    concepts: ['Async methods', 'Retry', 'Loading state', 'Cancellation'],
  },
  {
    id: '03',
    path: '/todo',
    title: 'Todo List',
    navLabel: 'Todo',
    category: 'Lifecycle',
    badge: 'Intermediate',
    blurb:
      'A compact product surface that mixes persistence, watch-based side effects, and action-only commands.',
    concepts: ['watch()', 'Lifecycle hooks', 'Persistence', 'Action-only'],
  },
  {
    id: '04',
    path: '/form',
    title: 'Form Validation',
    navLabel: 'Form',
    category: 'Computed State',
    badge: 'Intermediate',
    blurb:
      'Parallel forms show how instance IDs and computed getters keep validation reactive without memo plumbing.',
    concepts: ['Getter tracking', 'Computed state', 'instanceId', 'Validation'],
  },
  {
    id: '05',
    path: '/dashboard',
    title: 'Dashboard',
    navLabel: 'Dashboard',
    category: 'Coordination',
    badge: 'Intermediate',
    blurb:
      'Several widgets coordinate through plugins, dependencies, and keepAlive state without turning brittle.',
    concepts: ['Plugins', 'depend()', 'keepAlive', 'Cross-bloc deps'],
  },
  {
    id: '06',
    path: '/db-persist',
    title: 'DB Persist',
    navLabel: 'DB Persist',
    category: 'Durable State',
    badge: 'Advanced',
    blurb:
      'Hydrate from IndexedDB, debounce writes, and reshape records without contaminating the core UI code.',
    concepts: ['IndexedDB', 'Hydration', 'Transforms', 'Persistence plugin'],
  },
  {
    id: '07',
    path: '/registry',
    title: 'Instance Registry',
    navLabel: 'Registry',
    category: 'Introspection',
    badge: 'Advanced',
    blurb:
      'Inspect instance creation, sharing, disposal, and plugin events with a live registry-focused demo.',
    concepts: ['Instance stats', 'Lifecycle events', 'Shared instances'],
  },
  {
    id: '08',
    path: '/tracking-lab',
    title: 'Tracking Lab',
    navLabel: 'Tracking',
    category: 'Reactivity',
    badge: 'Lab',
    blurb:
      'Probe the auto-tracking proxy with deeply nested state, array indices, getters, and null transitions — every card stays still unless its slice actually changed.',
    concepts: [
      'Auto-Tracking',
      'Array indices',
      'Nested paths',
      'Null transitions',
      'Bound methods',
      'Per-consumer tracker',
    ],
  },
  {
    id: '09',
    path: '/messenger',
    title: 'Messenger',
    navLabel: 'Messenger',
    category: 'Full App',
    badge: 'Advanced',
    blurb:
      'A multi-panel chat app that demonstrates named instances, cross-bloc coordination, and persistence at app scale.',
    concepts: [
      'Named instances',
      'acquire / borrow',
      'depend()',
      'Persistence',
    ],
  },
  {
    id: '10',
    path: '/input-pattern',
    title: 'Args · Deps · onDepsChanged',
    navLabel: 'Input Pattern',
    category: 'Input Lanes',
    badge: 'Advanced',
    blurb:
      'Reference demo for the three input lanes: args for identity-keyed instances, deps for non-serializable handles, and multi-source deps merged across consumers.',
    concepts: [
      'args identity keying',
      'static key()',
      'deps handles',
      'onDepsChanged',
      'Multi-source deps',
    ],
  },
];

export function getRouteMeta(path: string): RouteMeta {
  return exampleCatalog.find((route) => route.path === path) ?? homeMeta;
}
