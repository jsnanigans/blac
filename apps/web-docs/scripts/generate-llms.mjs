#!/usr/bin/env node
/*
 * Generate llms.txt + llms-full.txt + per-package full-text files from the docs.
 *
 * These are the AI/LLM discovery artifacts the old VitePress site shipped as
 * hand-maintained statics in public/. There was no generator — so they drifted
 * from the content. Here we derive them from `src/content/docs` at build time
 * instead, so they can never go stale:
 *
 *   - public/llms.txt        curated index: one linked, described entry per
 *                            page, grouped by section, with discovery links to
 *                            the per-package full-text files below. Built from
 *                            each page's frontmatter `title` + `description`.
 *   - public/llms-full.txt   the whole corpus in one file (every page's body).
 *   - public/llms-<group>.txt one full-text file PER PACKAGE (see GROUPS), so an
 *                            LLM can be pointed at just the relevant package's
 *                            docs instead of the whole site.
 *
 * Run standalone (`node scripts/generate-llms.mjs`) or via the strict build
 * wrapper (check-snippets.mjs runs it before `astro build`). Writes into
 * public/, which Astro copies verbatim into dist/, so the files are served at
 * /llms.txt, /llms-full.txt, /llms-<group>.txt.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = path.join(ROOT, 'src/content/docs');
const PUBLIC_DIR = path.join(ROOT, 'public');

const SITE_TITLE = 'BlaC Documentation';
const SITE_BLURB =
  'Type-safe state management for React with automatic re-render optimization. ' +
  'Comprehensive guide covering core concepts, React integration, plugins, ' +
  'testing, and framework integrations.';

// Section order + human labels for the llms.txt INDEX, keyed by the first path
// segment. `__root__` catches root-level pages (showcase / playground). The
// home page (`/`) is excluded from the index lists.
const SECTIONS = [
  { key: 'guide', label: 'Guide' },
  { key: 'core', label: 'Core' },
  { key: 'react', label: 'React' },
  { key: 'plugins', label: 'Plugins' },
  { key: 'testing', label: 'Testing' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'dirtytalk', label: 'DirtyTalk' },
  { key: '__root__', label: 'Examples' },
];

// Per-package GROUPS for the full-text dumps — aligned to the npm packages /
// topic dropdown. Each group owns a set of top-level path segments; `root: true`
// also sweeps in root-level pages (index, showcase, playground). Order here is
// the order they appear in the index's discovery line and in llms-full.txt.
const GROUPS = [
  {
    id: 'blac',
    label: 'BlaC',
    file: 'llms-blac.txt',
    segments: ['guide', 'core', 'plugins', 'testing', 'integrations'],
    root: true,
  },
  {
    id: 'blac-react',
    label: 'BlaC React',
    file: 'llms-blac-react.txt',
    segments: ['react'],
  },
  {
    id: 'dirtytalk',
    label: 'DirtyTalk',
    file: 'llms-dirtytalk.txt',
    segments: ['dirtytalk'],
  },
];

/** Recursively collect every .md / .mdx file under DOCS_DIR. */
async function collectDocs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectDocs(full)));
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** Split a file into { frontmatter, body }. */
function splitFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { frontmatter: '', body: raw };
  return { frontmatter: match[1], body: raw.slice(match[0].length) };
}

