// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkDirective from 'remark-directive';
import react from '@astrojs/react';
import { remarkCallouts } from './src/lib/remark-callouts.mjs';
import { readdirSync } from 'node:fs';
import remarkGfm from 'remark-gfm';

/*
 * WORKAROUND — content-propagated styles dropped by `astro build`.
 *
 * The workspace overrides `vite` to `@voidzero-dev/vite-plus-core` (vite 8,
 * Rolldown-based) for the vite-plus tooling, while Astro 6.4.x declares
 * `vite: ^7.3.2` (Rollup-based). Under Rolldown, the rendered module code in
 * the build no longer carries the leading `// astro-head-inject` comment from
 * Astro's `astro:content` module template. That comment is the *only* seed
 * Astro's `astro:head-metadata-build` plugin uses to mark pages as
 * head-propagation boundaries in production builds. With zero seeds, no page
 * is marked, and at render time `createHeadAndContent` silently drops every
 * stylesheet propagated through content-collection MDX:
 *
 *   - scoped <style> from .astro components imported in .mdx (Tabs, Card…)
 *   - CSS imported by React islands (demos.css via DemoFrame/RenderCounter)
 *
 * Dev is unaffected (the dev plugin reads transform-time sources, where the
 * comment still exists) — which is why `astro dev` looked fine while the
 * production build shipped unstyled demos and fallback heading fonts.
 *
 * The fix: re-seed the marking ourselves by setting
 * `meta.astro.propagation = 'self'` on the `astro:content` virtual module.
 * Astro's build plugin then marks all ancestor pages "in-tree" and its own
 * style collection + placeholder substitution work end-to-end, untouched.
 *
 * Remove once Astro officially supports the Rolldown-based vite (or the
 * workspace stops overriding vite for this app). Regression test: the built
 * homepage must contain `.blac-eyebrow` and `.blac-demo` style rules.
 */
const headPropagationSeedFix = {
  name: 'blac:head-propagation-seed-fix',
  apply: /** @type {const} */ ('build'),
  transform(/** @type {string} */ _code, /** @type {string} */ id) {
    if (id === '\0astro:content') {
      return {
        meta: {
          // Full AstroPluginMetadata shape — build plugins (plugin-analyzer)
          // iterate every module with `meta.astro` and read these arrays
          // unguarded, so a partial object crashes the build.
          astro: {
            hydratedComponents: [],
            clientOnlyComponents: [],
            serverComponents: [],
            scripts: [],
            containsHead: false,
            propagation: 'self',
            pageOptions: {},
          },
        },
      };
    }
  },
};

/** @param {any} node */
function hastText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(hastText).join('');
}

/**
 * @param {any} node
 * @param {(node: any) => void} fn
 */
function visitHast(node, fn) {
  fn(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visitHast(child, fn);
}

function rehypeTableCellLabels() {
  /** @param {any} tree */
  return (tree) => {
    visitHast(tree, (node) => {
      if (node?.type !== 'element' || node.tagName !== 'table') return;

      const thead = node.children?.find(
        /** @param {any} child */
        (child) => child?.type === 'element' && child.tagName === 'thead',
      );
      const headerRow = thead?.children?.find(
        /** @param {any} child */
        (child) => child?.type === 'element' && child.tagName === 'tr',
      );
      const headers =
        headerRow?.children
          ?.filter(
            /** @param {any} child */
            (child) => child?.type === 'element' && child.tagName === 'th',
          )
          .map(
            /** @param {any} child */
            (child) => hastText(child).replace(/\s+/g, ' ').trim(),
          )
          .filter(Boolean) ?? [];

      if (headers.length === 0) return;

      const tbodies =
        node.children?.filter(
          /** @param {any} child */
          (child) => child?.type === 'element' && child.tagName === 'tbody',
        ) ?? [];

      for (const tbody of tbodies) {
        const rows =
          tbody.children?.filter(
            /** @param {any} child */
            (child) => child?.type === 'element' && child.tagName === 'tr',
          ) ?? [];

        for (const row of rows) {
          const cells =
            row.children?.filter(
              /** @param {any} child */
              (child) => child?.type === 'element' && child.tagName === 'td',
            ) ?? [];

          cells.forEach(
            /**
             * @param {any} cell
             * @param {number} index
             */
            (cell, index) => {
              const label = headers[index];
              if (!label) return;
              cell.properties = { ...cell.properties, 'data-label': label };
            },
          );
        }
      }
    });
  };
}

// Pre-/docs URLs (`/guide/x/`, `/proposals/x/`) keep working as static redirects.
const slugsIn = (/** @type {string} */ dir) =>
  readdirSync(new URL(dir, import.meta.url))
    .filter((f) => /\.mdx?$/.test(f) && !f.startsWith('index.'))
    .map((f) => f.replace(/\.mdx?$/, ''));
const SECTIONS = [
  'guide',
  'core',
  'react',
  'plugins',
  'testing',
  'integrations',
];
const legacyRedirects = {
  '/docs': '/docs/guide/introduction/',
  '/dirtytalk': 'https://dirtytalk.42.dog/',
  '/proposals': '/rfcs/',
  ...Object.fromEntries(
    slugsIn('./src/content/rfcs/').map((s) => [
      `/proposals/${s}`,
      `/rfcs/${s}/`,
    ]),
  ),
  ...Object.fromEntries(
    SECTIONS.flatMap((section) =>
      slugsIn(`./src/content/docs/${section}/`).map((s) => [
        `/${section}/${s}`,
        `/docs/${section}/${s}/`,
      ]),
    ),
  ),
};

// https://astro.build/config
export default defineConfig({
  site: 'https://blac.42.dog',
  devToolbar: { enabled: false },
  vite: { plugins: [headPropagationSeedFix] },
  // `@astrojs/mdx` does not inherit Astro's GFM default, so list it explicitly.
  markdown: {
    remarkPlugins: [remarkGfm, remarkDirective, remarkCallouts],
    rehypePlugins: [rehypeTableCellLabels],
  },
  redirects: legacyRedirects,
  integrations: [expressiveCode(), mdx(), react(), sitemap()],
});
