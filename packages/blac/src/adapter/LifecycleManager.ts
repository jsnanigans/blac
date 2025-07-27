import { BlocBase } from '../BlocBase';

export interface LifecycleCallbacks<B extends BlocBase<any>> {
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * LifecycleManager handles mount/unmount operations and lifecycle callbacks.
 * It ensures callbacks are called at the appropriate times.
 */
export class LifecycleManager<B extends BlocBase<any>> {
  private hasMounted = false;
  private mountTime = 0;
  private unmountTime = 0;
  private mountCount = 0;

  constructor(
    private consumerId: string,
    private callbacks?: LifecycleCallbacks<B>,
  ) {}

  mount(blocInstance: B, consumerRef: object): void {
    this.mountCount++;

    blocInstance._addConsumer(this.consumerId, consumerRef);

    // Call onMount callback if provided and not already called
    if (!this.hasMounted) {
      this.hasMounted = true;
      this.mountTime = Date.now();

      if (this.callbacks?.onMount) {
        try {
          this.callbacks.onMount(blocInstance);
        } catch (error) {
          throw error;
        }
      }
    }
  }

  unmount(blocInstance: B): void {
    this.unmountTime = Date.now();

    blocInstance._removeConsumer(this.consumerId);

    // Call onUnmount callback
    if (this.callbacks?.onUnmount) {
      try {
        this.callbacks.onUnmount(blocInstance);
      } catch (error) {
        // Don't re-throw on unmount to allow cleanup to continue
      }
    }
  }

  hasCalledOnMount(): boolean {
    return this.hasMounted;
  }

  getStats() {
    const now = Date.now();
    return {
      hasMounted: this.hasMounted,
      mountCount: this.mountCount,
      lifetime:
        this.mountTime && this.unmountTime
          ? this.unmountTime - this.mountTime
          : this.mountTime
            ? now - this.mountTime
            : 0,
      consumerId: this.consumerId,
    };
  }
}