/** Pull a single scalar field out of a frontmatter block. */
function fmField(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm');
  const m = re.exec(frontmatter);
  if (!m) return '';
  // Strip matching surrounding quotes.
  return m[1].replace(/^['"]([\s\S]*)['"]$/, '$1').trim();
}

/** docs-relative file path -> site URL ('/guide/introduction/'). */
function toUrl(file) {
  let rel = path.relative(DOCS_DIR, file).replace(/\\/g, '/');
  rel = rel.replace(/\.mdx?$/, '');
  if (rel === 'index') return '/';
  rel = rel.replace(/\/index$/, '');
  return `/${rel}/`;
}

/** Strip a leading run of MDX `import … from '…';` statements from a body. */
function stripLeadingImports(body) {
  return body.replace(
    /^(?:\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*\n)+/,
    '',
  );
}

/** First path segment of a URL, or '' for the home page. */
function firstSegment(url) {
  return url.split('/').filter(Boolean)[0] ?? '';
}

function sectionKeyFor(url) {
  const seg = firstSegment(url);
  return SECTIONS.some((s) => s.key === seg) ? seg : '__root__';
}

function groupIdFor(url) {
  const seg = firstSegment(url);
  const owner = GROUPS.find((g) => g.segments.includes(seg));
  if (owner) return owner.id;
  // Root-level page (home, showcase, playground) → the root-sweeping group.
  return (GROUPS.find((g) => g.root) ?? GROUPS[0]).id;
}

/** Render one page as a full-text block (used by llms-full + per-group files). */
function renderPageBlock(p) {
  const lines = ['---', '', `# ${p.title}`, ''];
  if (p.description) lines.push(`> ${p.description}`, '');
  lines.push(`Source: ${p.url}`, '', p.body, '');
  return lines.join('\n');
}

async function main() {
  const files = await collectDocs(DOCS_DIR);
  const pages = [];
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { frontmatter, body } = splitFrontmatter(raw);
    const url = toUrl(file);
    pages.push({
      url,
      title: fmField(frontmatter, 'title') || url,
      description: fmField(frontmatter, 'description'),
      body: stripLeadingImports(body).trim(),
      section: sectionKeyFor(url),
      group: groupIdFor(url),
    });
  }

  // Deterministic order: by section order, then URL.
  const sectionRank = new Map(SECTIONS.map((s, i) => [s.key, i]));
  pages.sort(
    (a, b) =>
      (sectionRank.get(a.section) ?? 99) - (sectionRank.get(b.section) ?? 99) ||
      a.url.localeCompare(b.url),
  );

  const written = [];

  // ---- llms.txt (curated index) ----
  const discovery = GROUPS.map((g) => `[${g.label}](/${g.file})`).join(', ');
  const indexLines = [
    `# ${SITE_TITLE}`,
    '',
    SITE_BLURB,
    '',
    `Full text by package: ${discovery}. Everything in one file: ` +
      `[Complete docs](/llms-full.txt).`,
    '',
  ];
  for (const { key, label } of SECTIONS) {
    const inSection = pages.filter((p) => p.section === key && p.url !== '/');
    if (inSection.length === 0) continue;
    indexLines.push(`## ${label}`, '');
    for (const p of inSection) {
      const desc = p.description ? `: ${p.description}` : '';
      indexLines.push(`- [${p.title}](${p.url})${desc}`);
    }
    indexLines.push('');
  }
  const llmsTxt =
    indexLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  await writeFile(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');
  written.push(`llms.txt (index, ${pages.length - 1} pages)`);

  // ---- llms-full.txt (whole corpus) ----
  const fullParts = [`# ${SITE_TITLE}`, '', SITE_BLURB, ''];
  for (const p of pages) fullParts.push(renderPageBlock(p));
  await writeFile(
    path.join(PUBLIC_DIR, 'llms-full.txt'),
    fullParts.join('\n').trimEnd() + '\n',
    'utf8',
  );
  written.push(`llms-full.txt (${pages.length} pages)`);

  // ---- llms-<group>.txt (one full-text file per package) ----
  for (const g of GROUPS) {
    const groupPages = pages.filter((p) => p.group === g.id);
    if (groupPages.length === 0) continue;
    const parts = [
      `# ${SITE_TITLE} — ${g.label}`,
      '',
      SITE_BLURB,
      '',
      `This file contains the full text of the ${g.label} documentation only. ` +
        `See /llms.txt for the complete index.`,
      '',
    ];
    for (const p of groupPages) parts.push(renderPageBlock(p));
    await writeFile(
      path.join(PUBLIC_DIR, g.file),
      parts.join('\n').trimEnd() + '\n',
      'utf8',
    );
    written.push(`${g.file} (${groupPages.length} pages)`);
  }

  console.log('✓ Generated LLM artifacts:');
  for (const w of written) console.log(`  - ${w}`);
}

main().catch((err) => {
  console.error('✖ generate-llms failed:', err);
  process.exit(1);
});
