---
outline: [2, 3]
---

# Utilities

Helper functions, ID generation, and type utilities

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Functions:** [`createIdGenerator`](#createidgenerator), [`generateId`](#generateid), [`generateIsolatedKey`](#generateisolatedkey), [`generateSimpleId`](#generatesimpleid), [`getStaticProp`](#getstaticprop), [`isExcludedFromDevTools`](#isexcludedfromdevtools), [`isIsolatedClass`](#isisolatedclass), [`isIsolatedKey`](#isisolatedkey), [`isKeepAliveClass`](#iskeepaliveclass)

**Types:** [`BlacOptions`](#blacoptions), [`Brand`](#brand), [`BrandedId`](#brandedid), [`InstanceId`](#instanceid)

**Constants:** [`BLAC_DEFAULTS`](#blac_defaults), [`BLAC_ERROR_PREFIX`](#blac_error_prefix), [`BLAC_ID_PATTERNS`](#blac_id_patterns), [`BLAC_STATIC_PROPS`](#blac_static_props), [`globalRegistry`](#globalregistry)

## Functions

### createIdGenerator

Creates an ID generator with isolated counter state

```typescript
export declare function createIdGenerator(prefix: string): {
    next: () => string;
    nextSimple: () => string;
    reset: () => void;
};
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for generated IDs |

**Returns:** Object with next(), nextSimple(), and reset() methods

**Examples:**

```ts
const generator = createIdGenerator('sub');
const id1 = generator.next(); // "sub:1698765432100_1_a3k9d7f2q"
const id2 = generator.next(); // "sub:1698765432101_2_b4n8e9g3r"
```

---

### generateId

Generate ID with timestamp, counter, and random suffix (tree-shakeable)

Format: `${prefix}:${timestamp}_${counter}_${random}`

```typescript
export declare function generateId(prefix: string): string;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for the ID (e.g., 'sub', 'consumer', 'stage') |

**Returns:** Branded ID string

**Examples:**

```typescript
const id = generateId('sub'); // Returns: "sub:1698765432100_1_a3k9d7f2q"
```

---

### generateIsolatedKey

Generate a unique isolated instance key Uses base36 encoding for compact, URL-safe identifiers

Format: "isolated-{9-char-random-string}" Example: "isolated-k7x2m9p4q"

```typescript
export declare function generateIsolatedKey(): string;
```

**Returns:** A unique isolated instance key

---

### generateSimpleId

Generate simple ID with timestamp and random (no counter tracking)

Format: `${prefix}:${timestamp}_${random}`

```typescript
export declare function generateSimpleId(prefix: string, affix?: string): string;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prefix` | `string` | Prefix for the ID |
| `affix` | `string` |  |

**Returns:** Branded ID string

**Examples:**

```ts
const id = generateSimpleId('CounterBloc');
// Returns: "CounterBloc:1698765432100_a3k9d7f2q"
```

---

### getStaticProp

Get a static property from a class constructor Type-safe helper that avoids (Type as any) casts

```typescript
export declare function getStaticProp<V, T extends StateContainerConstructor = StateContainerConstructor>(Type: T, propName: string, defaultValue?: V): V | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `T` | The class constructor |
| `propName` | `string` | The property name to access |
| `defaultValue` | `V` | Optional default value if property is undefined |

**Returns:** The property value or default

---

### isExcludedFromDevTools

Check if a class should be excluded from DevTools. Used to prevent infinite loops when DevTools tracks itself.

```typescript
export declare function isExcludedFromDevTools<T extends StateContainerConstructor>(Type: T): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `T` | The class constructor to check |

**Returns:** true if the class has `static __excludeFromDevTools = true`

---

### isIsolatedClass

Check if a class is marked as isolated. Isolated classes create separate instances per component.

```typescript
export declare function isIsolatedClass<T extends StateContainerConstructor>(Type: T): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `T` | The class constructor to check |

**Returns:** true if the class has `static isolated = true`

---

### isIsolatedKey

Check if a key is an isolated instance key

```typescript
export declare function isIsolatedKey(key: string): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The instance key to check |

**Returns:** true if the key is an isolated instance key

---

### isKeepAliveClass

Check if a class is marked as keepAlive. KeepAlive classes are never auto-disposed when ref count reaches 0.

```typescript
export declare function isKeepAliveClass<T extends StateContainerConstructor>(Type: T): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `Type` | `T` | The class constructor to check |

**Returns:** true if the class has `static keepAlive = true`

---

## Types

### BlacOptions

Configuration options for the  @blac decorator. Only one option can be specified at a time (union type).

```typescript
export type BlacOptions = 
/** Mark bloc as isolated (each component gets its own instance) */
{
    isolated: true;
}
/** Mark bloc to never be auto-disposed when ref count reaches 0 */
 | {
    keepAlive: true;
}
/** Exclude bloc from DevTools tracking (prevents infinite loops) */
 | {
    excludeFromDevTools: true;
};
```

### Brand

Utility type for creating branded/nominal types. Prevents accidental type confusion between similar primitive types.  @template T - The base type  @template B - The brand identifier

```typescript
export type Brand<T, B> = T & {
    [brand]: B;
};
```

### BrandedId

Branded string type for type-safe IDs.  @template B - The brand identifier

```typescript
export type BrandedId<B> = Brand<string, B>;
```

### InstanceId

Branded string type for state container instance IDs

```typescript
export type InstanceId = Brand<string, 'InstanceId'>;
```

## Constants

### BLAC_DEFAULTS

Default configuration constants for BlaC

```typescript
BLAC_DEFAULTS: {
    readonly DEFAULT_INSTANCE_KEY: "default";
    readonly MAX_GETTER_DEPTH: 10;
    readonly CLEANUP_INTERVAL_MS: 30000;
    readonly WEAKREF_CLEANUP_INTERVAL_MS: 10000;
    readonly MAX_SUBSCRIPTIONS: 1000;
    readonly MAX_SUBSCRIPTIONS_HIGH_PERF: 10000;
    readonly PIPELINE_TIMEOUT_MS: 5000;
    readonly CLEANUP_INTERVAL_HIGH_PERF_MS: 5000;
    readonly MAX_PIPELINE_STAGES: 30;
}
```

### BLAC_ERROR_PREFIX

Standard error message prefix

```typescript
BLAC_ERROR_PREFIX: "[BlaC]"
```

### BLAC_ID_PATTERNS

ID generation patterns and constants

```typescript
BLAC_ID_PATTERNS: {
    readonly ISOLATED_PREFIX: "isolated-";
    readonly ID_LENGTH: 9;
}
```

### BLAC_STATIC_PROPS

Static property names for StateContainer classes Used for feature flags and configuration on bloc classes

```typescript
BLAC_STATIC_PROPS: {
    readonly ISOLATED: "isolated";
    readonly KEEP_ALIVE: "keepAlive";
    readonly EXCLUDE_FROM_DEVTOOLS: "__excludeFromDevTools";
}
```

### globalRegistry

Global default registry instance

```typescript
globalRegistry: StateContainerRegistry
```

