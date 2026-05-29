/**
 * Public type aliases shared across the spatial package.
 * Concrete representations live in their respective implementation files.
 */

/** A 2D axis-aligned rectangle in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Damage classification — determines which render-pipeline stages run. */
export type DamageKind = 'paint' | 'layout' | 'data';

/** A single damage entry. `node` is optional — root-level damage may omit it. */
export interface Damage {
  rect: Rect;
  kind: DamageKind;
  node?: unknown;
}

/** The Region type of the spatial DirtyChannel. */
export type DirtyRegion = readonly Damage[];
