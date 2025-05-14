import { defineConfig } from 'vitepress';
import { withMermaid } from "vitepress-plugin-mermaid";


// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: "Blac Documentation",
  description: "Lightweight, flexible state management for React applications with predictable data flow",
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Learn', link: '/learn/introduction' },
      { text: 'Reference', link: '/reference/core-classes' },
      { text: 'Examples', link: '/examples/counter' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Introduction', link: '/learn/introduction' },
          { text: 'Getting Started', link: '/learn/getting-started' },
          { text: 'Architecture', link: '/learn/architecture' },
          { text: 'Core Concepts', link: '/learn/core-concepts' }
        ]
      },
      {
        text: 'Basic Usage',
        items: [
          { text: 'The Blac Pattern', link: '/learn/blac-pattern' },
          { text: 'State Management Patterns', link: '/learn/state-management-patterns' },
          { text: 'Best Practices', link: '/learn/best-practices' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Core Classes', link: '/api/core-classes' },
          { text: 'React Hooks', link: '/api/react-hooks' },
          { text: 'Key Methods', link: '/api/key-methods' }
        ]
      },
      // {
      //   text: 'Examples',
      //   items: [
      //   ]
      // }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jsnanigans/blac' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present Blac Contributors'
    },

  },

  mermaidPlugin: {
    class: "mermaid my-class", // set additional css classes for parent container 
  },
}))
