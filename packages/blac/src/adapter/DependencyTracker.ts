export interface DependencyMetrics {
  totalAccesses: number;
  uniquePaths: Set<string>;
  lastAccessTime: number;
}

export interface DependencyArray {
  statePaths: string[];
  classPaths: string[];
}

export interface TrackedValue {
  value: any;
  lastAccessTime: number;
}

export class DependencyTracker {
  private stateAccesses = new Set<string>();
  private classAccesses = new Set<string>();
  private accessCount = 0;
  private lastAccessTime = 0;
  private trackerId = Math.random().toString(36).substr(2, 9);
  private accessPatterns = new Map<string, number>();
  private createdAt = Date.now();
  private firstAccessTime = 0;

  // Track values along with paths
  private stateValues = new Map<string, TrackedValue>();
  private classValues = new Map<string, TrackedValue>();

  trackStateAccess(path: string, value?: any): void {
    const now = Date.now();
    const isNew = !this.stateAccesses.has(path);

    if (!this.firstAccessTime) {
      this.firstAccessTime = now;
    }

    this.stateAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = now;

    // Track access patterns
    const accessCount = (this.accessPatterns.get(path) || 0) + 1;
    this.accessPatterns.set(path, accessCount);

    // Track value if provided
    if (value !== undefined) {
      const previousValue = this.stateValues.get(path);
      this.stateValues.set(path, { value, lastAccessTime: now });
    }
  }

  trackClassAccess(path: string, value?: any): void {
    const now = Date.now();
    const isNew = !this.classAccesses.has(path);

    if (!this.firstAccessTime) {
      this.firstAccessTime = now;
    }

    this.classAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = now;

    // Track access patterns
    const accessCount = (this.accessPatterns.get(`class.${path}`) || 0) + 1;
    this.accessPatterns.set(`class.${path}`, accessCount);

    // Track value if provided
    if (value !== undefined) {
      const previousValue = this.classValues.get(path);
      this.classValues.set(path, { value, lastAccessTime: now });
    }
  }

  computeDependencies(): DependencyArray {
    const deps = {
      statePaths: Array.from(this.stateAccesses),
      classPaths: Array.from(this.classAccesses),
    };

    return deps;
  }

  reset(): void {
    this.stateAccesses.clear();
    this.classAccesses.clear();
    this.accessPatterns.clear();
    this.stateValues.clear();
    this.classValues.clear();
    this.accessCount = 0;
    this.firstAccessTime = 0;
  }

  getMetrics(): DependencyMetrics {
    const uniquePaths = new Set([...this.stateAccesses, ...this.classAccesses]);

    const metrics = {
      totalAccesses: this.accessCount,
      uniquePaths,
      lastAccessTime: this.lastAccessTime,
    };

    return metrics;
  }

  hasDependencies(): boolean {
    return this.stateAccesses.size > 0 || this.classAccesses.size > 0;
  }

  merge(other: DependencyTracker): void {
    // Merge state and class accesses
    other.stateAccesses.forEach((path) => this.stateAccesses.add(path));
    other.classAccesses.forEach((path) => this.classAccesses.add(path));

    // Merge access patterns
    other.accessPatterns.forEach((count, path) => {
      const currentCount = this.accessPatterns.get(path) || 0;
      this.accessPatterns.set(path, currentCount + count);
    });

    // Merge tracked values
    other.stateValues.forEach((trackedValue, path) => {
      this.stateValues.set(path, trackedValue);
    });
    other.classValues.forEach((trackedValue, path) => {
      this.classValues.set(path, trackedValue);
    });

    this.accessCount += other.accessCount;
    this.lastAccessTime = Math.max(this.lastAccessTime, other.lastAccessTime);
    if (
      other.firstAccessTime &&
      (!this.firstAccessTime || other.firstAccessTime < this.firstAccessTime)
    ) {
      this.firstAccessTime = other.firstAccessTime;
    }
  }

  // Get tracked values for comparison
  getTrackedValues(): {
    statePaths: Map<string, any>;
    classPaths: Map<string, any>;
  } {
    const statePaths = new Map<string, any>();
    const classPaths = new Map<string, any>();

    this.stateValues.forEach((trackedValue, path) => {
      statePaths.set(path, trackedValue.value);
    });

    this.classValues.forEach((trackedValue, path) => {
      classPaths.set(path, trackedValue.value);
    });

    return { statePaths, classPaths };
  }

  // Check if any tracked values have changed
  hasValuesChanged(newState: any, newBlocInstance: any): boolean {
    let hasChanged = false;
    const now = Date.now();

    // If we haven't tracked any values yet, consider it changed to establish baseline
    if (
      this.stateValues.size === 0 &&
      this.classValues.size === 0 &&
      (this.stateAccesses.size > 0 || this.classAccesses.size > 0)
    ) {
      return true;
    }

    // Check state values
    for (const [path, trackedValue] of this.stateValues) {
      try {
        const currentValue = this.getValueAtPath(newState, path);
        if (currentValue !== trackedValue.value) {
          // Update the tracked value for next comparison
          this.stateValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        hasChanged = true; // Consider it changed if we can't access it
      }
    }

    // Check class getter values
    for (const [path, trackedValue] of this.classValues) {
      try {
        const currentValue = this.getValueAtPath(newBlocInstance, path);
        if (currentValue !== trackedValue.value) {
          // Update the tracked value for next comparison
          this.classValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        hasChanged = true; // Consider it changed if we can't access it
      }
    }

    return hasChanged;
  }

  // Helper to get value at a path
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }

    return current;
  }
}
