export interface NavSection {
  label: string;
  /** Reference page ids: the path under `src/content/docs` without extension. */
  pages: string[];
}

export const DOCS_NAV: NavSection[] = [
  {
    label: 'Start',
    pages: [
      'guide/introduction',
      'guide/philosophy',
      'guide/getting-started',
      'guide/concepts',
      'guide/inputs',
      'guide/tutorial',
    ],
  },
  {
    label: 'Core',
    pages: [
      'core/cubit',
      'core/tracked',
      'core/instance-management',
      'core/bloc-communication',
      'core/watch',
      'core/subscribe',
      'core/system-events',
      'core/configuration',
      'core/types',
    ],
  },
  {
    label: 'React',
    pages: [
      'react/getting-started',
      'react/use-bloc',
      'react/dependency-tracking',
      'react/performance',
    ],
  },
  { label: 'Async', pages: ['guide/async', 'guide/async-resources'] },
  {
    label: 'Plugins',
    pages: [
      'plugins/overview',
      'plugins/devtools',
      'plugins/persistence',
      'plugins/logging',
      'plugins/recipes',
      'core/plugins',
    ],
  },
  {
    label: 'Testing',
    pages: ['testing/overview', 'testing/core', 'testing/react'],
  },
  {
    label: 'Integrations',
    pages: ['integrations/ssr', 'integrations/outside-react'],
  },
  {
    label: 'Going deeper',
    pages: [
      'guide/mental-model',
      'guide/typescript',
      'guide/troubleshooting',
      'guide/internals',
    ],
  },
];

export const NAV_ORDER = DOCS_NAV.flatMap((s) => s.pages);

export const docHref = (id: string) => `/docs/${id}/`;

export const GITHUB = 'https://github.com/jsnanigans/blac';
