export interface Scheduler {
  request(flush: () => void): void;
  cancel?(flush: () => void): void;
}

// Runs every flush in `fns`, collecting errors so one throwing flush can't
// starve the rest; rethrows once all have run.
const runAll = (fns: Set<() => void>, label: string): void => {
  let errors: unknown[] | undefined;
  for (const fn of fns) {
    try {
      fn();
    } catch (err) {
      (errors ??= []).push(err);
    }
  }
  if (errors === undefined) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, `${label}: flush errors during drain`);
};

// ---------------------------------------------------------------------------
// SyncScheduler — invokes flush immediately on every request call.
// ---------------------------------------------------------------------------

export class SyncScheduler implements Scheduler {
  request(flush: () => void): void {
    flush();
  }
}

// ---------------------------------------------------------------------------
// ManualScheduler — defers until pump() is called.
// ---------------------------------------------------------------------------

export class ManualScheduler implements Scheduler {
  #pending: Set<() => void> = new Set();

  request(flush: () => void): void {
    this.#pending.add(flush);
  }

  cancel(flush: () => void): void {
    this.#pending.delete(flush);
  }

  /** Runs the flushes requested so far; requests made meanwhile wait for the next pump. */
  pump(): void {
    if (this.#pending.size === 0) return;
    const fns = this.#pending;
    this.#pending = new Set();
    runAll(fns, 'ManualScheduler');
  }
}

// ---------------------------------------------------------------------------
// MicrotaskScheduler — coalesces requests via queueMicrotask.
// ---------------------------------------------------------------------------

export class MicrotaskScheduler implements Scheduler {
  #scheduled = false;
  #pending: Set<() => void> = new Set();
  readonly #drain = (): void => {
    this.#scheduled = false;
    if (this.#pending.size === 0) return;
    const fns = this.#pending;
    this.#pending = new Set();
    runAll(fns, 'MicrotaskScheduler');
  };

  request(flush: () => void): void {
    this.#pending.add(flush);
    if (!this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(this.#drain);
    }
  }

  // A queued microtask can't be revoked; it drains whatever is pending then.
  cancel(flush: () => void): void {
    this.#pending.delete(flush);
  }
}

// ---------------------------------------------------------------------------
// RAFScheduler — coalesces requests via requestAnimationFrame (or setTimeout
// fallback when rAF is unavailable, e.g. Node test environment).
// ---------------------------------------------------------------------------

export class RAFScheduler implements Scheduler {
  // A rAF id or a timer handle, depending on `#useRAF`.
  #handle: unknown = null;
  #pending: Set<() => void> = new Set();
  readonly #useRAF = typeof globalThis.requestAnimationFrame === 'function';
  readonly #drain = (): void => {
    this.#handle = null;
    const fns = this.#pending;
    this.#pending = new Set();
    runAll(fns, 'RAFScheduler');
  };

  request(flush: () => void): void {
    this.#pending.add(flush);
    if (this.#handle !== null) return;
    this.#handle = this.#useRAF
      ? globalThis.requestAnimationFrame(this.#drain)
      : setTimeout(this.#drain, 16);
  }

  cancel(flush: () => void): void {
    this.#pending.delete(flush);
    if (this.#handle === null || this.#pending.size > 0) return;
    if (this.#useRAF) globalThis.cancelAnimationFrame(this.#handle as number);
    else clearTimeout(this.#handle as ReturnType<typeof setTimeout>);
    this.#handle = null;
  }
}
