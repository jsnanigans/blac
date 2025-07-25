import { DependencyTracker, DependencyArray } from './DependencyTracker';

interface ConsumerInfo {
  id: string;
  tracker: DependencyTracker;
  lastNotified: number;
  hasRendered: boolean;
}

export class ConsumerTracker {
  private consumers = new WeakMap<object, ConsumerInfo>();
  private consumerRefs = new Map<string, WeakRef<object>>();
  
  registerConsumer(consumerId: string, consumerRef: object): void {
    const tracker = new DependencyTracker();
    
    this.consumers.set(consumerRef, {
      id: consumerId,
      tracker,
      lastNotified: Date.now(),
      hasRendered: false,
    });
    
    this.consumerRefs.set(consumerId, new WeakRef(consumerRef));
  }
  
  unregisterConsumer(consumerId: string): void {
    const weakRef = this.consumerRefs.get(consumerId);
    if (weakRef) {
      const consumerRef = weakRef.deref();
      if (consumerRef) {
        this.consumers.delete(consumerRef);
      }
      this.consumerRefs.delete(consumerId);
    }
  }
  
  trackAccess(consumerRef: object, type: 'state' | 'class', path: string): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return;
    
    if (type === 'state') {
      consumerInfo.tracker.trackStateAccess(path);
    } else {
      consumerInfo.tracker.trackClassAccess(path);
    }
  }
  
  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return null;
    
    return consumerInfo.tracker.computeDependencies();
  }
  
  shouldNotifyConsumer(consumerRef: object, changedPaths: Set<string>): boolean {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return true; // If consumer not registered yet, notify by default
    
    const dependencies = consumerInfo.tracker.computeDependencies();
    const allPaths = [...dependencies.statePaths, ...dependencies.classPaths];
    
    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      return true;
    }
    
    // After first render, if no dependencies tracked, don't notify
    if (allPaths.length === 0) {
      return false;
    }
    
    return allPaths.some(path => changedPaths.has(path));
  }
  
  updateLastNotified(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.lastNotified = Date.now();
      consumerInfo.hasRendered = true;
    }
  }
  
  getActiveConsumers(): Array<{ id: string; ref: object }> {
    const active: Array<{ id: string; ref: object }> = [];
    
    for (const [id, weakRef] of this.consumerRefs.entries()) {
      const ref = weakRef.deref();
      if (ref) {
        active.push({ id, ref });
      } else {
        this.consumerRefs.delete(id);
      }
    }
    
    return active;
  }
  
  resetConsumerTracking(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.tracker.reset();
    }
  }
  
  cleanup(): void {
    const idsToRemove: string[] = [];
    
    for (const [id, weakRef] of this.consumerRefs.entries()) {
      if (!weakRef.deref()) {
        idsToRemove.push(id);
      }
    }
    
    idsToRemove.forEach(id => this.consumerRefs.delete(id));
  }
}