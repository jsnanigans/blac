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
          items: [{ text: 'What is BlaC?', link: '/guide/introduction' }],
        },
      ],
      '/core/': [
        {
          text: 'Essentials',
          items: [],
        },
        {
          text: 'Advanced',
          items: [],
        },
      ],
      '/react/': [
        {
          text: 'Getting Started',
          items: [{ text: 'Quick Start', link: '/react/getting-started' }],
        },
        {
          text: 'Essentials',
          items: [{ text: 'useBloc Hook', link: '/react/use-bloc' }],
        },
        {
          text: 'Patterns',
          items: [{ text: 'Overview', link: '/react/overview' }],
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
