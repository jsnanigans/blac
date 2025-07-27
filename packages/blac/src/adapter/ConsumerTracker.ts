export interface DependencyArray {
  statePaths: string[];
  classPaths: string[];
}

export interface TrackedValue {
  value: any;
  lastAccessTime: number;
}

export interface ConsumerInfo {
  id: string;
  lastNotified: number;
  hasRendered: boolean;
  // Dependency tracking
  stateAccesses: Set<string>;
  classAccesses: Set<string>;
  stateValues: Map<string, TrackedValue>;
  classValues: Map<string, TrackedValue>;
  accessCount: number;
  lastAccessTime: number;
  firstAccessTime: number;
}

/**
 * ConsumerTracker manages both consumer registration and dependency tracking.
 * It uses a WeakMap for automatic garbage collection when consumers are no longer referenced.
 */
export class ConsumerTracker {
  private consumers = new WeakMap<object, ConsumerInfo>();
  private registrationCount = 0;
  private activeConsumers = 0;

  register(consumerRef: object, consumerId: string): void {
    this.registrationCount++;

    const existingConsumer = this.consumers.get(consumerRef);
    if (!existingConsumer) {
      this.activeConsumers++;
    }

    this.consumers.set(consumerRef, {
      id: consumerId,
      lastNotified: Date.now(),
      hasRendered: false,
      stateAccesses: new Set(),
      classAccesses: new Set(),
      stateValues: new Map(),
      classValues: new Map(),
      accessCount: 0,
      lastAccessTime: 0,
      firstAccessTime: 0,
    });
  }

  unregister(consumerRef: object): void {
    if (consumerRef) {
      const consumerInfo = this.consumers.get(consumerRef);
      if (consumerInfo) {
        this.consumers.delete(consumerRef);
        this.activeConsumers = Math.max(0, this.activeConsumers - 1);
      }
    }
  }

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return;

    const now = Date.now();

    if (!consumerInfo.firstAccessTime) {
      consumerInfo.firstAccessTime = now;
    }

    consumerInfo.accessCount++;
    consumerInfo.lastAccessTime = now;

    if (type === 'state') {
      consumerInfo.stateAccesses.add(path);
      if (value !== undefined) {
        consumerInfo.stateValues.set(path, { value, lastAccessTime: now });
      }
    } else {
      consumerInfo.classAccesses.add(path);
      if (value !== undefined) {
        consumerInfo.classValues.set(path, { value, lastAccessTime: now });
      }
    }
  }

  resetTracking(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return;

    consumerInfo.stateAccesses.clear();
    consumerInfo.classAccesses.clear();
    consumerInfo.stateValues.clear();
    consumerInfo.classValues.clear();
    consumerInfo.accessCount = 0;
    consumerInfo.firstAccessTime = 0;
  }

  getDependencies(consumerRef: object): DependencyArray | null {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return null;

    return {
      statePaths: Array.from(consumerInfo.stateAccesses),
      classPaths: Array.from(consumerInfo.classAccesses),
    };
  }

  hasValuesChanged(
    consumerRef: object,
    newState: any,
    newBlocInstance: any,
  ): boolean {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return true;

    let hasChanged = false;
    const now = Date.now();

    // If we haven't tracked any values yet, consider it changed to establish baseline
    if (
      consumerInfo.stateValues.size === 0 &&
      consumerInfo.classValues.size === 0 &&
      (consumerInfo.stateAccesses.size > 0 ||
        consumerInfo.classAccesses.size > 0)
    ) {
      return true;
    }

    // Check state values
    for (const [path, trackedValue] of consumerInfo.stateValues) {
      try {
        const currentValue = this.getValueAtPath(newState, path);
        if (currentValue !== trackedValue.value) {
          consumerInfo.stateValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        hasChanged = true;
      }
    }

    // Check class getter values
    for (const [path, trackedValue] of consumerInfo.classValues) {
      try {
        const currentValue = this.getValueAtPath(newBlocInstance, path);
        if (currentValue !== trackedValue.value) {
          consumerInfo.classValues.set(path, {
            value: currentValue,
            lastAccessTime: now,
          });
          hasChanged = true;
        }
      } catch (error) {
        hasChanged = true;
      }
    }

    return hasChanged;
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return false;

    // Check if any changed paths match tracked dependencies
    for (const changedPath of changedPaths) {
      if (consumerInfo.stateAccesses.has(changedPath)) return true;
      if (consumerInfo.classAccesses.has(changedPath)) return true;

      // Check for nested path changes
      for (const trackedPath of consumerInfo.stateAccesses) {
        if (
          changedPath.startsWith(trackedPath + '.') ||
          trackedPath.startsWith(changedPath + '.')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  updateLastNotified(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.lastNotified = Date.now();
    }
  }

  getConsumerInfo(consumerRef: object): ConsumerInfo | undefined {
    return this.consumers.get(consumerRef);
  }

  setHasRendered(consumerRef: object, hasRendered: boolean): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.hasRendered = hasRendered;
    }
  }

  hasConsumer(consumerRef: object): boolean {
    return this.consumers.has(consumerRef);
  }

  getStats() {
    return {
      totalRegistrations: this.registrationCount,
      activeConsumers: this.activeConsumers,
    };
  }

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
