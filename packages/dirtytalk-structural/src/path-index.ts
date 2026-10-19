import { ALL_PATHS, type PathSet } from './path-set';
import type { PathId } from './types';

/** A consumer subscription whose interest is indexed by path id. */
export interface PathSubscription {
  /**
   * Replace the watched paths. The set is indexed as passed and must not be
   * mutated afterwards; passing the current set again is a no-op.
   */
  setInterest(interest: PathSet): void;
  unsubscribe(): void;
}

type Slot = Entry | Entry[] | Set<Entry>;

// Above this many subscribers an id's slot becomes a `Set`, so removal stays
// O(1) for ids every consumer watches.
const SMALL = 8;

// Shared initial interest; `move` never mutates an interest set.
const NO_INTEREST: PathSet = new Set<PathId>();

class Entry implements PathSubscription {
  interest: PathSet = NO_INTEREST;
  alive = true;
  seen = 0;

  constructor(
    private readonly _index: PathIndex,
    readonly cb: () => void,
  ) {}

  setInterest(interest: PathSet): void {
    if (interest === this.interest || !this.alive) return;
    this._index.move(this, this.interest, interest);
    this.interest = interest;
  }

  unsubscribe(): void {
    if (!this.alive) return;
    this.alive = false;
    this._index.move(this, this.interest, undefined);
    this._index.entries.delete(this);
  }
}

// Fills the gap up to `id` first: a write far past the end would turn the
// array into a slow dictionary.
export const setAt = <T>(
  arr: (T | undefined)[],
  id: number,
  value: T,
): void => {
  while (arr.length < id) arr.push(undefined);
  arr[id] = value;
};

/**
 * Dispatches a flush to the subscriptions whose interest intersects it, by
 * looking up each dirty id, so a change wakes its consumers without visiting
 * every subscription on the channel.
 */
export class PathIndex {
  readonly entries = new Set<Entry>();
  // A lone subscriber is stored as itself and a few as an array: most ids are
  // watched by one or two consumers, and a `Set` each would dominate mount
  // cost.
  // Indexed by id: ids are small dense integers, so an array skips hashing.
  private readonly _byId: (Slot | undefined)[] = [];
  private readonly _all = new Set<Entry>();
  private _stamp = 0;

  constructor(private readonly _onError?: (err: unknown) => void) {}

  subscribe(cb: () => void): PathSubscription {
    const entry = new Entry(this, cb);
    this.entries.add(entry);
    return entry;
  }

  move(entry: Entry, prev: PathSet, next: PathSet | undefined): void {
    if (prev === ALL_PATHS) {
      this._all.delete(entry);
    } else {
      for (const id of prev) {
        if (next !== undefined && next !== ALL_PATHS && next.has(id)) continue;
        const at = this._byId[id];
        if (at === entry) {
          this._byId[id] = undefined;
        } else if (at instanceof Set) {
          at.delete(entry);
          if (at.size === SMALL) this._byId[id] = [...at];
        } else if (Array.isArray(at)) {
          const i = at.indexOf(entry);
          if (i === -1) continue;
          if (at.length === 2) {
            this._byId[id] = at[1 - i];
          } else {
            at[i] = at[at.length - 1];
            at.pop();
          }
        }
      }
    }
    if (next === undefined) return;
    if (next === ALL_PATHS) {
      this._all.add(entry);
      return;
    }
    for (const id of next) {
      if (prev !== ALL_PATHS && prev.has(id)) continue;
      const at = this._byId[id];
      if (at === undefined) setAt(this._byId, id, entry);
      else if (at instanceof Set) at.add(entry);
      else if (Array.isArray(at)) {
        if (at.length < SMALL) at.push(entry);
        else this._byId[id] = new Set(at).add(entry);
      } else if (at !== entry) this._byId[id] = [at, entry];
    }
  }

  dispatch(dirty: PathSet): void {
    const stamp = ++this._stamp;
    // Collected first: callbacks may re-render and move entries.
    const woken: Entry[] = [];
    const take = (e: Entry): void => {
      if (e.seen !== stamp) {
        e.seen = stamp;
        woken.push(e);
      }
    };
    if (dirty === ALL_PATHS) {
      for (const e of this.entries) {
        if (e.interest === ALL_PATHS || e.interest.size > 0) take(e);
      }
    } else {
      for (const id of dirty) {
        const at = this._byId[id];
        if (at === undefined) continue;
        if (at instanceof Entry) take(at);
        else for (const e of at) take(e);
      }
      for (const e of this._all) take(e);
    }

    let errors: unknown[] | undefined;
    for (const e of woken) {
      if (!e.alive) continue;
      try {
        e.cb();
      } catch (err) {
        if (this._onError) this._onError(err);
        else (errors ??= []).push(err);
      }
    }
    if (errors) {
      if (errors.length === 1) throw errors[0];
      throw new AggregateError(errors, 'PathIndex: subscriber errors');
    }
  }
}
