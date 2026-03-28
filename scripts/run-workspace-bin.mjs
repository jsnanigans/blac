#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [, , binName, ...args] = process.argv;

if (!binName) {
  console.error('Usage: node scripts/run-workspace-bin.mjs <bin> [...args]');
  process.exit(1);
}

const repoRoot = path.dirname(
  fileURLToPath(new URL('../package.json', import.meta.url)),
);
const searchRoots = [
  repoRoot,
  ...['packages', 'apps'].flatMap((dir) => {
    const absDir = path.join(repoRoot, dir);
    if (!existsSync(absDir)) return [];
    return readdirSync(absDir).map((name) => path.join(absDir, name));
  }),
];

const binaryPath = searchRoots
  .map((root) => path.join(root, 'node_modules', '.bin', binName))
  .find((candidate) => existsSync(candidate));

if (!binaryPath) {
  console.error(`Unable to find workspace binary: ${binName}`);
  process.exit(1);
}

const result = spawnSync(binaryPath, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
