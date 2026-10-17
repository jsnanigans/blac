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

class Entry implements PathSubscription {
  interest: PathSet = new Set<PathId>();
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

/**
 * Dispatches a flush to the subscriptions whose interest intersects it, by
 * looking up each dirty id, so a change wakes its consumers without visiting
 * every subscription on the channel.
 */
export class PathIndex {
  readonly entries = new Set<Entry>();
  private readonly _byId = new Map<PathId, Set<Entry>>();
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
        const set = this._byId.get(id);
        set?.delete(entry);
        if (set?.size === 0) this._byId.delete(id);
      }
    }
    if (next === undefined) return;
    if (next === ALL_PATHS) {
      this._all.add(entry);
      return;
    }
    for (const id of next) {
      if (prev !== ALL_PATHS && prev.has(id)) continue;
      let set = this._byId.get(id);
      if (set === undefined) this._byId.set(id, (set = new Set()));
      set.add(entry);
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
        const set = this._byId.get(id);
        if (set !== undefined) for (const e of set) take(e);
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
