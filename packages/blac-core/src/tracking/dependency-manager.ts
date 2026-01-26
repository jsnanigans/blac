import type { StateContainerInstance } from '../types/utilities';

/**
 * Manages subscriptions to state container dependencies.
 * Provides efficient sync mechanism to add/remove subscriptions
 * as dependencies change between callback invocations.
 */
export class DependencyManager {
  private subscriptions = new Map<StateContainerInstance, () => void>();
  private currentDeps = new Set<StateContainerInstance>();

  /**
   * Sync subscriptions with a new set of dependencies.
   * Adds subscriptions for new deps, removes subscriptions for stale deps.
   *
   * @param newDeps - The new set of dependencies to subscribe to
   * @param onChange - Callback to invoke when any dependency changes
   * @param exclude - Optional instance to exclude from subscriptions (e.g., primary bloc)
   * @returns true if the dependency set changed, false if unchanged
   */
  sync(
    newDeps: Set<StateContainerInstance>,
    onChange: () => void,
    exclude?: StateContainerInstance,
  ): boolean {
    const filteredNewDeps = new Set<StateContainerInstance>();
    for (const dep of newDeps) {
      if (dep !== exclude && !dep.isDisposed) {
        filteredNewDeps.add(dep);
      }
    }

    if (this.areSetsEqual(this.currentDeps, filteredNewDeps)) {
      return false;
    }

    for (const dep of this.currentDeps) {
      if (!filteredNewDeps.has(dep)) {
        const unsub = this.subscriptions.get(dep);
        if (unsub) {
          unsub();
          this.subscriptions.delete(dep);
        }
      }
    }

    for (const dep of filteredNewDeps) {
      if (!this.currentDeps.has(dep) && !this.subscriptions.has(dep)) {
        const unsub = dep.subscribe(onChange);
        this.subscriptions.set(dep, unsub);
      }
    }

    this.currentDeps = filteredNewDeps;
    return true;
  }

  /**
   * Add a single dependency subscription.
   */
  add(dep: StateContainerInstance, onChange: () => void): void {
    if (this.subscriptions.has(dep) || dep.isDisposed) {
      return;
    }
    const unsub = dep.subscribe(onChange);
    this.subscriptions.set(dep, unsub);
    this.currentDeps.add(dep);
  }

  /**
   * Check if a dependency is currently subscribed.
   */
  has(dep: StateContainerInstance): boolean {
    return this.currentDeps.has(dep);
  }

  /**
   * Get the current set of dependencies.
   */
  getDependencies(): Set<StateContainerInstance> {
    return new Set(this.currentDeps);
  }

  /**
   * Clean up all active subscriptions.
   */
  cleanup(): void {
    for (const unsub of this.subscriptions.values()) {
      unsub();
    }
    this.subscriptions.clear();
    this.currentDeps.clear();
  }

  private areSetsEqual(
    a: Set<StateContainerInstance>,
    b: Set<StateContainerInstance>,
  ): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
