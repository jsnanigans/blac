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
  ) {
    console.log(`🏔️ [LifecycleManager] Created for consumer: ${consumerId}`);
    console.log(`🏔️ [LifecycleManager] Callbacks configured:`, {
      hasOnMount: !!callbacks?.onMount,
      hasOnUnmount: !!callbacks?.onUnmount,
    });
  }

  mount(blocInstance: B, consumerRef: object): void {
    const startTime = performance.now();
    this.mountCount++;

    console.log(
      `🏔️ [LifecycleManager] 🚀 Mount #${this.mountCount} - Consumer ID: ${this.consumerId}`,
    );
    console.log(
      `🏔️ [LifecycleManager] Bloc instance: ${blocInstance._name} (${blocInstance._id})`,
    );
    console.log(
      `🏔️ [LifecycleManager] Previous mount state: ${this.hasMounted}`,
    );

    // Track consumer count before adding
    const consumerCountBefore = blocInstance._consumers?.size || 0;
    blocInstance._addConsumer(this.consumerId, consumerRef);
    const consumerCountAfter = blocInstance._consumers?.size || 0;

    console.log(
      `🏔️ [LifecycleManager] Added consumer to bloc - Consumers: ${consumerCountBefore} -> ${consumerCountAfter}`,
    );

    // Call onMount callback if provided and not already called
    if (!this.hasMounted) {
      this.hasMounted = true;
      this.mountTime = Date.now();

      if (this.callbacks?.onMount) {
        const callbackStart = performance.now();
        console.log(`🏔️ [LifecycleManager] 🎯 Calling onMount callback`);

        try {
          this.callbacks.onMount(blocInstance);
          const callbackEnd = performance.now();
          console.log(
            `🏔️ [LifecycleManager] ✅ onMount callback completed in ${(callbackEnd - callbackStart).toFixed(2)}ms`,
          );
        } catch (error) {
          console.error(
            `🏔️ [LifecycleManager] ❌ onMount callback error:`,
            error,
          );
          throw error;
        }
      } else {
        console.log(`🏔️ [LifecycleManager] No onMount callback provided`);
      }
    } else {
      console.log(
        `🏔️ [LifecycleManager] ⚠️ Skipping onMount - already mounted`,
      );
    }

    const endTime = performance.now();
    console.log(
      `🏔️ [LifecycleManager] ⏱️ Mount completed in ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  unmount(blocInstance: B): void {
    const startTime = performance.now();
    this.unmountTime = Date.now();

    const lifetime = this.mountTime ? this.unmountTime - this.mountTime : 0;

    console.log(
      `🏔️ [LifecycleManager] 🏚️ Unmount - Consumer ID: ${this.consumerId}`,
    );
    console.log(`🏔️ [LifecycleManager] Component lifetime: ${lifetime}ms`);

    // Track consumer count before removing
    const consumerCountBefore = blocInstance._consumers?.size || 0;
    blocInstance._removeConsumer(this.consumerId);
    const consumerCountAfter = blocInstance._consumers?.size || 0;

    console.log(
      `🏔️ [LifecycleManager] Removed consumer from bloc - Consumers: ${consumerCountBefore} -> ${consumerCountAfter}`,
    );

    if (consumerCountAfter === 0) {
      console.log(
        `🏔️ [LifecycleManager] 🚫 Last consumer removed - bloc may be disposed`,
      );
    }

    // Call onUnmount callback
    if (this.callbacks?.onUnmount) {
      const callbackStart = performance.now();
      console.log(`🏔️ [LifecycleManager] 🎯 Calling onUnmount callback`);

      try {
        this.callbacks.onUnmount(blocInstance);
        const callbackEnd = performance.now();
        console.log(
          `🏔️ [LifecycleManager] ✅ onUnmount callback completed in ${(callbackEnd - callbackStart).toFixed(2)}ms`,
        );
      } catch (error) {
        console.error(
          `🏔️ [LifecycleManager] ❌ onUnmount callback error:`,
          error,
        );
        // Don't re-throw on unmount to allow cleanup to continue
      }
    } else {
      console.log(`🏔️ [LifecycleManager] No onUnmount callback provided`);
    }

    const endTime = performance.now();
    console.log(
      `🏔️ [LifecycleManager] ⏱️ Unmount completed in ${(endTime - startTime).toFixed(2)}ms`,
    );
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
