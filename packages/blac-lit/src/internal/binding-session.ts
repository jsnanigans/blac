import type { StateContainer } from '@blac/core';
import {
  asTrackable,
  emptyPathSet,
  expandWithAncestors,
  ProxyCache,
  trackRender,
  trackedBloc,
  type PathSet,
} from './track';

let sessionCounter = 0;

const nextConsumerId = () => `blac-lit-binding@${(sessionCounter += 1)}`;

type Reader<T> = (state: unknown, bloc: StateContainer) => T;

/**
 * Owns the complete reactive lifecycle for one Lit binding hole.
 *
 * Consumer paths deliberately remain the normal leaves reported by the
 * tracker. Ancestor-watch ids are only channel subscription interest: mixing
 * them into the structural consumer registry would make the source skeleton
 * compare two different path vocabularies.
 */
export class BindingSession<T> {
  readonly consumerId = nextConsumerId();

  private readonly cache = new ProxyCache();
  private source?: StateContainer;
  private reader?: Reader<T>;
  private unsubscribe?: () => void;
  private registered = false;
  private connected = false;
  private paths: PathSet = emptyPathSet();
  private interest: PathSet = emptyPathSet();
  private snapshot: unknown;

  constructor(private readonly apply: (value: T) => void) {}

  /** Compute the current value, detaching the previous source before rebinding. */
  compute(source: StateContainer, reader: Reader<T>): T {
    if (this.source !== source) {
      this.detachSource();
      this.source = source;
      this.resetInterest();
    }

    this.reader = reader;
    return this.computeCurrent();
  }

  /** Attach after an initial render-time compute. */
  connect(): void {
    this.connected = true;
    this.attach();
  }

  /** Reconnection starts from a fresh read so old interest can never be reused. */
  reconnect(): void {
    this.connected = true;
    if (!this.source || !this.reader) return;

    const value = this.computeCurrent();
    this.apply(value);
    this.attach();
  }

  /** Disconnecting removes both channel interest and structural registration. */
  disconnect(): void {
    this.connected = false;
    this.detachSource();
  }

  private computeCurrent(): T {
    const source = this.source;
    const reader = this.reader;
    if (!source || !reader) {
      throw new Error('Cannot compute a binding before a source and reader exist.');
    }

    const trackable = asTrackable(source);
    const snapshot = trackable.state;
    const tracked = trackRender(snapshot, trackable.interner, this.cache);

    let value: T;
    try {
      value = reader(
        tracked.value,
        trackedBloc(source, tracked.value),
      );
    } catch (error) {
      // A failed tracked read must not leave previous paths subscribed or in
      // the source skeleton. A later Lit update can establish a fresh session.
      this.detachAfterFailure();
      throw error;
    } finally {
      // Lit completes this read synchronously. Unlike React JSX, no later
      // commit phase needs this proxy armed.
      tracked.disarm();
    }

    this.snapshot = snapshot;
    this.paths = tracked.paths;
    this.interest = expandWithAncestors(tracked.paths, trackable.interner);

    // An existing subscription reads `interest` lazily, so dynamic selectors
    // only need their source-side leaf registration refreshed here.
    if (this.unsubscribe) this.registerPaths();
    return value;
  }

  private attach(): void {
    if (!this.connected || this.unsubscribe || !this.source || !this.reader) {
      return;
    }

    const source = this.source;
    const trackable = asTrackable(source);
    try {
      this.registerPaths();
      this.unsubscribe = trackable.channel.subscribe(
        () => this.interest,
        () => {
          const value = this.computeCurrent();
          this.apply(value);
        },
      );

      // Close the compute → subscription gap. The recompute refreshes both
      // leaf registration and expanded subscription interest before applying.
      if (trackable.state !== this.snapshot) {
        const value = this.computeCurrent();
        this.apply(value);
      }
    } catch (error) {
      // Register/subscribe is transactional from the directive's perspective:
      // a partial attempt cannot leave a stale skeleton consumer behind.
      this.detachAfterFailure();
      throw error;
    }
  }

  private registerPaths(): void {
    const source = this.source;
    if (!source) return;
    asTrackable(source).registerConsumerPaths(this.consumerId, this.paths);
    this.registered = true;
  }

  private detachSource(): void {
    const source = this.source;
    const unsubscribe = this.unsubscribe;
    const registered = this.registered;
    this.unsubscribe = undefined;
    this.registered = false;

    let error: unknown;
    try {
      unsubscribe?.();
    } catch (cause) {
      error = cause;
    } finally {
      if (source && registered) {
        try {
          asTrackable(source).unregisterConsumer(this.consumerId);
        } catch (cause) {
          if (error === undefined) error = cause;
        }
      }
    }
    if (error !== undefined) throw error;
  }

  private resetInterest(): void {
    this.paths = emptyPathSet();
    this.interest = emptyPathSet();
    this.snapshot = undefined;
  }

  private detachAfterFailure(): void {
    // Preserve the read/setup error while still making a best effort to remove
    // every piece of reactive state that was installed before it was thrown.
    try {
      this.detachSource();
    } catch {
      // `detachSource` clears local flags before invoking user/channel cleanup,
      // so even a failing cleanup cannot leave this session registered here.
    }
    this.resetInterest();
  }
}
