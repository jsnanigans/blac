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
  
  trackStateAccess(path: string): void {
    this.stateAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = Date.now();
  }
  
  trackClassAccess(path: string): void {
    this.classAccesses.add(path);
    this.accessCount++;
    this.lastAccessTime = Date.now();
  }
  
  computeDependencies(): DependencyArray {
    return {
      statePaths: Array.from(this.stateAccesses),
      classPaths: Array.from(this.classAccesses),
    };
  }
  
  reset(): void {
    this.stateAccesses.clear();
    this.classAccesses.clear();
    this.accessCount = 0;
  }
  
  getMetrics(): DependencyMetrics {
    return {
      totalAccesses: this.accessCount,
      uniquePaths: new Set([...this.stateAccesses, ...this.classAccesses]),
      lastAccessTime: this.lastAccessTime,
    };
  }
  
  hasDependencies(): boolean {
    return this.stateAccesses.size > 0 || this.classAccesses.size > 0;
  }
  
  merge(other: DependencyTracker): void {
    other.stateAccesses.forEach(path => this.stateAccesses.add(path));
    other.classAccesses.forEach(path => this.classAccesses.add(path));
    this.accessCount += other.accessCount;
    this.lastAccessTime = Math.max(this.lastAccessTime, other.lastAccessTime);
  }
}