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

      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Tracked state access: ${path} (${isNew ? '🆕 NEW' : '🔁 EXISTING'})`,
      );
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Value: ${JSON.stringify(value)} ${previousValue ? `(was: ${JSON.stringify(previousValue.value)})` : '(first access)'}`,
      );
    } else {
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Tracked state access: ${path} (${isNew ? '🆕 NEW' : '🔁 EXISTING'})`,
      );
    }

    console.log(
      `📊 [DependencyTracker-${this.trackerId}] Access count for this path: ${accessCount}`,
    );
    console.log(
      `📊 [DependencyTracker-${this.trackerId}] Total state paths: ${this.stateAccesses.size}`,
    );

    // Log hot paths
    if (accessCount > 10 && accessCount % 10 === 0) {
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] 🔥 Hot path detected: ${path} (${accessCount} accesses)`,
      );
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

      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Tracked class access: ${path} (${isNew ? '🆕 NEW' : '🔁 EXISTING'})`,
      );
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Value: ${JSON.stringify(value)} ${previousValue ? `(was: ${JSON.stringify(previousValue.value)})` : '(first access)'}`,
      );
    } else {
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] Tracked class access: ${path} (${isNew ? '🆕 NEW' : '🔁 EXISTING'})`,
      );
    }

    console.log(
      `📊 [DependencyTracker-${this.trackerId}] Access count for this path: ${accessCount}`,
    );
    console.log(
      `📊 [DependencyTracker-${this.trackerId}] Total class paths: ${this.classAccesses.size}`,
    );
  }

  computeDependencies(): DependencyArray {
    const startTime = performance.now();
    const deps = {
      statePaths: Array.from(this.stateAccesses),
      classPaths: Array.from(this.classAccesses),
    };
    const endTime = performance.now();

    // Find most accessed paths
    const hotPaths = Array.from(this.accessPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    console.log(
      `📊 [DependencyTracker-${this.trackerId}] 📦 Computing dependencies:`,
      {
        statePaths: deps.statePaths.length,
        classPaths: deps.classPaths.length,
        totalAccesses: this.accessCount,
        computationTime: `${(endTime - startTime).toFixed(2)}ms`,
      },
    );

    if (hotPaths.length > 0) {
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] 🔥 Hot paths:`,
        hotPaths.map(([path, count]) => `${path} (${count}x)`),
      );
    }

    return deps;
  }

  reset(): void {
    const lifetime = this.firstAccessTime
      ? Date.now() - this.firstAccessTime
      : 0;
    const previousState = {
      statePaths: this.stateAccesses.size,
      classPaths: this.classAccesses.size,
      accessCount: this.accessCount,
      lifetime: `${lifetime}ms`,
      uniqueAccessPatterns: this.accessPatterns.size,
      trackedStateValues: this.stateValues.size,
      trackedClassValues: this.classValues.size,
    };

    this.stateAccesses.clear();
    this.classAccesses.clear();
    this.accessPatterns.clear();
    this.stateValues.clear();
    this.classValues.clear();
    this.accessCount = 0;
    this.firstAccessTime = 0;

    console.log(
      `📊 [DependencyTracker-${this.trackerId}] 🔄 Reset - Previous state:`,
      previousState,
    );
  }

  getMetrics(): DependencyMetrics {
    const uniquePaths = new Set([...this.stateAccesses, ...this.classAccesses]);
    const lifetime = this.firstAccessTime
      ? Date.now() - this.firstAccessTime
      : 0;

    const metrics = {
      totalAccesses: this.accessCount,
      uniquePaths,
      lastAccessTime: this.lastAccessTime,
    };

    console.log(`📊 [DependencyTracker-${this.trackerId}] 📈 Metrics:`, {
      totalAccesses: metrics.totalAccesses,
      uniquePaths: uniquePaths.size,
      lifetime: `${lifetime}ms`,
      avgAccessRate:
        lifetime > 0
          ? `${(this.accessCount / (lifetime / 1000)).toFixed(2)}/sec`
          : 'N/A',
    });

    return metrics;
  }

  hasDependencies(): boolean {
    const hasDeps = this.stateAccesses.size > 0 || this.classAccesses.size > 0;
    console.log(
      `📊 [DependencyTracker-${this.trackerId}] Has dependencies: ${hasDeps ? '✅' : '❌'} (state: ${this.stateAccesses.size}, class: ${this.classAccesses.size})`,
    );
    return hasDeps;
  }

  merge(other: DependencyTracker): void {
    const startTime = performance.now();
    const beforeState = {
      statePaths: this.stateAccesses.size,
      classPaths: this.classAccesses.size,
      accessCount: this.accessCount,
      patterns: this.accessPatterns.size,
    };

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

    const endTime = performance.now();
    console.log(
      `📊 [DependencyTracker-${this.trackerId}] 🤝 Merged with tracker ${other.trackerId}:`,
      {
        before: beforeState,
        after: {
          statePaths: this.stateAccesses.size,
          classPaths: this.classAccesses.size,
          accessCount: this.accessCount,
          patterns: this.accessPatterns.size,
        },
        merged: {
          trackerId: other.trackerId,
          statePaths: other.stateAccesses.size,
          classPaths: other.classAccesses.size,
          accessCount: other.accessCount,
        },
        mergeTime: `${(endTime - startTime).toFixed(2)}ms`,
      },
    );
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
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] 🆕 No values tracked yet but paths exist - considering changed`,
      );
      return true;
    }

    // Check state values
    for (const [path, trackedValue] of this.stateValues) {
      try {
        const currentValue = this.getValueAtPath(newState, path);
        if (currentValue !== trackedValue.value) {
          console.log(
            `📊 [DependencyTracker-${this.trackerId}] 🔄 State value changed at ${path}: ${JSON.stringify(trackedValue.value)} -> ${JSON.stringify(currentValue)}`,
          );
          // Update the tracked value for next comparison
          this.stateValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        console.log(
          `📊 [DependencyTracker-${this.trackerId}] ⚠️ Error accessing state path ${path}: ${error}`,
        );
        hasChanged = true; // Consider it changed if we can't access it
      }
    }

    // Check class getter values
    for (const [path, trackedValue] of this.classValues) {
      try {
        const currentValue = this.getValueAtPath(newBlocInstance, path);
        if (currentValue !== trackedValue.value) {
          console.log(
            `📊 [DependencyTracker-${this.trackerId}] 🔄 Class getter value changed at ${path}: ${JSON.stringify(trackedValue.value)} -> ${JSON.stringify(currentValue)}`,
          );
          // Update the tracked value for next comparison
          this.classValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        console.log(
          `📊 [DependencyTracker-${this.trackerId}] ⚠️ Error accessing class getter ${path}: ${error}`,
        );
        hasChanged = true; // Consider it changed if we can't access it
      }
    }

    if (!hasChanged) {
      console.log(
        `📊 [DependencyTracker-${this.trackerId}] ✅ No tracked values have changed`,
      );
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
