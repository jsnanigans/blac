// Tiny shared helper for benchmark scenario scripts.
//
// hyperfine measures whole-process wall time, so each scenario runs a large
// FIXED iteration count to make the actual work dominate Node startup. The
// count can be overridden with `node <scenario>.mjs <iters>` for retuning.

export function iterations(def) {
  const raw = process.argv[2] ?? process.env.BENCH_ITER;
  const n = raw === undefined ? def : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid iteration count: ${raw}`);
  }
  return n;
}

// Module-level sink that the final `done()` prints, so V8 cannot dead-code
// eliminate the work being measured.
let sink = 0;

export function blackhole(v) {
  if (typeof v === 'number') sink = (sink + v) | 0;
  else if (typeof v === 'boolean') sink = (sink + (v ? 1 : 0)) | 0;
  else sink = (sink + 1) | 0;
}

export function done(label, iters) {
  // Goes to stderr; hyperfine captures it but it keeps `sink` observable.
  process.stderr.write(`${label}: ${iters} iters (sink=${sink})\n`);
}
