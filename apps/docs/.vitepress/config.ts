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

export default defineConfig({
  title: 'BlaC',
  description:
    'A sophisticated TypeScript state management library implementing the BLoC pattern',
  base: process.env.BASE_URL || '/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Core', link: '/core/getting-started' },
      { text: 'React', link: '/react/getting-started' },
      { text: 'API Reference', link: '/api/core' },
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
          text: 'Introduction',
          items: [{ text: 'What is BlaC?', link: '/guide/introduction' }],
        },
      ],
      '/core/': [
        {
          text: 'Getting Started',
          items: [{ text: 'Quick Start', link: '/core/getting-started' }],
        },
        {
          text: 'State Containers',
          items: [{ text: 'Cubit', link: '/core/cubit' }],
        },
        {
          text: 'Configuration',
          items: [
            { text: '@blac() Decorator', link: '/core/configuration' },
            { text: 'Instance Management', link: '/core/instance-management' },
            { text: 'System Events', link: '/core/system-events' },
          ],
        },
        {
          text: 'Utilities',
          items: [
            { text: 'waitUntil', link: '/core/wait-until' },
            { text: 'watch', link: '/core/watch' },
            { text: 'tracked', link: '/core/tracked' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Global Configuration', link: '/core/global-config' },
            { text: 'Logging', link: '/core/logging' },
            { text: 'Plugins', link: '/core/plugins' },
          ],
        },
        {
          text: 'Examples',
          items: [{ text: 'Form Validation', link: '/core/form-validation' }],
        },
      ],
      '/react/': [
        {
          text: 'Getting Started',
          items: [{ text: 'Quick Start', link: '/react/getting-started' }],
        },
        {
          text: 'Hooks',
          items: [
            { text: 'useBloc', link: '/react/use-bloc' },
            { text: 'useBlocActions', link: '/react/use-bloc-actions' },
          ],
        },
        {
          text: 'Patterns',
          items: [
            { text: 'Overview', link: '/react/overview' },
            { text: 'Dependency Tracking', link: '/react/dependency-tracking' },
            { text: 'Shared vs Isolated', link: '/react/shared-vs-isolated' },
            { text: 'Bloc Communication', link: '/react/bloc-communication' },
            { text: 'Performance', link: '/react/performance' },
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
