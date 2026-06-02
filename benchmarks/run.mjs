#!/usr/bin/env node
// Benchmark orchestrator for the dirtytalk packages.
//
// Usage:
//   node benchmarks/run.mjs [engine|structural|all] [--warmup N] [--runs N]
//
// Runs each scenario for the selected package(s) under hyperfine and writes
// hyperfine's markdown table (plus a small header) to
//   benchmarks/<package>/<version>-<date>-report.md
//
// Benchmarks the BUILT output in each package's dist/. Build first if needed:
//   pnpm --filter @dirtytalk/engine build
//   pnpm --filter @dirtytalk/structural build

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const PACKAGES = {
  engine: {
    name: '@dirtytalk/engine',
    outDir: 'dirtytalk-engine',
    pkgJson: join(ROOT, 'packages/dirtytalk-engine/package.json'),
    dist: join(ROOT, 'packages/dirtytalk-engine/dist/index.js'),
    scenarios: [
      {
        id: 'signal-set-notify',
        file: 'engine/signal.mjs',
        desc: 'Signal `.value` set + synchronous notify, 1 subscriber (2,000,000 sets)',
      },
      {
        id: 'channel-broadcast',
        file: 'engine/channel-broadcast.mjs',
        desc: 'DirtyChannel mark+flush, 100 subscribers all interested (50,000 marks)',
      },
      {
        id: 'channel-selective',
        file: 'engine/channel-selective.mjs',
        desc: 'DirtyChannel mark+flush, 1000 subscribers, 1 intersects per mark (10,000 marks)',
      },
    ],
  },
  structural: {
    name: '@dirtytalk/structural',
    outDir: 'dirtytalk-structural',
    pkgJson: join(ROOT, 'packages/dirtytalk-structural/package.json'),
    dist: join(ROOT, 'packages/dirtytalk-structural/dist/index.js'),
    scenarios: [
      {
        id: 'patch',
        file: 'structural/patch.mjs',
        desc: 'StructuralContainer.patch() no-diff path (500,000 patches)',
      },
      {
        id: 'emit-diff',
        file: 'structural/emit-diff.mjs',
        desc: 'StructuralContainer.emit() diff-along-skeleton, 50 consumers (20,000 emits)',
      },
      {
        id: 'track-render',
        file: 'structural/track-render.mjs',
        desc: 'trackRender proxy recording of nested reads (200,000 renders)',
      },
      {
        id: 'intern',
        file: 'structural/intern.mjs',
        desc: 'PathInterner steady-state interning, 1000-path vocabulary (2,000,000 interns)',
      },
    ],
  },
};

function parseArgs(argv) {
  const opts = { target: 'all', warmup: 3, runs: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'engine' || a === 'structural' || a === 'all') opts.target = a;
    else if (a === '--warmup') opts.warmup = Number(argv[++i]);
    else if (a === '--runs') opts.runs = Number(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
}

function git(args, fallback) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function today() {
  // YYYY-MM-DD in local time.
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function runPackage(key, opts) {
  const pkg = PACKAGES[key];
  if (!existsSync(pkg.dist)) {
    console.error(
      `\n✗ ${pkg.name}: build output missing at\n  ${pkg.dist}\n` +
        `  Build it first:  pnpm --filter ${pkg.name} build\n`,
    );
    process.exitCode = 1;
    return;
  }

  const version = JSON.parse(readFileSync(pkg.pkgJson, 'utf8')).version;
  const date = today();
  const sha = git(['rev-parse', '--short', 'HEAD'], 'unknown');
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown');

  const tmpMd = join(HERE, `.${key}.hyperfine.md`);
  const hfArgs = ['--warmup', String(opts.warmup)];
  if (opts.runs) hfArgs.push('--runs', String(opts.runs));
  hfArgs.push('--shell', 'none', '--export-markdown', tmpMd);
  for (const s of pkg.scenarios) {
    hfArgs.push('-n', s.id, `node ${join(HERE, 'scenarios', s.file)}`);
  }

  console.error(
    `\n▶ Benchmarking ${pkg.name}@${version} (${pkg.scenarios.length} scenarios)\n`,
  );
  execFileSync('hyperfine', hfArgs, { cwd: ROOT, stdio: 'inherit' });

  const table = readFileSync(tmpMd, 'utf8').trim();
  rmSync(tmpMd, { force: true });

  const scenarioList = pkg.scenarios
    .map((s) => `- \`${s.id}\` — ${s.desc}`)
    .join('\n');

  const report = `# ${pkg.name} benchmark — v${version}

| Field | Value |
| ----- | ----- |
| Package | \`${pkg.name}\` |
| Version | \`${version}\` |
| Date | ${date} |
| Git | \`${branch}\` @ \`${sha}\` |
| Node | \`${process.version}\` |
| Platform | \`${process.platform}/${process.arch}\` |
| Warmup runs | ${opts.warmup} |

## Scenarios

${scenarioList}

## Results

${table}

> hyperfine measures whole-process wall time, including Node startup (~tens of
> ms). Each scenario runs a large fixed iteration count (see scenario list) so
> the measured work dominates startup. Numbers are meaningful for
> version-over-version comparison on the same machine, not as per-operation
> latencies.
`;

  const outDir = join(HERE, pkg.outDir);
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${version}-${date}-report.md`);
  writeFileSync(outFile, report);
  console.error(`\n✓ Wrote ${outFile}\n`);
}

const opts = parseArgs(process.argv.slice(2));
const targets =
  opts.target === 'all' ? ['engine', 'structural'] : [opts.target];
for (const t of targets) runPackage(t, opts);
