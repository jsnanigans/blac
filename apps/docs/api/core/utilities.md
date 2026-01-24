---
outline: [2, 3]
---

# Utilities

Helper functions, ID generation, and type utilities

<small>[← Back to @blac/core](./index.md)</small>

## Quick Reference

**Functions:** [`generateIsolatedKey`](#generateisolatedkey), [`isIsolatedClass`](#isisolatedclass)

**Type:** [`BlacOptions`](#blacoptions)

**Constant:** [`globalRegistry`](#globalregistry)

## Functions

### generateIsolatedKey

Generate a unique isolated instance key Uses base36 encoding for compact, URL-safe identifiers

Format: "isolated-{9-char-random-string}" Example: "isolated-k7x2m9p4q"

```typescript
export declare function generateIsolatedKey(): string;
```

**Returns:** A unique isolated instance key

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

## Constants

### globalRegistry

Global default registry instance

```typescript
globalRegistry: StateContainerRegistry
```

