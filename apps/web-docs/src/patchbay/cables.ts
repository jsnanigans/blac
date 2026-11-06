export type Vec = { x: number; y: number };
export type Tone = 'cable' | 'cobalt' | 'rose';
export type Curve = readonly [Vec, Vec, Vec, Vec];

export interface CableSpec {
  id: string;
  /** The jack the cable leaves (on a module). */
  from: HTMLElement;
  /** The input it plugs into (on a component). */
  to: HTMLElement;
  tone?: Tone;
}

export interface SceneCable {
  id: string;
  curve: Curve;
  tone: Tone;
  /** 0 = idle, 1 = a signal is on it right now. */
  heat: number;
}

export interface ScenePulse {
  curve: Curve;
  at: Vec;
  /** 0 → 1 over the pulse's trip. */
  t: number;
}

export interface Scene {
  width: number;
  height: number;
  cables: SceneCable[];
  pulses: ScenePulse[];
}

/** Draws a scene; the SVG and insomni backends implement it. */
export interface CableView {
  draw(scene: Scene): void;
  destroy(): void;
}

const center = (el: HTMLElement, box: DOMRect): Vec => {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - box.left,
    y: r.top + r.height / 2 - box.top,
  };
};

/** A patch cable from `a` to `b`: it leaves along the dominant axis and sags under its own weight. */
export function cableCurve(a: Vec, b: Vec): Curve {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(70, 14 + dist * 0.12);
  if (Math.abs(dx) >= Math.abs(dy)) {
    const k = Math.abs(dx) * 0.42;
    const s = Math.sign(dx) || 1;
    return [
      a,
      { x: a.x + k * s, y: a.y + sag },
      { x: b.x - k * s, y: b.y + sag },
      b,
    ];
  }
  const k = Math.abs(dy) * 0.5;
  const s = Math.sign(dy) || 1;
  return [
    a,
    { x: a.x + sag * 0.6, y: a.y + k * s },
    { x: b.x + sag * 0.6, y: b.y - k * s },
    b,
  ];
}

export function pointAt([p0, p1, p2, p3]: Curve, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

export function measure(
  container: HTMLElement,
  specs: CableSpec[],
): SceneCable[] {
  const box = container.getBoundingClientRect();
  return specs
    .filter((s) => s.from.isConnected && s.to.isConnected)
    .map((s) => ({
      id: s.id,
      curve: cableCurve(center(s.from, box), center(s.to, box)),
      tone: s.tone ?? 'cable',
      heat: 0,
    }));
}

/** Reads a colour token as `[r, g, b]` in 0–1 (tokens are hex). */
export function tokenRgb(el: Element, name: string): [number, number, number] {
  const hex = getComputedStyle(el)
    .getPropertyValue(name)
    .trim()
    .replace('#', '');
  const n = parseInt(
    hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex,
    16,
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
