import { defineConfig } from 'vitepress';
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
const siteConfig = defineConfig({
  title: "BlaC",
  description: "Business Logic as Components - Simple, powerful state management that separates business logic from UI. Type-safe, testable, and scales with your React application.",
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#61dafb' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'BlaC' }],
    ['meta', { name: 'og:image', content: '/logo.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: '/logo.svg' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'BlaC',
    
    nav: [
      { text: 'Guide', link: '/introduction' },
      { text: 'API', link: '/api/core/blac' },
      { text: 'GitHub', link: 'https://github.com/jsnanigans/blac' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is BlaC?', link: '/introduction' }
        ]
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Your First Cubit', link: '/getting-started/first-cubit' },
          { text: 'Async Operations', link: '/getting-started/async-operations' },
          { text: 'Your First Bloc', link: '/getting-started/first-bloc' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'State Management', link: '/concepts/state-management' },
          { text: 'Cubits', link: '/concepts/cubits' },
          { text: 'Blocs', link: '/concepts/blocs' },
          { text: 'Instance Management', link: '/concepts/instance-management' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          {
            text: '@blac/core',
            collapsed: false,
            items: [
              { text: 'Blac', link: '/api/core/blac' },
              { text: 'Cubit', link: '/api/core/cubit' },
              { text: 'Bloc', link: '/api/core/bloc' },
              { text: 'BlocBase', link: '/api/core/bloc-base' }
            ]
          },
          {
            text: '@blac/react',
            collapsed: false,
            items: [
              { text: 'useBloc', link: '/api/react/use-bloc' },
              { text: 'useValue', link: '/api/react/use-value' },
              { text: 'createBloc', link: '/api/react/create-bloc' }
            ]
          }
        ]
      },
      {
        text: 'React Integration',
        items: [
          { text: 'Hooks', link: '/react/hooks' },
          { text: 'Patterns', link: '/react/patterns' }
        ]
      },
      {
        text: 'Patterns & Recipes',
        collapsed: true,
        items: [
          { text: 'Testing', link: '/patterns/testing' },
          { text: 'Persistence', link: '/patterns/persistence' },
          { text: 'Error Handling', link: '/patterns/error-handling' },
          { text: 'Performance', link: '/patterns/performance' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Counter', link: '/examples/counter' },
          { text: 'Todo List', link: '/examples/todo' },
          { text: 'Authentication', link: '/examples/auth' },
          { text: 'Shopping Cart', link: '/examples/cart' }
        ]
      },
      {
        text: 'Legacy',
        collapsed: true,
        items: [
          { text: 'Old Introduction', link: '/learn/introduction' },
          { text: 'Old Getting Started', link: '/learn/getting-started' },
          { text: 'Old Architecture', link: '/learn/architecture' },
          { text: 'Old Core Concepts', link: '/learn/core-concepts' },
          { text: 'The Blac Pattern', link: '/learn/blac-pattern' },
          { text: 'State Management Patterns', link: '/learn/state-management-patterns' },
          { text: 'Best Practices', link: '/learn/best-practices' },
          { text: 'Old Core Classes', link: '/api/core-classes' },
          { text: 'Old React Hooks', link: '/api/react-hooks' },
          { text: 'Key Methods', link: '/api/key-methods' },
          { text: 'Configuration', link: '/api/configuration' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jsnanigans/blac' }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present BlaC Contributors'
    },
    
    editLink: {
      pattern: 'https://github.com/jsnanigans/blac/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },
  
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
});

export default withMermaid({
  ...siteConfig,
  
  // Mermaid configuration
  mermaid: {
    theme: 'base',
    themeVariables: {
      // Clean, minimal theme
      primaryColor: '#61dafb',
      primaryTextColor: '#fff',
      primaryBorderColor: '#4db8d5',
      lineColor: '#5e6c84',
      secondaryColor: '#f4f5f7',
      tertiaryColor: '#e3e4e6',
      background: '#ffffff',
      mainBkg: '#61dafb',
      secondBkg: '#f4f5f7',
      tertiaryBkg: '#e3e4e6',
      primaryBorderColor: '#4db8d5',
      secondaryBorderColor: '#c1c7d0',
      tertiaryBorderColor: '#d3d5d9',
      primaryTextColor: '#ffffff',
      secondaryTextColor: '#172b4d',
      tertiaryTextColor: '#42526e',
      lineColor: '#5e6c84',
      textColor: '#172b4d',
      mainContrastColor: '#172b4d',
      darkTextColor: '#172b4d',
      border1: '#4db8d5',
      border2: '#c1c7d0',
      arrowheadColor: '#5e6c84',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: '16px',
      labelBackground: '#f4f5f7',
      nodeBkg: '#61dafb',
      nodeBorder: '#4db8d5',
      clusterBkg: '#f4f5f7',
      clusterBorder: '#c1c7d0',
      defaultLinkColor: '#5e6c84',
      titleColor: '#172b4d',
      edgeLabelBackground: '#ffffff',
      actorBorder: '#4db8d5',
      actorBkg: '#61dafb',
      actorTextColor: '#ffffff',
      actorLineColor: '#5e6c84',
      signalColor: '#172b4d',
      signalTextColor: '#172b4d',
      labelBoxBkgColor: '#61dafb',
      labelBoxBorderColor: '#4db8d5',
      labelTextColor: '#ffffff',
      loopTextColor: '#172b4d',
      noteBorderColor: '#c1c7d0',
      noteBkgColor: '#fff8dc',
      noteTextColor: '#172b4d',
      activationBorderColor: '#172b4d',
      activationBkgColor: '#f4f5f7',
      sequenceNumberColor: '#ffffff'
    }
  },
  
  mermaidPlugin: {
    class: "mermaid"
  }
});