import { ConsumerTracker } from '../tracking/ConsumerTracker';

export class ProxyFactory {
  static createStateProxy<T extends object>(
    target: T,
    consumerRef: object,
    consumerTracker: ConsumerTracker,
    path: string = ''
  ): T {
    if (!consumerRef || !consumerTracker) {
      return target;
    }
    
    if (typeof target !== 'object' || target === null) {
      return target;
    }
    
    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        if (typeof prop === 'symbol') {
          return Reflect.get(obj, prop);
        }
        
        const fullPath = path ? `${path}.${prop}` : prop;
        
        // Track the access
        consumerTracker.trackAccess(consumerRef, 'state', fullPath);
        
        const value = Reflect.get(obj, prop);
        
        // Only proxy plain objects, not arrays or other built-ins
        if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
          return ProxyFactory.createStateProxy(value, consumerRef, consumerTracker, fullPath);
        }
        
        return value;
      },
      
      set(): boolean {
        // State should not be mutated directly. Use emit() or patch() methods.
        return false;
      },
      
      deleteProperty(): boolean {
        // State properties should not be deleted directly.
        return false;
      }
    };
    
    return new Proxy(target, handler);
  }
  
  static createClassProxy<T extends object>(
    target: T,
    consumerRef: object,
    consumerTracker: ConsumerTracker
  ): T {
    if (!consumerRef || !consumerTracker) {
      return target;
    }
    
    const handler: ProxyHandler<T> = {
      get(obj: T, prop: string | symbol): any {
        if (typeof prop === 'symbol') {
          return Reflect.get(obj, prop);
        }
        
        const value = Reflect.get(obj, prop);
        
        // Track method calls
        if (typeof value === 'function') {
          consumerTracker.trackAccess(consumerRef, 'class', prop);
          return value.bind(obj);
        }
        
        // Track property access
        consumerTracker.trackAccess(consumerRef, 'class', prop);
        return value;
      }
    };
    
    return new Proxy(target, handler);
  }
}