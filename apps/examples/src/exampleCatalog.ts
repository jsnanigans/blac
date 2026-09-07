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
    concepts: ['Cubit', 'useBloc', 'emit / patch', 'init(args)'],
  },
  {
    id: '02',
    path: '/async',
    title: 'Async Data',
    navLabel: 'Async',
    category: 'Data Flow',
    badge: 'Starter',
    blurb:
      'Load, retry, and abort. onActivate owns the first fetch and its AbortSignal cancels whatever is in flight.',
    concepts: ['onActivate', 'AbortSignal', 'Loading state', 'Retry'],
  },
  {
    id: '03',
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
      'Per-consumer tracker',
    ],
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
    concepts: [
      'Getter tracking',
      'Computed state',
      'args identity',
      'Validation',
    ],
  },
  {
    id: '05',
    path: '/inputs',
    title: 'Args · Deps · onDepsChanged',
    navLabel: 'Inputs',
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
  {
    id: '06',
    path: '/cross-bloc',
    title: 'Cross-Bloc Tracking',
    navLabel: 'Cross-Bloc',
    category: 'Reactivity',
    badge: 'Advanced',
    blurb:
      'A live pricing engine: one receipt derives its total from three independently-owned blocs — an FX feed, the cart, and a membership tier — yet subscribes to only one. depend().track() wires the cross-bloc reactivity.',
    concepts: [
      'depend().track()',
      'Cross-bloc auto-tracking',
      'Transitive getters',
      'Conditional dependencies',
    ],
  },
  {
    id: '07',
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
    id: '08',
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
    id: '09',
    path: '/lifecycle',
    title: 'Lifecycle & watch()',
    navLabel: 'Lifecycle',
    category: 'Lifecycle',
    badge: 'Intermediate',
    blurb:
      'A todo surface wired to onActivate for restore-on-mount, watch() for outside-React persistence, and the action-only pattern.',
    concepts: ['onActivate', 'watch()', 'Action-only', 'Persistence'],
  },
  {
    id: '10',
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
    id: '11',
    path: '/messenger',
    title: 'Messenger',
    navLabel: 'Messenger',
    category: 'Full App',
    badge: 'Capstone',
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
    id: '12',
    path: '/encapsulation',
    title: 'StateContainer vs Cubit',
    navLabel: 'Encapsulation',
    category: 'Design',
    badge: 'Core',
    blurb:
      'The same account modelled twice. StateContainer keeps mutation protected so invariants hold; Cubit publishes emit/patch/update so the caller owns transitions.',
    concepts: [
      'StateContainer',
      'Protected emit/patch',
      'Invariants',
      'Choosing a base class',
    ],
  },
  {
    id: '13',
    path: '/testing',
    title: 'Testing',
    navLabel: 'Testing',
    category: 'Tooling',
    badge: 'Core',
    blurb:
      'Stub a bloc, pin its state, override a method, and scope a registry per test — the helpers that make blocs testable without React.',
    concepts: [
      'createCubitStub',
      'withBlocState',
      'blacTestSetup',
      'RegistryProvider',
    ],
  },
];

export function getRouteMeta(path: string): RouteMeta {
  return exampleCatalog.find((route) => route.path === path) ?? homeMeta;
}
