#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Publishable packages only. Apps (apps/*) and the private
// @9amhealth/blac-compat shim are intentionally excluded — they are never
// published to npm (see `ignore` in .changeset/config.json).
const packages = [
  { name: '@blac/core', path: 'packages/blac-core' },
  { name: '@blac/react', path: 'packages/blac-react' },
  { name: '@blac/devtools-connect', path: 'packages/devtools-connect' },
  { name: '@blac/devtools-ui', path: 'packages/devtools-ui' },
  { name: '@blac/logging-plugin', path: 'packages/logging-plugin' },
  { name: '@blac/plugin-persist', path: 'packages/plugin-persist' },
  { name: '@dirtytalk/engine', path: 'packages/dirtytalk-engine' },
  { name: '@dirtytalk/structural', path: 'packages/dirtytalk-structural' },
  { name: '@dirtytalk/spatial', path: 'packages/dirtytalk-spatial' },
];

function getVersion() {
  const pkgPath = join(rootDir, 'packages/blac-core/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

function getChangelog(pkgPath) {
  const changelogPath = join(rootDir, pkgPath, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    return null;
  }
  return readFileSync(changelogPath, 'utf-8');
}

function generateCombinedChangelog() {
  const version = getVersion();

  let output = `---
outline: deep
---

# Changelog

Current version: **v${version}**

This changelog is automatically generated from the individual package changelogs using [Changesets](https://github.com/changesets/changesets).

`;

  for (const pkg of packages) {
    const changelog = getChangelog(pkg.path);
    if (changelog) {
      output += `## ${pkg.name}\n\n`;

      // Remove the package name header from the changelog
      const content = changelog
        .replace(/^#\s+@blac\/\w+(-\w+)*\s*\n+/, '')
        .trim();

      output += content + '\n\n';
    }
  }

  return output;
}

// Generate the changelog
const changelog = generateCombinedChangelog();
const outputPath = join(rootDir, 'apps/docs/changelog.md');
writeFileSync(outputPath, changelog);

console.log(`Generated changelog at ${outputPath}`);
console.log(`Current version: ${getVersion()}`);
