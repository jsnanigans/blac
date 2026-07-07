export interface Scheduler {
  request(flush: () => void): void;
  cancel?(): void;
}

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
  #scheduled = false;
  #pending: Set<() => void> = new Set();

  request(flush: () => void): void {
    this.#scheduled = true;
    this.#pending.add(flush);
  }

  pump(): void {
    if (!this.#scheduled) return;
    this.#scheduled = false;
    const fns = this.#pending;
    this.#pending = new Set();
    for (const fn of fns) fn();
  }
}

// ---------------------------------------------------------------------------
// MicrotaskScheduler — coalesces requests via queueMicrotask.
// ---------------------------------------------------------------------------

export class MicrotaskScheduler implements Scheduler {
  #scheduled = false;
  #pending: Set<() => void> = new Set();

  request(flush: () => void): void {
    this.#pending.add(flush);
    if (!this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(() => this.#drain());
    }
  }

  cancel(): void {
    this.#scheduled = false;
    this.#pending = new Set();
  }

  #drain(): void {
    if (!this.#scheduled) return;
    this.#scheduled = false;
    const fns = this.#pending;
    this.#pending = new Set();
    for (const fn of fns) fn();
  }
}

// ---------------------------------------------------------------------------
// RAFScheduler — coalesces requests via requestAnimationFrame (or setTimeout
// fallback when rAF is unavailable, e.g. Node test environment).
// ---------------------------------------------------------------------------

export class RAFScheduler implements Scheduler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #handle: any = null;
  #pending: Set<() => void> = new Set();
  readonly #useRAF: boolean;

  constructor() {
    this.#useRAF = typeof globalThis.requestAnimationFrame === 'function';
  }

  #schedule(fn: () => void): void {
    if (this.#useRAF) {
      this.#handle = globalThis.requestAnimationFrame(fn);
    } else {
      this.#handle = setTimeout(fn, 16);
    }
  }

  #unschedule(): void {
    if (this.#useRAF) {
      globalThis.cancelAnimationFrame(this.#handle);
    } else {
      clearTimeout(this.#handle);
    }
    this.#handle = null;
  }

  request(flush: () => void): void {
    this.#pending.add(flush);
    if (this.#handle == null) {
      this.#schedule(() => this.#drain());
    }
  }

  cancel(): void {
    if (this.#handle != null) {
      this.#unschedule();
      this.#pending = new Set();
    }
  }

  #drain(): void {
    this.#handle = null;
    const fns = this.#pending;
    this.#pending = new Set();
    for (const fn of fns) fn();
  }
}
