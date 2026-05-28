/**
 * Public type aliases shared across the package's modules.
 * Concrete representations live in their respective implementation files.
 */

/** An interned identifier for a path through state. Stable per Container class. */
export type PathId = number;

/** Opaque consumer identifier. */
export type ConsumerId = string | symbol;
