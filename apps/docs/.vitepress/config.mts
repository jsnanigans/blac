import { defineConfig } from 'vitepress';
import { withMermaid } from "vitepress-plugin-mermaid";


// https://vitepress.dev/reference/site-config
const siteConfig = defineConfig({
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
          { text: 'Core Concepts', link: '/learn/core-concepts' },
          { text: 'Agent Instructions', link: '/agent_instructions' }
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
          { text: 'Key Methods', link: '/api/key-methods' },
          { text: 'Configuration', link: '/api/configuration' }
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
  // The mermaidPlugin block that was previously here has been removed
  // and is now handled by the withMermaid wrapper.
});

export default withMermaid({
  ...siteConfig, // Spread the base VitePress configuration

  // MermaidConfig - for mermaid.js core options
  mermaid: {
    // refer https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults for options
    // Add future Mermaid core configurations here (e.g., theme, securityLevel)
    theme: 'base', // We use 'base' and override variables for a custom neon look
    themeVariables: {
      // --- Core Colors for Neon Look ---
      primaryColor: '#00BFFF',        // DeepSkyBlue (Vibrant Blue for main nodes)
      primaryTextColor: '#FFFFFF',    // White text on nodes
      primaryBorderColor: '#FF00FF',  // Neon Magenta (for borders, "cute" pop)

      lineColor: '#39FF14',           // Neon Green (for arrows, connectors)
      textColor: '#E0E0E0',           // Light Grey for general text/labels

      // --- Backgrounds ---
      mainBkg: '#1A1A1A',             // Very Dark Grey (to make neons pop)
      clusterBkg: '#242424',          // Dark Grey Soft (for subgraphs)
      clusterBorderColor: '#00BFFF',  // DeepSkyBlue border for clusters

      // --- Node specific (if not covered by primary) ---
      // These often inherit from primary, but can be set explicitly
      nodeBorder: '#FF00FF',          // Consistent with primaryBorderColor (Neon Magenta)
      nodeTextColor: '#FFFFFF',       // Consistent with primaryTextColor (White)

      // --- Accents & Special Elements: "Cute Neon" Notes ---
      noteBkgColor: '#2c003e',        // Deep Dark Magenta/Purple base for notes
      noteTextColor: '#FFFFA0',       // Neon Pale Yellow text on notes (cute & readable)
      noteBorderColor: '#FF00AA',     // Bright Neon Pink border for notes

      // --- For Sequence Diagrams (Neon) ---
      actorBkg: '#39FF14',            // Neon Green for actor boxes
      actorBorder: '#2E8B57',         // SeaGreen (darker green border for actors for definition)
      actorTextColor: '#000000',      // Black text on Neon Green actors for contrast

      signalColor: '#FF00FF',         // Neon Magenta for signal lines
      signalTextColor: '#FFFFFF',     // White text on signal lines

      labelBoxBkgColor: '#BF00FF',    // Electric Purple for label boxes (like 'loop', 'alt')
      labelTextColor: '#FFFFFF',      // White text on label boxes

      sequenceNumberColor: '#FFFFFF', // White for sequence numbers for visibility on dark lanes

      // --- Fonts - aligning with common VitePress/modern web defaults ---
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      fontSize: '22px',               // Standard readable size
    }
  },

  // MermaidPluginConfig - for the vitepress-plugin-mermaid itself
  mermaidPlugin: {
    class: "mermaid my-class", // existing setting: set additional css classes for parent container
    // Add other vitepress-plugin-mermaid specific options here if needed
  },
});
