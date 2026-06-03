// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import ts from 'typescript';
import pluginTwoslash from 'expressive-code-twoslash';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — drives sitemap + absolute URLs. Update to the real
  // production domain when the Cloudflare Pages project is set up.
  site: 'https://blac-docs.pages.dev',
  // GFM (tables, strikethrough, autolinks) renders in `.md` via Astro's
  // built-in default, but `@astrojs/mdx` does NOT inherit that default — so
  // tables in `.mdx` pages silently render as literal `| … |` text. Listing
  // remark-gfm here as an explicit user plugin makes it run for BOTH `.md` and
  // `.mdx` (mdx extends `markdown.remarkPlugins`), restoring tables in the
  // interactive demo pages that were converted `.md` → `.mdx`.
  markdown: {
    remarkPlugins: [remarkGfm],
  },
  integrations: [
    // React renderer for the interactive demo islands under
    // src/components/demos/. Islands import real workspace `@blac/react` and
    // hydrate lazily (`client:visible`) — see that dir's README for the
    // embedding contract. `.mdx` component support comes from the
    // `@astrojs/mdx` integration Starlight already bundles.
    react(),
    starlight({
      title: 'BlaC',
      description:
        'Type-safe state management for React with automatic re-render optimization',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'BlaC',
        // Hide the redundant wordmark next to the logo; the title supplies it.
        replacesTitle: false,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/jsnanigans/blac',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/jsnanigans/blac/edit/main/apps/web-docs/',
      },
      // Preload the two normal-style woff2s so the browser fetches them
      // before CSS parse discovers the @font-face rules — shrinks the
      // font-display:swap window (the metric-matched fallbacks in fonts.css
      // make whatever window remains shift-free). Italics are not preloaded:
      // rarely above the fold, not worth blocking bandwidth for.
      // `crossorigin` is required for font preloads even same-origin.
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/fonts/hanken-grotesk-latin-wght-normal.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/fonts/fraunces-latin-opsz-normal.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous',
          },
        },
      ],
      components: {
        PageTitle: './src/components/overrides/PageTitle.astro',
        Footer: './src/components/overrides/Footer.astro',
        // T4.1: the flagship landing set-piece — replaces the stock splash
        // hero with the two-plate overprint wordmark (see the file's header).
        Hero: './src/components/overrides/Hero.astro',
      },
      customCss: [
        // Load order per midnight-risograph conventions:
        //   fonts.css  (T1.2 — @font-face declarations, must come first)
        //   tokens.css (T1.1 / T1.2 — colors + font token names + type scale)
        //   riso.css   (T2.1 — print primitives)
        //   chrome.css (T3.1 — Starlight chrome polish)
        // theme.css deleted (T5.3): all rules were either dead (`.hero h1` gradient
        // wordmark — superseded by Hero.astro's .blac-hero class, which deliberately
        // avoids `.hero`), or fully migrated into chrome.css (card hover, topic-
        // dropdown font-weight, `.hero .tagline` max-width now owned by
        // .blac-hero__tagline in Hero.astro).
        './src/styles/fonts.css',
        './src/styles/tokens.css',
        './src/styles/riso.css',
        './src/styles/chrome.css',
      ],

      // Code highlighting = Expressive Code (Shiki at build time, zero client
      // JS for the highlight itself), theme-synced to light/dark. Twoslash adds
      // type-on-hover + build-time type-checking: a broken ```ts twoslash``
      // snippet fails the build, exactly like the old VitePress site.
      expressiveCode: {
        // Keep Starlight's theme-synced defaults; just soften the frame.
        styleOverrides: {
          borderRadius: '0.5rem',
          frames: {
            shadowColor: 'transparent',
          },
        },
        // The `any` cast bridges a harmless type-only version skew: pnpm
        // resolves expressive-code-twoslash's `@expressive-code/core` peer to
        // 0.42 (via its own deps) while Starlight runs EC 0.41.7. The plugin
        // API is identical across that range, so the runtime is correct — only
        // the two `ExpressiveCodePlugin` *types* differ. Remove the cast once
        // the plugin's peer lands on the same EC line Starlight ships.
        plugins: [
          /** @type {any} */ (
            pluginTwoslash({
              // explicitTrigger defaults to true → only fences tagged
              // `twoslash` are processed (plain ```ts`` blocks stay fast and
              // unchecked), which is exactly what our migrated snippets rely on.
              twoslashOptions: {
                compilerOptions: {
                  jsx: ts.JsxEmit.ReactJSX,
                  jsxImportSource: 'react',
                  module: ts.ModuleKind.ESNext,
                  target: ts.ScriptTarget.ESNext,
                  moduleResolution: ts.ModuleResolutionKind.Bundler,
                  strict: true,
                  esModuleInterop: true,
                  allowSyntheticDefaultImports: true,
                  skipLibCheck: true,
                  lib: [
                    'lib.dom.d.ts',
                    'lib.dom.iterable.d.ts',
                    'lib.esnext.d.ts',
                  ],
                },
              },
            })
          ),
        ],
      },
      // Each "topic" is a package/umbrella with its own swappable sidebar,
      // selected from a dropdown in the top-left. Adding a package later =
      // append a topic here + author its pages under src/content/docs/<id>/.
      plugins: [
        starlightSidebarTopics([
          {
            label: 'blac',
            link: '/guide/introduction/',
            icon: 'open-book',
            // The umbrella: the learn-it narrative, recipes, reference aids, and
            // the cross-cutting Testing / Integrations / first-party Plugins.
            items: [
              {
                label: 'Getting Started',
                items: [
                  { label: 'What is BlaC?', link: '/guide/introduction/' },
                  { label: 'Quick Start', link: '/guide/getting-started/' },
                  {
                    label: 'Tutorial: Todo → time-travel',
                    link: '/guide/tutorial/',
                  },
                  { label: 'Core Concepts', link: '/guide/concepts/' },
                  { label: 'Mental Model', link: '/guide/mental-model/' },
                  { label: 'Passing Inputs', link: '/guide/inputs/' },
                ],
              },
              {
                label: 'Examples',
                items: [
                  { label: 'Playground', link: '/playground/' },
                  { label: 'Showcase', link: '/showcase/' },
                ],
              },
              {
                label: 'Going Deeper',
                items: [
                  {
                    label: 'How BlaC Works Internally',
                    link: '/guide/internals/',
                  },
                  { label: 'Async', link: '/guide/async/' },
                  { label: 'TypeScript', link: '/guide/typescript/' },
                  { label: 'Patterns & Recipes', link: '/guide/patterns/' },
                  { label: 'Best Practices', link: '/guide/best-practices/' },
                ],
              },
              {
                label: 'Recipes',
                collapsed: true,
                items: [
                  { label: 'Debounce', link: '/guide/recipes/debounce/' },
                  {
                    label: 'Form Validation',
                    link: '/guide/recipes/form-validation/',
                  },
                  {
                    label: 'Optimistic Update',
                    link: '/guide/recipes/optimistic-update/',
                  },
                  { label: 'Pagination', link: '/guide/recipes/pagination/' },
                  {
                    label: 'Reset to Initial State',
                    link: '/guide/recipes/reset-to-initial/',
                  },
                  { label: 'Undo / Redo', link: '/guide/recipes/undo-redo/' },
                  {
                    label: 'WebSocket Subscription',
                    link: '/guide/recipes/websocket/',
                  },
                ],
              },
              {
                label: 'Coming from…',
                collapsed: true,
                items: [
                  {
                    label: 'Flutter Bloc',
                    link: '/guide/coming-from-flutter-bloc/',
                  },
                  { label: 'Zustand', link: '/guide/coming-from-zustand/' },
                  { label: 'Redux', link: '/guide/coming-from-redux/' },
                ],
              },
              {
                label: 'Reference Aids',
                collapsed: true,
                items: [
                  { label: 'Comparison', link: '/guide/comparison/' },
                  {
                    label: 'Troubleshooting & FAQ',
                    link: '/guide/troubleshooting/',
                  },
                  { label: 'Glossary', link: '/guide/glossary/' },
                  {
                    label: 'Migrating from v1',
                    link: '/guide/migration-from-v1/',
                  },
                  {
                    label: 'Versioning & Stability',
                    link: '/guide/versioning/',
                  },
                ],
              },
              {
                label: 'Testing',
                collapsed: true,
                items: [
                  { label: 'Overview', link: '/testing/overview/' },
                  { label: 'Core Testing API', link: '/testing/core/' },
                  { label: 'React Testing', link: '/testing/react/' },
                ],
              },
              {
                label: 'Integrations',
                collapsed: true,
                items: [
                  {
                    label: 'SSR & per-request isolation',
                    link: '/integrations/ssr/',
                  },
                  { label: 'Next.js', link: '/integrations/nextjs/' },
                  { label: 'Remix', link: '/integrations/remix/' },
                  {
                    label: 'React Native',
                    link: '/integrations/react-native/',
                  },
                  {
                    label: 'Using BlaC outside React',
                    link: '/integrations/outside-react/',
                  },
                ],
              },
              {
                label: 'Plugins',
                collapsed: true,
                // Each plugin can grow into its own multi-page sub-group later.
                items: [
                  { label: 'Overview', link: '/plugins/overview/' },
                  { label: 'Logging', link: '/plugins/logging/' },
                  { label: 'DevTools', link: '/plugins/devtools/' },
                  { label: 'Persistence', link: '/plugins/persistence/' },
                  { label: 'Plugin Recipes', link: '/plugins/recipes/' },
                ],
              },
            ],
          },
          {
            label: 'blac-core',
            link: '/core/cubit/',
            icon: 'seti:typescript',
            items: [
              {
                label: 'Reference',
                items: [
                  { label: 'Cubit', link: '/core/cubit/' },
                  { label: 'Tracking', link: '/core/tracked/' },
                  { label: 'Configuration', link: '/core/configuration/' },
                  {
                    label: 'Instance Management',
                    link: '/core/instance-management/',
                  },
                  { label: 'System Events', link: '/core/system-events/' },
                  {
                    label: 'Bloc Communication',
                    link: '/core/bloc-communication/',
                  },
                  { label: 'watch', link: '/core/watch/' },
                  { label: 'Low-level subscribe', link: '/core/subscribe/' },
                  { label: 'Authoring Plugins', link: '/core/plugins/' },
                  { label: 'Types', link: '/core/types/' },
                ],
              },
            ],
          },
          {
            label: 'blac-react',
            link: '/react/getting-started/',
            icon: 'seti:react',
            items: [
              {
                label: 'Reference',
                items: [
                  { label: 'Getting Started', link: '/react/getting-started/' },
                  { label: 'useBloc', link: '/react/use-bloc/' },
                  {
                    label: 'Dependency Tracking',
                    link: '/react/dependency-tracking/',
                  },
                  { label: 'Performance', link: '/react/performance/' },
                  { label: 'Preact', link: '/react/preact/' },
                ],
              },
            ],
          },
          {
            label: 'dirtytalk',
            link: '/dirtytalk/',
            icon: 'puzzle',
            // dirtytalk is itself an umbrella over engine / spatial / structural.
            items: [
              { label: 'Overview', link: '/dirtytalk/' },
              {
                label: 'Engine',
                items: [
                  {
                    label: 'Getting Started',
                    link: '/dirtytalk/engine/getting-started/',
                  },
                  { label: 'Concepts', link: '/dirtytalk/engine/concepts/' },
                  {
                    label: 'API Reference',
                    link: '/dirtytalk/engine/api-reference/',
                  },
                ],
              },
              {
                label: 'Spatial',
                items: [
                  {
                    label: 'Getting Started',
                    link: '/dirtytalk/spatial/getting-started/',
                  },
                  { label: 'Concepts', link: '/dirtytalk/spatial/concepts/' },
                  {
                    label: 'API Reference',
                    link: '/dirtytalk/spatial/api-reference/',
                  },
                ],
              },
              {
                label: 'Structural',
                items: [
                  {
                    label: 'Getting Started',
                    link: '/dirtytalk/structural/getting-started/',
                  },
                  {
                    label: 'Concepts',
                    link: '/dirtytalk/structural/concepts/',
                  },
                  {
                    label: 'API Reference',
                    link: '/dirtytalk/structural/api-reference/',
                  },
                ],
              },
            ],
          },
        ]),
      ],
    }),
  ],
});
