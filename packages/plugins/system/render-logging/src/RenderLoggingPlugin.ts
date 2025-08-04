import { BlacPlugin, AdapterMetadata, Blac, RerenderLogger, RerenderInfo, RerenderReason } from '@blac/core';

export interface RenderLoggingConfig {
  enabled: boolean;
  level?: 'minimal' | 'normal' | 'detailed';
  filter?: (params: { componentName: string; blocName: string }) => boolean;
  includeStackTrace?: boolean;
  groupRerenders?: boolean;
}

export class RenderLoggingPlugin implements BlacPlugin {
  readonly name = 'RenderLoggingPlugin';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true,
  };

  private config: RenderLoggingConfig;
  private adapterLastState = new WeakMap<any, any>();
  private adapterLastDependencies = new WeakMap<any, any[]>();

  constructor(config: RenderLoggingConfig | boolean | 'minimal' | 'detailed' = true) {
    this.config = this.normalizeConfig(config);
  }

  updateConfig(config: RenderLoggingConfig | boolean | 'minimal' | 'detailed'): void {
    this.config = this.normalizeConfig(config);
    console.log('[RenderLoggingPlugin] Config updated:', this.config);
  }

  private normalizeConfig(config: RenderLoggingConfig | boolean | 'minimal' | 'detailed'): RenderLoggingConfig {
    if (typeof config === 'boolean') {
      return { enabled: config, level: 'normal' };
    }
    if (typeof config === 'string') {
      return { enabled: true, level: config === 'minimal' ? 'minimal' : 'detailed' };
    }
    return {
      enabled: config.enabled,
      level: config.level || 'normal',
      filter: config.filter,
      includeStackTrace: config.includeStackTrace,
      groupRerenders: config.groupRerenders,
    };
  }

  onAdapterCreated = (adapter: any, metadata: AdapterMetadata) => {
    // Initialize tracking for this adapter
    if (metadata.lastState !== undefined) {
      this.adapterLastState.set(adapter, metadata.lastState);
    }
    if (metadata.lastDependencyValues) {
      this.adapterLastDependencies.set(adapter, metadata.lastDependencyValues);
    }
  };
  
  onAdapterDisposed = (adapter: any, metadata: AdapterMetadata) => {
    // Clean up tracking for this adapter
    this.adapterLastState.delete(adapter);
    this.adapterLastDependencies.delete(adapter);
  };

  onAdapterRender = (adapter: any, metadata: AdapterMetadata) => {
    if (!this.config.enabled) return;

    const { componentName = 'Unknown', blocInstance, renderCount, isUsingDependencies, currentDependencyValues } = metadata;
    const blocName = blocInstance.constructor.name;
    
    // Apply filter if provided
    if (this.config.filter && !this.config.filter({ componentName, blocName })) {
      return;
    }
    
    const currentState = blocInstance.state;
    const lastState = this.adapterLastState.get(adapter);
    const savedLastDependencies = this.adapterLastDependencies.get(adapter);

    let reason: RerenderReason;

    if (renderCount === 1) {
      reason = {
        type: 'mount',
        description: 'Component mounted',
      };
    } else if (isUsingDependencies && currentDependencyValues) {
      // Check dependency changes
      const hasChanged = this.hasDependencyValuesChanged(
        savedLastDependencies,
        currentDependencyValues,
      );
      
      if (hasChanged) {
        const changedIndices: number[] = [];
        if (savedLastDependencies) {
          currentDependencyValues.forEach((val: any, i: number) => {
            if (!Object.is(val, savedLastDependencies![i])) {
              changedIndices.push(i);
            }
          });
        }
        
        reason = {
          type: 'dependency-change',
          description: `Manual dependencies changed: indices ${changedIndices.join(', ')}`,
          dependencies: currentDependencyValues.map((val: any, i: number) => {
            const changed = changedIndices.includes(i);
            return `dep[${i}]${changed ? ' (changed)' : ''}: ${JSON.stringify(val)}`;
          }),
        };
      } else {
        const stateChanges = this.getStateChangedPaths(lastState, currentState, metadata);
        if (stateChanges.length > 0) {
          reason = {
            type: 'state-change',
            description: `State changed: ${stateChanges.join(', ')}`,
            changedPaths: stateChanges,
            oldValues: this.getValuesForPaths(lastState, stateChanges),
            newValues: this.getValuesForPaths(currentState, stateChanges),
          };
        } else {
          reason = {
            type: 'unknown',
            description: 'Rerender with no detected changes',
          };
        }
      }
    } else {
      const stateChanges = this.getStateChangedPaths(lastState, currentState, metadata);
      if (stateChanges.length > 0) {
        reason = {
          type: 'state-change',
          description: `State changed: ${stateChanges.join(', ')}`,
          changedPaths: stateChanges,
          oldValues: this.getValuesForPaths(lastState, stateChanges),
          newValues: this.getValuesForPaths(currentState, stateChanges),
        };
      } else {
        reason = {
          type: 'unknown',
          description: 'Rerender with no detected changes',
        };
      }
    }

    // Update last values
    this.adapterLastState.set(adapter, currentState);
    if (currentDependencyValues) {
      this.adapterLastDependencies.set(adapter, currentDependencyValues);
    }

    // Log the rerender directly since we control the config
    const info: RerenderInfo = {
      componentName,
      blocName,
      blocId: String(blocInstance._id || 'unknown'),
      renderCount,
      reason,
      timestamp: Date.now(),
    };

    // RerenderLogger expects the config to exist, but we handle filtering and enabling ourselves
    // So we temporarily set the config for the logger
    const originalConfig = (Blac as any)._config;
    (Blac as any)._config = { 
      ...originalConfig,
      rerenderLogging: this.config 
    };
    
    // Debug: log the config being used
    if (this.config.level === 'detailed') {
      console.log('[RenderLoggingPlugin] Using config:', this.config);
    }
    
    RerenderLogger.logRerender(info);
    
    // Restore original config
    (Blac as any)._config = originalConfig;
  };

  private hasDependencyValuesChanged(oldValues: any[] | undefined, newValues: any[]): boolean {
    if (!oldValues) return true;
    if (oldValues.length !== newValues.length) return true;
    return oldValues.some((oldVal, i) => !Object.is(oldVal, newValues[i]));
  }

  private getStateChangedPaths(oldState: any, newState: any, metadata?: AdapterMetadata): string[] {
    const changedPaths: string[] = [];
    
    if (oldState === newState) return changedPaths;
    
    // If states are primitive values or one is null/undefined, entire state changed
    if (!oldState || typeof oldState !== 'object' || !newState || typeof newState !== 'object') {
      return ['(entire state)'];
    }
    
    // If metadata has tracked paths and proxy tracking is enabled, use those
    if (metadata && Blac.config.proxyDependencyTracking !== false) {
      // Debug logging
      if (this.config.level === 'detailed') {
        console.log('[RenderLoggingPlugin] getStateChangedPaths - metadata.trackedPaths:', metadata.trackedPaths);
      }
      if (metadata.trackedPaths && metadata.trackedPaths.length > 0) {
        // Check only tracked paths
        for (const path of metadata.trackedPaths) {
          // Skip internal paths
          if (path.startsWith('_class.')) continue;
          
          const oldValue = this.getValueAtPath(oldState, path);
          const newValue = this.getValueAtPath(newState, path);
          
          if (!Object.is(oldValue, newValue)) {
            changedPaths.push(path);
          }
        }
        
        return changedPaths.length > 0 ? changedPaths : [];
      } else {
        // Proxy tracking enabled but no paths tracked = entire state
        return ['(entire state)'];
      }
    }
    
    // Without proxy tracking, check all properties
    const oldKeys = Object.keys(oldState);
    const newKeys = Object.keys(newState);
    const allKeys = new Set([...oldKeys, ...newKeys]);
    
    // If the number of keys changed, it might be an entire state change
    const hasKeysChanged = oldKeys.length !== newKeys.length;
    
    for (const key of allKeys) {
      if (!Object.is(oldState[key], newState[key])) {
        changedPaths.push(key);
      }
    }
    
    // If all properties changed (or keys changed), report as entire state
    if (hasKeysChanged || changedPaths.length === allKeys.size) {
      return ['(entire state)'];
    }
    
    return changedPaths;
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

  private getValuesForPaths(state: any, paths: string[]): Record<string, any> {
    if (!state || typeof state !== 'object') {
      return { '(entire state)': state };
    }
    
    const values: Record<string, any> = {};
    for (const path of paths) {
      if (path === '(entire state)') {
        values[path] = state;
      } else {
        values[path] = state[path];
      }
    }
    return values;
  }
}