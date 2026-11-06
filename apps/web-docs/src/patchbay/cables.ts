export type Vec = { x: number; y: number };
export type Tone = 'cable' | 'cobalt' | 'rose';

export interface CableSpec {
  id: string;
  /** The jack the cable leaves (on a module). */
  from: HTMLElement;
  /** The input it plugs into (on a component). */
  to: HTMLElement;
  tone?: Tone;
}

/** One end of a cable: its plug, drawn at `at` facing back along `dir`. */
export interface ScenePlug {
  at: Vec;
  /** Unit vector from the plug along the cable. */
  dir: Vec;
  /** 0 = seated flush, 1 = pulled out toward the viewer. */
  lift: number;
}

export interface SceneCable {
  id: string;
  /** The cable's centre line, smoothed, end to end. */
  pts: Vec[];
  tone: Tone;
  /** 0 = idle, 1 = a signal is on it right now. */
  heat: number;
  /** 0–1: the cursor is on it. */
  hover: number;
  /** 0–1: fades out as an unplugged cable retracts. */
  alpha: number;
  plugs: ScenePlug[];
}

export interface ScenePulse {
  at: Vec;
  /** Points behind the pulse, nearest first. */
  trail: Vec[];
}

/** A plug seating: a ring of light that grows and fades over `t` 0 → 1. */
export interface SceneSpark {
  at: Vec;
  t: number;
}

export interface Scene {
  width: number;
  height: number;
  /** The view extends this far past the bay on every side (plugs pulled out of it). */
  margin: number;
  cables: SceneCable[];
  pulses: ScenePulse[];
  sparks: SceneSpark[];
}

/** Draws a scene; the SVG and insomni backends implement it. */
export interface CableView {
  draw(scene: Scene): void;
  destroy(): void;
}

/** Centre of `el` relative to `box`. */
export const center = (el: HTMLElement, box: DOMRect): Vec => {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - box.left,
    y: r.top + r.height / 2 - box.top,
  };
};

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
