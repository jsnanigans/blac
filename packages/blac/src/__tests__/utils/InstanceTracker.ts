/**
 * InstanceTracker - Utility for tracking active instances in memory leak tests
 *
 * This utility helps detect memory leaks by tracking instances using WeakRefs,
 * allowing us to verify that objects are properly garbage collected when no
 * longer referenced.
 */
export class InstanceTracker {
  private instances = new Set<WeakRef<any>>();

  /**
   * Track a new instance
   * @param instance - The object instance to track
   */
  track(instance: any): void {
    this.instances.add(new WeakRef(instance));
  }

  /**
   * Get count of currently active (not garbage collected) instances
   * Also performs cleanup of dead references
   */
  activeCount(): number {
    // Clean up dead references
    const alive = Array.from(this.instances).filter(
      ref => ref.deref() !== undefined
    );

    this.instances = new Set(alive);
    return this.instances.size;
  }

  /**
   * Get all active instances (not garbage collected)
   */
  getActiveInstances(): any[] {
    const active: any[] = [];
    const aliveRefs: WeakRef<any>[] = [];

    for (const ref of this.instances) {
      const instance = ref.deref();
      if (instance !== undefined) {
        active.push(instance);
        aliveRefs.push(ref);
      }
    }

    // Clean up dead references
    this.instances = new Set(aliveRefs);
    return active;
  }

  /**
   * Clear all tracked instances
   */
  clear(): void {
    this.instances.clear();
  }
}