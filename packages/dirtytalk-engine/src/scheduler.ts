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
  #pending = false;
  #flush: (() => void) | null = null;

  request(flush: () => void): void {
    this.#pending = true;
    this.#flush = flush;
  }

  pump(): void {
    if (!this.#pending) return;
    this.#pending = false;
    const fn = this.#flush;
    this.#flush = null;
    fn?.();
  }
}

// ---------------------------------------------------------------------------
// MicrotaskScheduler — coalesces requests via queueMicrotask.
// ---------------------------------------------------------------------------

export class MicrotaskScheduler implements Scheduler {
  #pending = false;
  #flush: (() => void) | null = null;

  request(flush: () => void): void {
    this.#flush = flush;
    if (!this.#pending) {
      this.#pending = true;
      queueMicrotask(() => this.#drain());
    }
  }

  cancel(): void {
    this.#pending = false;
    this.#flush = null;
  }

  #drain(): void {
    if (!this.#pending) return;
    this.#pending = false;
    const fn = this.#flush;
    this.#flush = null;
    fn?.();
  }
}

// ---------------------------------------------------------------------------
// RAFScheduler — coalesces requests via requestAnimationFrame (or setTimeout
// fallback when rAF is unavailable, e.g. Node test environment).
// ---------------------------------------------------------------------------

export class RAFScheduler implements Scheduler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #handle: any = null;
  #flush: (() => void) | null = null;
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
    this.#flush = flush;
    if (this.#handle == null) {
      this.#schedule(() => this.#drain());
    }
  }

  cancel(): void {
    if (this.#handle != null) {
      this.#unschedule();
      this.#flush = null;
    }
  }

  #drain(): void {
    this.#handle = null;
    const fn = this.#flush;
    this.#flush = null;
    fn?.();
  }
}
