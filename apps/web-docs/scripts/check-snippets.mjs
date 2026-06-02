#!/usr/bin/env node
/*
 * Strict build wrapper.
 *
 * `astro build` writes dist and exits 0 even when a ```ts twoslash`` snippet
 * fails to type-check: Starlight's content loader catches the per-file render
 * error, logs it as a non-fatal [ERROR] line, and drops the code block. That
 * would let broken snippets ship silently with missing code.
 *
 * This wrapper runs the real build, streams its output, and exits non-zero if
 * it sees that error signature — restoring the old VitePress guarantee that a
 * snippet which doesn't type-check FAILS the build. dist is still produced on
 * success, so it's a drop-in replacement for `astro build` in CI/deploy.
 */
import { spawn } from 'node:child_process';

// Signatures of a soft-logged snippet/render failure that astro build swallows.
const ERROR_PATTERNS = [
  /\[ERROR\]\s+\[starlight-docs-loader\]\s+Error rendering/i,
  /caused an error in its "preprocessCode" hook/i,
  /Errors were thrown in the sample/i,
];

const child = spawn('astro build', { shell: true });

let buf = '';
const tap = (chunk) => {
  const s = chunk.toString();
  buf += s;
  process.stdout.write(s);
};
child.stdout.on('data', tap);
child.stderr.on('data', tap);

child.on('close', (code) => {
  if (code !== 0) {
    process.exit(code);
  }
  const matched = ERROR_PATTERNS.find((re) => re.test(buf));
  if (matched) {
    console.error(
      '\n✖ Expressive Code / Twoslash reported a snippet error above ' +
        '(astro build swallowed it). Failing the build.',
    );
    process.exit(1);
  }
  console.log('\n✓ No snippet errors.');
  process.exit(0);
});
