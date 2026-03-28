import { safeSerialize } from '../serialization/serialize';

export interface GetterInfo {
  value: unknown;
  error?: string;
  dependsOn?: string[];
}

const BASE_GETTERS = new Set([
  'state',
  'dependencies',
  'isDisposed',
  'hydrationStatus',
  'hydrationError',
  'isHydrated',
  'changedWhileHydrating',
]);

// Reentrancy guard to prevent infinite loops when evaluating getters
// triggers state changes on other blocs
let enumerating = false;

/**
 * Check if a function looks like a depend() getter (zero-arity arrow function).
 * depend() returns `() => getRegistry().ensure(Type, instanceKey)` — these are
 * always arrow functions with length 0. This filters out user methods like
 * `addTodo`, `emit`, `patch`, etc. which take arguments or are prototype methods.
 */
// oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isDependGetter(instance: any, key: string, fn: Function): boolean {
  if (fn.length !== 0) return false;
  // Must be an own property (depend() assigns to instance fields, not prototype)
  if (!Object.prototype.hasOwnProperty.call(instance, key)) return false;
  // Prototype methods (emit, patch, update, dispose, etc.) are never depend getters
  const proto = Object.getPrototypeOf(instance);
  if (proto && key in proto) return false;
  return true;
}

/**
 * Build a map of field names to dependency class names.
 * Only probes functions that match the depend() getter signature
 * (zero-arity own-property arrow functions) to avoid calling
 * user methods that could trigger state changes.
 */
function buildDependencyFieldMap(instance: any): Map<string, string> {
  const fieldMap = new Map<string, string>();
  const deps: ReadonlyMap<{ name: string }, string> | undefined =
    instance.dependencies;
  if (!deps || deps.size === 0) return fieldMap;

  // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const depConstructors = new Map<Function, string>();
  for (const [TypeClass] of deps) {
    depConstructors.set(
      // oxlint-disable-next-line @typescript-eslint/no-unsafe-function-type
      TypeClass as unknown as Function,
      (TypeClass as any).name ?? '',
    );
  }

  const targetCount = depConstructors.size;

  for (const key of Object.getOwnPropertyNames(instance)) {
    if (fieldMap.size >= targetCount) break;

    const value = instance[key];
    if (typeof value !== 'function') continue;
    if (!isDependGetter(instance, key, value)) continue;

    try {
      const result = value.call(instance);
      if (result && typeof result === 'object' && result.constructor) {
        const className = depConstructors.get(result.constructor);
        if (className) {
          fieldMap.set(key, className);
        }
      }
    } catch {
      // not a dependency getter, skip
    }
  }

  return fieldMap;
}

/**
 * Collect all user-defined getter names from the prototype chain,
 * stopping before the base StateContainer prototype.
 */
function collectGetterDescriptors(
  instance: any,
): Map<string, PropertyDescriptor> {
  const getters = new Map<string, PropertyDescriptor>();
  let proto = Object.getPrototypeOf(instance);

  while (proto && proto !== Object.prototype) {
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    for (const [name, desc] of Object.entries(descriptors)) {
      if (desc.get && !BASE_GETTERS.has(name) && !getters.has(name)) {
        getters.set(name, desc);
      }
    }

    proto = Object.getPrototypeOf(proto);
  }

  return getters;
}

/**
 * Enumerate all user-defined getters on a StateContainer instance.
 * Evaluates each getter, serializes the result, and tracks which
 * `depend()`-created fields are accessed per getter.
 */
export function enumerateGetters(
  instance: any,
): Record<string, GetterInfo> | undefined {
  // Reentrancy guard: if evaluating a getter triggers a state change on
  // another bloc, that bloc's onStateChanged will call enumerateGetters
  // again. Skip nested calls to break the cycle.
  if (enumerating) return undefined;

  const getterDescriptors = collectGetterDescriptors(instance);
  if (getterDescriptors.size === 0) return undefined;

  enumerating = true;
  try {
    const depFieldMap = buildDependencyFieldMap(instance);

    const result: Record<string, GetterInfo> = {};

    for (const [name, descriptor] of getterDescriptors) {
      const accessedDeps: string[] = [];

      try {
        let target: any;

        if (depFieldMap.size > 0) {
          target = new Proxy(instance, {
            get(obj, prop, receiver) {
              if (typeof prop === 'string') {
                const depClass = depFieldMap.get(prop);
                if (depClass && !accessedDeps.includes(depClass)) {
                  accessedDeps.push(depClass);
                }
              }
              return Reflect.get(obj, prop, receiver);
            },
          });
        } else {
          target = instance;
        }

        const rawValue = descriptor.get?.call(target);
        const serialized = safeSerialize(rawValue);

        result[name] = {
          value: serialized.success ? serialized.data : String(rawValue),
          ...(accessedDeps.length > 0 ? { dependsOn: accessedDeps } : {}),
        };
      } catch (err) {
        result[name] = {
          value: undefined,
          error: err instanceof Error ? err.message : String(err),
          ...(accessedDeps.length > 0 ? { dependsOn: accessedDeps } : {}),
        };
      }
    }

    return result;
  } finally {
    enumerating = false;
  }
}
