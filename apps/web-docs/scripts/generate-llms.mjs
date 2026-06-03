#!/usr/bin/env node
/*
 * Generate llms.txt + llms-full.txt from the docs content.
 *
 * These are the AI/LLM discovery artifacts the old VitePress site shipped as
 * hand-maintained statics in public/. There was no generator — so they drifted
 * from the content. Here we derive them from `src/content/docs` at build time
 * instead, so they can never go stale:
 *
 *   - public/llms.txt       a curated index: one linked, described entry per
 *                           page, grouped by section. Built from each page's
 *                           frontmatter `title` + `description`.
 *   - public/llms-full.txt  the full corpus: every page's title + description +
 *                           body concatenated, frontmatter and leading MDX
 *                           imports stripped. Intended as a single-file context
 *                           dump for LLMs.
 *
 * Run standalone (`node scripts/generate-llms.mjs`) or via the strict build
 * wrapper (check-snippets.mjs runs it before `astro build`). Writes into
 * public/, which Astro copies verbatim into dist/, so the files are served at
 * /llms.txt and /llms-full.txt.
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

// Section order + human labels, keyed by the first path segment. Pages whose
// segment isn't listed here fall into "Examples" (root-level pages like
// showcase / playground); `index` is the home page and is excluded from lists.
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

function sectionKeyFor(url) {
  const seg = url.split('/').filter(Boolean)[0];
  return SECTIONS.some((s) => s.key === seg) ? seg : '__root__';
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
    });
  }

  // Deterministic order: by section order, then URL.
  const sectionRank = new Map(SECTIONS.map((s, i) => [s.key, i]));
  pages.sort(
    (a, b) =>
      (sectionRank.get(a.section) ?? 99) - (sectionRank.get(b.section) ?? 99) ||
      a.url.localeCompare(b.url),
  );

  // ---- llms.txt (curated index) ----
  const indexLines = [`# ${SITE_TITLE}`, '', SITE_BLURB, ''];
  for (const { key, label } of SECTIONS) {
    const inSection = pages.filter(
      (p) => p.section === key && p.url !== '/', // exclude the home page
    );
    if (inSection.length === 0) continue;
    indexLines.push(`## ${label}`, '');
    for (const p of inSection) {
      const desc = p.description ? `: ${p.description}` : '';
      indexLines.push(`- [${p.title}](${p.url})${desc}`);
    }
    indexLines.push('');
  }
  const llmsTxt = indexLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  // ---- llms-full.txt (full corpus) ----
  const fullParts = [`# ${SITE_TITLE}`, '', SITE_BLURB, ''];
  for (const p of pages) {
    fullParts.push('---', '', `# ${p.title}`, '');
    if (p.description) fullParts.push(`> ${p.description}`, '');
    fullParts.push(`Source: ${p.url}`, '', p.body, '');
  }
  const llmsFull = fullParts.join('\n').trimEnd() + '\n';

  await writeFile(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');
  await writeFile(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFull, 'utf8');

  console.log(
    `✓ llms.txt (${pages.length} pages indexed) + llms-full.txt generated.`,
  );
}

main().catch((err) => {
  console.error('✖ generate-llms failed:', err);
  process.exit(1);
});
