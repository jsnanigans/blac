/**
 * Component-aware dependency tracking system that maintains component-level isolation
 * while using shared proxies for memory efficiency.
 */

export interface ComponentAccessRecord {
  stateAccess: Set<string>;
  classAccess: Set<string>;
  lastAccessTime: number;
}

export interface ComponentDependencyMetrics {
  totalComponents: number;
  totalStateAccess: number;
  totalClassAccess: number;
  averageAccessPerComponent: number;
  memoryUsageKB: number;
}

/**
 * Tracks which components access which properties to enable fine-grained re-rendering.
 * Uses WeakMap for automatic cleanup when components unmount.
 */
export class ComponentDependencyTracker {
  private componentAccessMap = new WeakMap<object, ComponentAccessRecord>();
  private componentIdMap = new Map<string, WeakRef<object>>();
  
  private metrics = {
    totalStateAccess: 0,
    totalClassAccess: 0,
    componentCount: 0,
  };

  /**
   * Register a component for dependency tracking
   * @param componentId - Unique identifier for the component
   * @param componentRef - Reference object for the component (used as WeakMap key)
   */
  public registerComponent(componentId: string, componentRef: object): void {
    if (!this.componentAccessMap.has(componentRef)) {
      this.componentAccessMap.set(componentRef, {
        stateAccess: new Set(),
        classAccess: new Set(),
        lastAccessTime: Date.now(),
      });
      
      this.componentIdMap.set(componentId, new WeakRef(componentRef));
      this.metrics.componentCount++;
    }
  }

  /**
   * Track state property access for a specific component
   * @param componentRef - Component reference object
   * @param propertyPath - The property being accessed
   */
  public trackStateAccess(componentRef: object, propertyPath: string): void {
    const record = this.componentAccessMap.get(componentRef);
    if (!record) {
      // Component not registered - this shouldn't happen in normal usage
      console.warn('[ComponentDependencyTracker] Tracking access for unregistered component');
      return;
    }

    if (!record.stateAccess.has(propertyPath)) {
      record.stateAccess.add(propertyPath);
      record.lastAccessTime = Date.now();
      this.metrics.totalStateAccess++;
    }
  }

  /**
   * Track class property access for a specific component
   * @param componentRef - Component reference object
   * @param propertyPath - The property being accessed
   */
  public trackClassAccess(componentRef: object, propertyPath: string): void {
    const record = this.componentAccessMap.get(componentRef);
    if (!record) {
      console.warn('[ComponentDependencyTracker] Tracking access for unregistered component');
      return;
    }

    if (!record.classAccess.has(propertyPath)) {
      record.classAccess.add(propertyPath);
      record.lastAccessTime = Date.now();
      this.metrics.totalClassAccess++;
    }
  }

  /**
   * Check if a component should be notified based on changed property paths
   * @param componentRef - Component reference object
   * @param changedStatePaths - Set of state property paths that changed
   * @param changedClassPaths - Set of class property paths that changed
   * @returns true if the component should re-render
   */
  public shouldNotifyComponent(
    componentRef: object,
    changedStatePaths: Set<string>,
    changedClassPaths: Set<string>
  ): boolean {
    const record = this.componentAccessMap.get(componentRef);
    if (!record) {
      return false;
    }

    // Check if any accessed state properties changed
    for (const accessedPath of record.stateAccess) {
      if (changedStatePaths.has(accessedPath)) {
        return true;
      }
    }

    // Check if any accessed class properties changed
    for (const accessedPath of record.classAccess) {
      if (changedClassPaths.has(accessedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the dependency array for a specific component
   * @param componentRef - Component reference object
   * @param state - Current state object
   * @param classInstance - Current class instance
   * @returns Dependency array for this component
   */
  public getComponentDependencies(
    componentRef: object,
    state: any,
    classInstance: any
  ): unknown[][] {
    const record = this.componentAccessMap.get(componentRef);
    if (!record) {
      // If no record exists, return empty arrays - let caller handle fallback
      return [[], []];
    }

    const stateDeps: unknown[] = [];
    const classDeps: unknown[] = [];

    // Collect values for accessed state properties
    for (const propertyPath of record.stateAccess) {
      if (state && typeof state === 'object' && propertyPath in state) {
        stateDeps.push(state[propertyPath]);
      }
    }

    // Collect values for accessed class properties
    for (const propertyPath of record.classAccess) {
      if (classInstance && propertyPath in classInstance) {
        try {
          const value = classInstance[propertyPath];
          if (typeof value !== 'function') {
            classDeps.push(value);
          }
        } catch (error) {
          // Ignore access errors
        }
      }
    }

    return [stateDeps, classDeps];
  }

  /**
   * Reset dependency tracking for a specific component
   * @param componentRef - Component reference object
   */
  public resetComponent(componentRef: object): void {
    const record = this.componentAccessMap.get(componentRef);
    if (record) {
      record.stateAccess.clear();
      record.classAccess.clear();
      record.lastAccessTime = Date.now();
    }
  }

  /**
   * Get accessed state properties for a component (for backward compatibility)
   * @param componentRef - Component reference object
   * @returns Set of accessed state property paths
   */
  public getStateAccess(componentRef: object): Set<string> {
    const record = this.componentAccessMap.get(componentRef);
    return record ? new Set(record.stateAccess) : new Set();
  }

  /**
   * Get accessed class properties for a component (for backward compatibility)
   * @param componentRef - Component reference object
   * @returns Set of accessed class property paths
   */
  public getClassAccess(componentRef: object): Set<string> {
    const record = this.componentAccessMap.get(componentRef);
    return record ? new Set(record.classAccess) : new Set();
  }

  /**
   * Get performance metrics for debugging
   * @returns Component dependency metrics
   */
  public getMetrics(): ComponentDependencyMetrics {
    let totalComponents = 0;
    
    // Count valid component references
    for (const [componentId, weakRef] of this.componentIdMap.entries()) {
      if (weakRef.deref()) {
        totalComponents++;
      } else {
        // Clean up dead references
        this.componentIdMap.delete(componentId);
      }
    }

    const averageAccess = totalComponents > 0 
      ? (this.metrics.totalStateAccess + this.metrics.totalClassAccess) / totalComponents 
      : 0;

    // Rough memory estimation
    const estimatedMemoryKB = Math.round(
      (this.componentIdMap.size * 100 + // ComponentId mapping overhead
       this.metrics.totalStateAccess * 50 + // State access tracking
       this.metrics.totalClassAccess * 50) / 1024 // Class access tracking
    );

    return {
      totalComponents,
      totalStateAccess: this.metrics.totalStateAccess,
      totalClassAccess: this.metrics.totalClassAccess,
      averageAccessPerComponent: averageAccess,
      memoryUsageKB: estimatedMemoryKB,
    };
  }

  /**
   * Clean up expired component references (for testing/debugging)
   */
  public cleanup(): void {
    const expiredRefs: string[] = [];
    
    for (const [componentId, weakRef] of this.componentIdMap.entries()) {
      if (!weakRef.deref()) {
        expiredRefs.push(componentId);
      }
    }
    
    expiredRefs.forEach(id => this.componentIdMap.delete(id));
  }
}

/**
 * Global singleton instance for component dependency tracking
 */
export const globalComponentTracker = new ComponentDependencyTracker();