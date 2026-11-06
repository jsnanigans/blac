import type { Vec } from './cables';

/**
 * A patch cable as a verlet rope: `n` points joined by sticks of equal rest
 * length, under gravity. Either end can be pinned (seated in a jack) or free.
 */
export interface Rope {
  pts: Vec[];
  prev: Vec[];
  /** Rest length of one stick. */
  seg: number;
  /** Frames in a row the rope barely moved; it sleeps after a few. */
  still: number;
}

export interface Pointer {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface RopeForces {
  gravity?: number;
  /** Velocity kept per step, 0–1. */
  damping?: number;
  /** Cursor that brushes the cable aside and drags it along. */
  pointer?: Pointer | null;
  reach?: number;
  /** Sideways breeze, px/s². */
  wind?: number;
}

const STEP = 1 / 60;

/** The natural length of a cable from `a` to `b`: a little longer than the gap, so it hangs. */
export const slackLength = (a: Vec, b: Vec, slack = 1.14, extra = 28) =>
  Math.hypot(b.x - a.x, b.y - a.y) * slack + extra;

export function createRope(a: Vec, b: Vec, n: number, length: number): Rope {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Start in a hanging arc, so the first frames don't snap.
    const sag = Math.sin(Math.PI * t) * length * 0.18;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + sag });
  }
  return {
    pts,
    prev: pts.map((p) => ({ ...p })),
    seg: length / (n - 1),
    still: 0,
  };
}

/** Retune the rope's length (e.g. after a layout change) without a jolt. */
export function setLength(rope: Rope, length: number, rate = 0.12) {
  const target = length / (rope.pts.length - 1);
  rope.seg += (target - rope.seg) * rate;
}

/** A rope point held in place: a seated plug, the stiff boot behind it, or the cursor. */
export interface Pin {
  i: number;
  x: number;
  y: number;
}

/**
 * Pins for a cable's ends. A seated end also holds the next point straight out
 * along `out`, so the cable leaves the jack like a stiff boot, then sags.
 */
export function endPins(
  rope: Rope,
  a: Vec | null,
  aOut: Vec | null,
  b: Vec | null,
  bOut: Vec | null,
): Pin[] {
  const n = rope.pts.length;
  const pins: Pin[] = [];
  const s = rope.seg;
  if (a) {
    pins.push({ i: 0, ...a });
    if (aOut) pins.push({ i: 1, x: a.x + aOut.x * s, y: a.y + aOut.y * s });
  }
  if (b) {
    pins.push({ i: n - 1, ...b });
    if (bOut) pins.push({ i: n - 2, x: b.x + bOut.x * s, y: b.y + bOut.y * s });
  }
  return pins;
}

/** Advance the rope by `dt` seconds with `pins` held. Returns true while it is still moving. */
export function stepRope(
  rope: Rope,
  pins: readonly Pin[],
  dt: number,
  f: RopeForces = {},
): boolean {
  const steps = Math.min(4, Math.max(1, Math.round(dt / STEP)));
  const g = f.gravity ?? 1500;
  const damp = f.damping ?? 0.985;
  const { pts, prev } = rope;
  const n = pts.length;
  const held = new Set(pins.map((p) => p.i));
  let motion = 0;
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = prev[i]!;
      const vx = (p.x - q.x) * damp;
      const vy = (p.y - q.y) * damp;
      q.x = p.x;
      q.y = p.y;
      p.x += vx + (f.wind ?? 0) * STEP * STEP;
      p.y += vy + g * STEP * STEP;
      motion += Math.abs(vx) + Math.abs(vy);
    }
    const ptr = f.pointer;
    if (ptr) {
      const reach = f.reach ?? 48;
      for (let i = 0; i < n; i++) {
        if (held.has(i)) continue;
        const p = pts[i]!;
        const dx = p.x - ptr.x;
        const dy = p.y - ptr.y;
        const d = Math.hypot(dx, dy);
        if (d >= reach || d < 0.001) continue;
        const k = 1 - d / reach;
        // Brushed aside, and dragged a little along with the cursor.
        p.x += (dx / d) * k * k * 2.2 + ptr.vx * STEP * k * 0.5;
        p.y += (dy / d) * k * k * 2.2 + ptr.vy * STEP * k * 0.5;
      }
    }
    for (let it = 0; it < 10; it++) {
      for (const pin of pins) {
        pts[pin.i]!.x = pin.x;
        pts[pin.i]!.y = pin.y;
      }
      for (let i = 0; i < n - 1; i++) {
        const p = pts[i]!;
        const q = pts[i + 1]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - rope.seg) / d) * 0.5;
        const pinP = held.has(i);
        const pinQ = held.has(i + 1);
        if (pinP && pinQ) continue;
        const wp = pinP ? 0 : pinQ ? 2 : 1;
        const wq = pinQ ? 0 : pinP ? 2 : 1;
        p.x += dx * diff * wp;
        p.y += dy * diff * wp;
        q.x -= dx * diff * wq;
        q.y -= dy * diff * wq;
      }
    }
  }
  for (const pin of pins) {
    pts[pin.i]!.x = pin.x;
    pts[pin.i]!.y = pin.y;
  }
  rope.still = motion / (n * steps) < 0.02 ? rope.still + 1 : 0;
  return rope.still < 20;
}

/** Shove the rope sideways around point `i`, e.g. a pluck or a seat recoil. */
export function kick(rope: Rope, i: number, vx: number, vy: number) {
  const n = rope.pts.length;
  for (let j = 1; j < n - 1; j++) {
    const k = Math.max(0, 1 - Math.abs(j - i) / (n * 0.35));
    rope.prev[j]!.x -= vx * k * STEP;
    rope.prev[j]!.y -= vy * k * STEP;
  }
  rope.still = 0;
}

/** The point nearest `p`, and how far it is. */
export function nearest(rope: Rope, p: Vec) {
  let best = 0;
  let dist = Infinity;
  rope.pts.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return { i: best, dist };
}

/** Catmull-Rom through the rope's points, `k` samples per stick, for drawing. */
export function smooth(pts: readonly Vec[], k = 3): Vec[] {
  const out: Vec[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    for (let s = 0; s < k; s++) {
      const t = s / k;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push({
        x: c(p0.x, p1.x, p2.x, p3.x),
        y: c(p0.y, p1.y, p2.y, p3.y),
      });
    }
  }
  out.push({ ...pts[n - 1]! });
  return out;
}

/** The point `t` (0–1) of the way along a polyline, by length. */
export function along(pts: readonly Vec[], t: number): Vec {
  let total = 0;
  for (let i = 1; i < pts.length; i++)
    total += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  let left = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d) {
      const u = d ? left / d : 0;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    left -= d;
  }
  return { ...pts[pts.length - 1]! };
}

/** Unit direction the cable leaves end `which` (pointing away from the plug, along the cable). */
export function endDir(pts: readonly Vec[], which: 'a' | 'b'): Vec {
  const n = pts.length;
  const [p, q] =
    which === 'a'
      ? [pts[0]!, pts[Math.min(2, n - 1)]!]
      : [pts[n - 1]!, pts[Math.max(0, n - 3)]!];
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}
