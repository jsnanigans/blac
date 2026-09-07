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

  // Accumulated dirty region since the last flush, or `undefined` when nothing
  // has been marked. Re-entrant marks during a flush land here too — the flush
  // snapshots `accumulated` at step 1, resets it, and then any subsequent
  // mark() calls (from callbacks) write into the freshly-reset field. At the
  // end of flush we check whether it is non-empty; if so we schedule another
  // flush.
  #accumulated: Region | undefined = undefined;

  // True once `#accumulated` is a region this channel allocated itself (via
  // `union`), so `unionInto` may mutate it in place. The first mark of a cycle
  // is stored by reference to skip a copy, and must never be mutated.
  #owned = false;

  // True while a flush has been requested but not yet drained.
  #scheduled = false;

  // True once dispose() has been called. Guards mark()/subscribe()/#flush()
  // against post-disposal use and makes dispose() idempotent.
  #disposed = false;

  // True while subscriber callbacks are being invoked. Used to detect
  // re-entrant mark() calls so we don't double-schedule.
  #flushing = false;

  // Registration-ordered map from monotonic id → entry, allocated by the
  // first subscribe so a channel nobody listens to stays a bare object.
  #subscribers: Map<number, SubscriberEntry<Region>> | null = null;
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
    this.#boundFlush = () => this.#flush();
    this.#onError = options?.onError;
  }

  mark(r: Region): void {
    if (this.#disposed) return;

    // Accumulate the dirty region regardless of whether we are flushing.
    // If flushing, the current flush already snapshotted `accumulated` and
    // reset it; so writing here is safe — it queues work for the *next* flush.
    //
    // The first mark of a cycle is kept by reference (no allocation). A second
    // mark unions into a region we own, after which `unionInto` — where the
    // space supports it — accumulates in place: a copying `union` would make a
    // burst of N same-tick marks O(N²) in total copying. `#accumulated` is
    // private and is detached before subscribers see it, so mutating an owned
    // region here is unobservable.
    const acc = this.#accumulated;
    const space = this.#space;
    if (acc === undefined) {
      this.#accumulated = r;
      this.#owned = false;
    } else if (this.#owned && space.unionInto !== undefined) {
      this.#accumulated = space.unionInto(acc, r);
    } else {
      const merged = space.union(acc, r);
      this.#accumulated = merged;
      // `union` may return one of its inputs by reference; only a fresh region
      // is ours to mutate.
      this.#owned = merged !== acc && merged !== r;
    }

    // Only schedule a new flush when we are not already inside a flush.
    // If we are flushing, the tail of #flush() will detect the non-empty
    // accumulated and schedule the next flush itself.
    if (!this.#flushing && !this.#scheduled) {
      this.#scheduled = true;
      this.#scheduler.request(this.#boundFlush);
    }
  }

  subscribe(interest: () => Region, cb: (dirty: Region) => void): () => void {
    if (this.#disposed) return () => {};

    const id = this.#nextId++;
    const entry: SubscriberEntry<Region> = { interest, cb, alive: true };
    const subscribers = (this.#subscribers ??= new Map());
    subscribers.set(id, entry);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      entry.alive = false;
      subscribers.delete(id);
    };
  }

  #flush(): void {
    if (this.#disposed) return;

    // Step 1 — snapshot the dirty region and reset state.
    const dirty = this.#accumulated;
    this.#accumulated = undefined;
    this.#scheduled = false;

    // Step 2 — empty fast-path: no work to do, skip the subscriber loop
    // entirely. Consumers may rely on "no callback fires for no-op flushes."
    if (dirty === undefined || this.#space.isEmpty(dirty)) return;
    const subscribers = this.#subscribers;
    if (subscribers === null) return;

    // Step 3 — enter flushing mode.
    this.#flushing = true;

    let errors: unknown[] | undefined;

    // Step 4/5 — for 0 or 1 subscribers, skip the array snapshot entirely and
    // run the per-entry logic directly on the sole captured entry.
    if (subscribers.size <= 1) {
      const entry = subscribers.values().next().value;
      if (entry?.alive) {
        // Evaluate the interest thunk lazily, once per flush per subscriber.
        let interest: Region | undefined;
        let interestOk = true;
        try {
          interest = entry.interest();
        } catch (err) {
          // Treat a throwing thunk as "no interest this flush" and record it.
          if (this.#onError) {
            this.#onError(err);
          } else {
            (errors ??= []).push(err);
          }
          interestOk = false;
        }

        if (interestOk && this.#space.intersects(interest as Region, dirty)) {
          try {
            entry.cb(dirty);
          } catch (err) {
            if (this.#onError) {
              this.#onError(err);
            } else {
              (errors ??= []).push(err);
            }
          }
        }
      }
    } else {
      // Ids are monotonic and the map is insertion-ordered, so every entry at
      // or past `firstNewId` was subscribed during this flush: stop there
      // instead of snapshotting the list. New subscribers will NOT run this
      // cycle; unsubscribed ones are skipped by the map itself or `alive`.
      const firstNewId = this.#nextId;
      for (const [id, entry] of subscribers) {
        if (id >= firstNewId) break;
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
            (errors ??= []).push(err);
          }
          continue;
        }

        // A thunk that returns nothing has no interest this flush; passing it
        // to the space would fault inside intersects, far from the caller.
        if (interest == null) continue;

        if (!this.#space.intersects(interest, dirty)) continue;

        try {
          entry.cb(dirty);
        } catch (err) {
          if (this.#onError) {
            this.#onError(err);
          } else {
            (errors ??= []).push(err);
          }
        }
      }
    }

    // Step 6 — exit flushing mode.
    this.#flushing = false;

    // Step 9 — if re-entrant marks arrived during the flush they are sitting in
    // `accumulated` (non-empty). Schedule the next flush now that flushing is
    // cleared so mark()'s guard won't double-schedule.
    if (
      this.#accumulated !== undefined &&
      !this.#space.isEmpty(this.#accumulated)
    ) {
      this.#scheduled = true;
      this.#scheduler.request(this.#boundFlush);
    }

    // Step 8 — surface errors after all callbacks have run and state is clean.
    if (errors) {
      if (errors.length === 1) throw errors[0];
      throw new AggregateError(
        errors,
        'DirtyChannel: subscriber errors during flush',
      );
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    if (this.#scheduled) {
      this.#scheduler.cancel?.(this.#boundFlush);
      this.#scheduled = false;
    }

    this.#accumulated = undefined;
    this.#subscribers = null;
  }
}
