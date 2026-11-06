/// <reference types="@webgpu/types" />
import { rgba, type Color, type Layer } from 'insomni';
import type { ScenePlug, Vec } from './cables';

/**
 * Cel-shaded drawing on insomni layers, matching the logo: flat tone bands
 * (shade, base, light) with the light from the top left, an ink outline and a
 * hard drop shadow.
 */

export type Rgb = [number, number, number];
export interface Shades {
  lo: Rgb;
  base: Rgb;
  hi: Rgb;
}

/** Light comes from the top left: highlights shift this way, shadows the other. */
export const LIGHT: Vec = { x: -0.45, y: -0.89 };

export const mix = (a: Rgb, b: Rgb, t: number): Rgb =>
  [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as Rgb;
export const col = ([r, g, b]: Rgb, a = 1): Color => rgba(r, g, b, a);
const shift = (pts: readonly Vec[], d: number): Vec[] =>
  pts.map((p) => ({ x: p.x + LIGHT.x * d, y: p.y + LIGHT.y * d }));

export interface CableLook {
  width: number;
  ink: Rgb;
  alpha?: number;
}

/** The hard shadow a cable casts on the panel behind it. */
export function cableShadow(
  layer: Layer,
  pts: readonly Vec[],
  width: number,
  offset: Vec,
  color: Rgb,
  alpha: number,
) {
  layer.pushStroke({
    points: pts.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
    color: col(color, alpha),
    width: width + 2,
    cap: 'round',
    join: 'round',
  });
}

export function cable(
  layer: Layer,
  pts: readonly Vec[],
  s: Shades,
  { width: w, ink, alpha = 1 }: CableLook,
) {
  const stroke = (points: readonly Vec[], color: Rgb, width: number) =>
    layer.pushStroke({
      points,
      color: col(color, alpha),
      width,
      cap: 'round',
      join: 'round',
    });
  stroke(pts, ink, w + 2.6);
  stroke(pts, s.lo, w);
  stroke(shift(pts, w * 0.17), s.base, w * 0.62);
  stroke(shift(pts, w * 0.34), s.hi, Math.max(1, w * 0.2));
}

const along = (p: Vec, d: Vec, k: number): Vec => ({
  x: p.x + d.x * k,
  y: p.y + d.y * k,
});

/** A straight cel-shaded bar from `a` to `b`: outline, shade, base and a lit stripe. */
function bar(
  layer: Layer,
  a: Vec,
  b: Vec,
  w: number,
  s: Shades,
  ink: Rgb,
  alpha: number,
  cap: 'round' | 'butt' = 'round',
) {
  const line = (pts: Vec[], c: Rgb, width: number) =>
    layer.pushStroke({ points: pts, color: col(c, alpha), width, cap });
  line([a, b], ink, w + 2.6);
  line([a, b], s.lo, w);
  line(shift([a, b], w * 0.16), s.base, w * 0.64);
  line(shift([a, b], w * 0.33), s.hi, Math.max(1, w * 0.16));
}

export interface PlugLook {
  /** Scale of the whole plug; a bay plug is 1. */
  size: number;
  body: Shades;
  sleeve: Shades;
  ink: Rgb;
  shadow: Rgb;
  alpha?: number;
}

/**
 * A jack plug seen from the front three-quarters: a metal sleeve at the socket,
 * a grip body with two ridges, and a boot tapering into the cable. Lifted plugs
 * grow and cast a longer shadow, as if pulled toward the viewer.
 */
export function plug(layer: Layer, p: ScenePlug, look: PlugLook) {
  const { body, sleeve, ink, shadow, alpha = 1 } = look;
  const k = look.size * (1 + p.lift * 0.28);
  const d = p.dir;
  const tip = p.at;
  const s0 = along(tip, d, 1 * k);
  const s1 = along(tip, d, 6 * k);
  const b1 = along(tip, d, 19 * k);
  const boot = along(tip, d, 26 * k);
  const off = { x: (5 + 12 * p.lift) * k, y: (7 + 16 * p.lift) * k };
  layer.pushStroke({
    points: [s0, boot].map((q) => ({ x: q.x + off.x, y: q.y + off.y })),
    color: col(shadow, 0.42 * alpha * (1 - p.lift * 0.35)),
    width: 12 * k,
    cap: 'round',
  });
  bar(layer, s0, s1, 9 * k, sleeve, ink, alpha, 'butt');
  bar(layer, s1, b1, 11 * k, body, ink, alpha);
  // Grip ridges.
  const n = { x: -d.y, y: d.x };
  for (const t of [10, 14]) {
    const c = along(tip, d, t * k);
    layer.pushStroke({
      points: [along(c, n, -4.2 * k), along(c, n, 4.2 * k)],
      color: col(body.lo, alpha),
      width: 1.6 * k,
      cap: 'round',
    });
  }
  layer.pushCurve({
    p0: b1,
    p1: along(b1, d, 2 * k),
    p2: along(b1, d, 5 * k),
    p3: boot,
    color: col(body.lo, alpha),
    widthStart: 8 * k,
    widthEnd: 4 * k,
  });
  if (p.lift > 0.05) {
    // Pulled out: the bare tip shows past the sleeve.
    const t1 = along(tip, d, -6 * k * p.lift);
    layer.pushStroke({
      points: [s0, t1],
      color: col(sleeve.hi, alpha),
      width: 3.4 * k,
      cap: 'round',
    });
  }
}

/** A plug seating: a ring and a few sparks that grow and fade. */
export function spark(layer: Layer, at: Vec, t: number, hot: Rgb, lit: Rgb) {
  const a = 1 - t;
  layer.pushCircle({
    cx: at.x,
    cy: at.y,
    radius: 6 + 22 * t,
    stroke: col(lit, 0.8 * a),
    strokeWidth: 2.5 * a + 0.5,
  });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.4;
    const d = { x: Math.cos(ang), y: Math.sin(ang) };
    layer.pushStroke({
      points: [along(at, d, 9 + 14 * t), along(at, d, 13 + 22 * t)],
      color: col(hot, a),
      width: 2 * a + 0.5,
      cap: 'round',
    });
  }
}
