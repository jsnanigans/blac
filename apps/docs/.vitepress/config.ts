import { defineConfig } from 'vitepress';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../packages/blac-core/package.json'),
    'utf-8',
  ),
);
const version = pkg.version;

const referenceSidebar = [
  {
    text: 'Core',
    items: [
      { text: 'Cubit', link: '/core/cubit' },
      { text: 'Configuration', link: '/core/configuration' },
      { text: 'Instance Management', link: '/core/instance-management' },
      { text: 'System Events', link: '/core/system-events' },
      { text: 'Bloc Communication', link: '/core/bloc-communication' },
      { text: 'watch', link: '/core/watch' },
      { text: 'tracked', link: '/core/tracked' },
      { text: 'Plugin Authoring', link: '/core/plugins' },
    ],
  },
  {
    text: 'React',
    items: [
      { text: 'Getting Started', link: '/react/getting-started' },
      { text: 'useBloc', link: '/react/use-bloc' },
      { text: 'Dependency Tracking', link: '/react/dependency-tracking' },
      { text: 'Performance', link: '/react/performance' },
      { text: 'Preact', link: '/react/preact' },
    ],
  },
];

export default defineConfig({
  title: 'BlaC',
  description:
    'Type-safe state management for React with automatic re-render optimization',
  base: process.env.BASE_URL || '/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/core/cubit' },
      { text: 'Plugins', link: '/plugins/overview' },
      { text: 'API', link: '/api/core' },
      {
        text: `v${version}`,
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@blac/core' },
          {
            text: 'GitHub Releases',
            link: 'https://github.com/jsnanigans/blac/releases',
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is BlaC?', link: '/guide/introduction' },
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' },
            { text: 'Patterns & Recipes', link: '/guide/patterns' },
          ],
        },
      ],
      '/core/': referenceSidebar,
      '/react/': referenceSidebar,
      '/plugins/': [
        {
          text: 'Plugins',
          items: [
            { text: 'Overview', link: '/plugins/overview' },
            { text: 'Logging', link: '/plugins/logging' },
            { text: 'DevTools', link: '/plugins/devtools' },
            { text: 'Persistence', link: '/plugins/persistence' },
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
                { text: 'Utilities', link: '/api/core/utilities' },
              ],
            },
            { text: '@blac/react', link: '/api/react' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jsnanigans/blac' },
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
