import type { Space } from './space';
import type { Scheduler } from './scheduler';

interface SubscriberEntry<Region> {
  interest: () => Region;
  cb: (dirty: Region) => void;
  alive: boolean;
}

export class DirtyChannel<Region> {
  readonly #space: Space<Region>;
  readonly #scheduler: Scheduler;

  // Accumulated dirty region since the last flush. Re-entrant marks during a
  // flush land here too — the flush snapshots `accumulated` at step 1, resets
  // it to empty(), and then any subsequent mark() calls (from callbacks) write
  // into the freshly-reset field. At the end of flush we check whether it is
  // non-empty; if so we schedule another flush.
  #accumulated: Region;

  // True while a flush has been requested but not yet drained.
  #scheduled = false;

  // True while subscriber callbacks are being invoked. Used to detect
  // re-entrant mark() calls so we don't double-schedule.
  #flushing = false;

  // Registration-ordered map from monotonic id → entry.
  #subscribers = new Map<number, SubscriberEntry<Region>>();
  #nextId = 0;

  // Stable reference to the flush function passed to the scheduler.
  // Allocating it once avoids GC churn and lets identity-keying schedulers work.
  readonly #boundFlush: () => void;

  readonly #onError?: (err: unknown) => void;

  constructor(
    space: Space<Region>,
    scheduler: Scheduler,
    options?: { onError?: (err: unknown) => void },
  ) {
    this.#space = space;
    this.#scheduler = scheduler;
    this.#accumulated = space.empty();
    this.#boundFlush = () => this.#flush();
    this.#onError = options?.onError;
  }

  mark(r: Region): void {
    // Accumulate the dirty region regardless of whether we are flushing.
    // If flushing, the current flush already snapshotted `accumulated` and
    // reset it; so writing here is safe — it queues work for the *next* flush.
    this.#accumulated = this.#space.union(this.#accumulated, r);

    // Only schedule a new flush when we are not already inside a flush.
    // If we are flushing, the tail of #flush() will detect the non-empty
    // accumulated and schedule the next flush itself.
    if (!this.#flushing && !this.#scheduled) {
      this.#scheduled = true;
      this.#scheduler.request(this.#boundFlush);
    }
  }

  subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void {
    const id = this.#nextId++;
    const entry: SubscriberEntry<Region> = { interest, cb, alive: true };
    this.#subscribers.set(id, entry);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      entry.alive = false;
      this.#subscribers.delete(id);
    };
  }

  #flush(): void {
    // Step 1 — snapshot the dirty region and reset state.
    const dirty = this.#accumulated;
    this.#accumulated = this.#space.empty();
    this.#scheduled = false;

    // Step 2 — empty fast-path: no work to do, skip the subscriber loop
    // entirely. Consumers may rely on "no callback fires for no-op flushes."
    if (this.#space.isEmpty(dirty)) return;

    // Step 3 — enter flushing mode.
    this.#flushing = true;

    // Step 4 — snapshot the subscriber list. New subscribers added during
    // callbacks will not be in this list and will NOT run this cycle.
    const live = Array.from(this.#subscribers.values());

    const errors: unknown[] = [];

    // Step 5 — iterate the snapshot.
    for (const entry of live) {
      // Check the alive flag on the entry, not the map — the map may have been
      // mutated by an earlier callback (subscribe or unsubscribe).
      if (!entry.alive) continue;

      // Evaluate the interest thunk lazily, once per flush per subscriber.
      let interest: Region;
      try {
        interest = entry.interest();
      } catch (err) {
        // Treat a throwing thunk as "no interest this flush" and record it.
        if (this.#onError) {
          this.#onError(err);
        } else {
          errors.push(err);
        }
        continue;
      }

      if (!this.#space.intersects(interest, dirty)) continue;

      try {
        entry.cb(dirty);
      } catch (err) {
        if (this.#onError) {
          this.#onError(err);
        } else {
          errors.push(err);
        }
      }
    }

    // Step 6 — exit flushing mode.
    this.#flushing = false;

    // Step 9 — if re-entrant marks arrived during the flush they are sitting in
    // `accumulated` (non-empty). Schedule the next flush now that flushing is
    // cleared so mark()'s guard won't double-schedule.
    if (!this.#space.isEmpty(this.#accumulated)) {
      this.#scheduled = true;
      this.#scheduler.request(this.#boundFlush);
    }

    // Step 8 — surface errors after all callbacks have run and state is clean.
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        'DirtyChannel: subscriber errors during flush',
      );
    }
  }
}
