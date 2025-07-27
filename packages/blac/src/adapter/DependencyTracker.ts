export interface DependencyMetrics {
  totalAccesses: number;
  uniquePaths: Set<string>;
  lastAccessTime: number;
}

export interface DependencyArray {
  statePaths: string[];
  classPaths: string[];
}

export class DependencyTracker {
  private stateAccesses = new Set<string>();
  private classAccesses = new Set<string>();
  private accessCount = 0;
  private lastAccessTime = 0;
  private trackerId = Math.random().toString(36).substr(2, 9);

  trackStateAccess(path: string): void {
    const isNew = !this.stateAccesses.has(path);
    this.stateAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = Date.now();
    console.log(`📊 [DependencyTracker-${this.trackerId}] Tracked state access: ${path} (${isNew ? 'NEW' : 'EXISTING'})`);
    console.log(`📊 [DependencyTracker-${this.trackerId}] Total state paths: ${this.stateAccesses.size}`);
  }

  trackClassAccess(path: string): void {
    const isNew = !this.classAccesses.has(path);
    this.classAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = Date.now();
    console.log(`📊 [DependencyTracker-${this.trackerId}] Tracked class access: ${path} (${isNew ? 'NEW' : 'EXISTING'})`);
    console.log(`📊 [DependencyTracker-${this.trackerId}] Total class paths: ${this.classAccesses.size}`);
  }

  computeDependencies(): DependencyArray {
    const deps = {
      statePaths: Array.from(this.stateAccesses),
      classPaths: Array.from(this.classAccesses),
    };
    console.log(`📊 [DependencyTracker-${this.trackerId}] Computing dependencies:`, {
      statePaths: deps.statePaths,
      classPaths: deps.classPaths,
      totalAccesses: this.accessCount
    });
    return deps;
  }

  reset(): void {
    const previousState = {
      statePaths: this.stateAccesses.size,
      classPaths: this.classAccesses.size,
      accessCount: this.accessCount
    };
    
    this.stateAccesses.clear();
    this.classAccesses.clear();
    this.accessCount = 0;
    
    console.log(`📊 [DependencyTracker-${this.trackerId}] Reset - Cleared:`, previousState);
  }

  getMetrics(): DependencyMetrics {
    return {
      totalAccesses: this.accessCount,
      uniquePaths: new Set([...this.stateAccesses, ...this.classAccesses]),
      lastAccessTime: this.lastAccessTime,
    };
  }

  hasDependencies(): boolean {
    const hasDeps = this.stateAccesses.size > 0 || this.classAccesses.size > 0;
    console.log(`📊 [DependencyTracker-${this.trackerId}] Has dependencies: ${hasDeps} (state: ${this.stateAccesses.size}, class: ${this.classAccesses.size})`);
    return hasDeps;
  }

  merge(other: DependencyTracker): void {
    const beforeState = {
      statePaths: this.stateAccesses.size,
      classPaths: this.classAccesses.size,
      accessCount: this.accessCount
    };
    
    other.stateAccesses.forEach((path) => this.stateAccesses.add(path));
    other.classAccesses.forEach((path) => this.classAccesses.add(path));
    this.accessCount += other.accessCount;
    this.lastAccessTime = Math.max(this.lastAccessTime, other.lastAccessTime);
    
    console.log(`📊 [DependencyTracker-${this.trackerId}] Merged with another tracker:`, {
      before: beforeState,
      after: {
        statePaths: this.stateAccesses.size,
        classPaths: this.classAccesses.size,
        accessCount: this.accessCount
      },
      merged: {
        statePaths: other.stateAccesses.size,
        classPaths: other.classAccesses.size,
        accessCount: other.accessCount
      }
    });
  }
}
