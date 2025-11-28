import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'BlaC',
  description:
    'A sophisticated TypeScript state management library implementing the BLoC pattern',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Core', link: '/core/getting-started' },
      { text: 'React', link: '/react/getting-started' },
      { text: 'API Reference', link: '/api/core' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is BlaC?', link: '/guide/introduction' },
            { text: 'Why BlaC?', link: '/guide/why-blac' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Installation', link: '/guide/installation' },
          ],
        },
      ],
      '/core/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/core/getting-started' },
            { text: 'Configuration', link: '/core/configuration' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'Cubit', link: '/core/cubit' },
            { text: 'Bloc', link: '/core/bloc' },
            { text: 'State Management', link: '/core/state-management' },
            { text: 'Events', link: '/core/events' },
            { text: 'Lifecycle', link: '/core/lifecycle' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Dependency Tracking', link: '/core/dependency-tracking' },
            { text: 'Instance Management', link: '/core/instance-management' },
            { text: 'Plugin System', link: '/core/plugins' },
            { text: 'Logging', link: '/core/logging' },
          ],
        },
      ],
      '/react/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/react/getting-started' },
            { text: 'Installation', link: '/react/installation' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'useBloc Hook', link: '/react/use-bloc' },
            { text: 'Selectors', link: '/react/selectors' },
            { text: 'Lifecycle Callbacks', link: '/react/lifecycle' },
          ],
        },
        {
          text: 'Patterns',
          items: [
            { text: 'Shared State', link: '/react/shared-state' },
            { text: 'Isolated Instances', link: '/react/isolated-instances' },
            { text: 'Props-Based Blocs', link: '/react/props-based-blocs' },
            { text: 'Performance Optimization', link: '/react/performance' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'React 18 Features', link: '/react/react-18' },
            { text: 'Adapter Pattern', link: '/react/adapter-pattern' },
            { text: 'Memory Management', link: '/react/memory-management' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            {
              text: '@blac/core',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/api/core' },
                { text: 'Registry', link: '/api/core/registry' },
                { text: 'Plugins', link: '/api/core/plugins' },
                { text: 'Framework Adapter', link: '/api/core/adapter' },
                { text: 'Logging', link: '/api/core/logging' },
                { text: 'Utilities', link: '/api/core/utilities' },
              ],
            },
            { text: '@blac/react', link: '/api/react' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername/blac' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025',
    },
  },
});
