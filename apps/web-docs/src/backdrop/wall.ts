/**
 * The backdrop's wall: an endless rack of patch modules, cel-shaded like the
 * logo. Light comes in flat bands with halftone dots between them, from a
 * key light and from a lamp that follows the cursor. Every module has a jack
 * at the top; the rest varies (a second jack, a knob that turns to watch the
 * cursor, a fader). Panels marked `data-mount` cast hard shadows away from
 * the lamp, and signals send rings of amber across the wall.
 */

export const CELL = { w: 96, h: 120 } as const;
/** Every module's top jack, in its cell; the backdrop's cables plug in here. */
export const TOP_JACK = { x: 48, y: 46 } as const;
export const MAX_MOUNTS = 8;
export const MAX_RIPPLES = 6;

/** Floats in the uniform: see `struct U`. */
export const UNIFORM_FLOATS = 16 + 4 + 9 * 4 + MAX_RIPPLES * 4 + MAX_MOUNTS * 4;

export const WALL_WGSL = /* wgsl */ `
struct U {
  res: vec2f,
  time: f32,
  dpr: f32,
  pointer: vec2f,
  pointerOn: f32,
  fade: f32,
  par: vec2f,
  nMounts: f32,
  nRipples: f32,
  lamp: vec2f,
  lampOn: f32,
  _pad: f32,
  calm: vec4f,
  bg: vec4f,
  panel: vec4f,
  panelHi: vec4f,
  ink: vec4f,
  screw: vec4f,
  cobalt: vec4f,
  rose: vec4f,
  lit: vec4f,
  cable: vec4f,
  ripples: array<vec4f, ${MAX_RIPPLES}>,
  mounts: array<vec4f, ${MAX_MOUNTS}>,
}
@group(0) @binding(0) var<uniform> u: U;

const CELL = vec2f(${CELL.w}.0, ${CELL.h}.0);

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn sdBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

fn sdSeg(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

/** Coverage of a shape with signed distance d, antialiased over one device pixel. */
fn cover(d: f32) -> f32 {
  return clamp(0.5 - d * u.dpr, 0.0, 1.0);
}

/** Comic halftone: a dot screen at 45 degrees, 5px pitch. */
fn halftone(p: vec2f) -> f32 {
  let r = mat2x2f(0.7071, -0.7071, 0.7071, 0.7071) * p / 5.0;
  return length(fract(r) - 0.5) * 1.41;
}

/** Light quantised into flat bands, with halftone dots dithering each step. */
fn toon(i: f32, p: vec2f) -> f32 {
  let steps = 4.0;
  let x = clamp(i, 0.0, 1.0) * steps;
  let band = floor(x);
  let up = select(0.0, 1.0, halftone(p) < (x - band) * 0.9 - 0.05);
  return (band + up) / steps;
}

/** Light reaching wall point p (screen px) with surface normal n. */
fn lighting(p: vec2f, n: vec3f) -> f32 {
  let pos = vec3f(p, 0.0);
  // Key light: high on the top left, wide and dim.
  let key = vec3f(u.res.x * 0.12, -u.res.y * 0.4, 900.0);
  let lk = normalize(key - pos);
  let dk = length(key.xy - p) / max(u.res.x, u.res.y);
  var i = max(dot(n, lk), 0.0) * 0.34 * (1.0 - smoothstep(0.1, 1.2, dk));
  // The lamp that follows the cursor.
  let lamp = vec3f(u.lamp, 240.0);
  let ll = normalize(lamp - pos);
  let dl = length(lamp.xy - p);
  i += max(dot(n, ll), 0.0) * 0.75 * u.lampOn * (1.0 - smoothstep(40.0, 420.0, dl));
  return i;
}

/** Where the light that casts mount shadows sits: the lamp when it is on, else the key. */
fn caster() -> vec2f {
  return mix(vec2f(u.res.x * 0.12, -u.res.y * 0.4), u.lamp, u.lampOn);
}

/** 0–1: how much the mounted panels shadow p (hard edge, halftone fringe). */
fn mountShadow(p: vec2f) -> f32 {
  var s = 0.0;
  let src = caster();
  for (var k = 0; k < ${MAX_MOUNTS}; k++) {
    if (f32(k) >= u.nMounts) { break; }
    let m = u.mounts[k];
    let c = m.xy + m.zw * 0.5;
    let dir = normalize(c - src + vec2f(0.0, 0.001));
    let reach = 10.0 + 10.0 * u.lampOn;
    let off = dir * reach + vec2f(2.0, 4.0);
    let d = sdBox(p - c - off, m.zw * 0.5, 14.0);
    let core = select(0.0, 1.0, d < 0.0);
    let fringe = select(0.0, 0.6, d < 10.0 && halftone(p) < 0.55 * (1.0 - d / 10.0));
    // Contact shadow: a dark rim hugging the panel.
    let rim = select(0.0, 0.8, sdBox(p - c, m.zw * 0.5 + 5.0, 16.0) < 0.0);
    s = max(s, max(max(core * 0.75, fringe * 0.5), rim * 0.6));
  }
  return s;
}

/** Amber rings sent across the wall by signals. */
fn ripple(p: vec2f) -> f32 {
  var r = 0.0;
  for (var k = 0; k < ${MAX_RIPPLES}; k++) {
    if (f32(k) >= u.nRipples) { break; }
    let rp = u.ripples[k];
    let age = rp.z;
    let radius = age * 560.0;
    let d = abs(length(p - rp.xy) - radius);
    let fall = exp(-age * 2.6) * rp.w;
    r = max(r, select(0.0, fall, d < 2.0 + 10.0 * fall));
  }
  return r;
}

struct Surface {
  albedo: vec3f,
  n: vec3f,
  /** Light the surface gives off itself (LEDs). */
  glow: vec3f,
}

/** A cel-shaded nut of radius r with a hole: returns the surface, or none (a < 0). */
fn nut(f: vec2f, c: vec2f, r: f32, hole: f32, s: ptr<function, Surface>) -> f32 {
  let d = length(f - c);
  if (d > r + 1.5) { return -1.0; }
  if (d > r - 1.5) {
    (*s).albedo = u.ink.rgb;
    (*s).n = vec3f(0.0, 0.0, 1.0);
    return 1.0;
  }
  if (d < hole) {
    (*s).albedo = vec3f(0.0);
    return 1.0;
  }
  let q = (f - c) / r;
  (*s).albedo = mix(u.panel.rgb, u.screw.rgb, 0.55);
  (*s).n = normalize(vec3f(q * 1.1, 0.7));
  if (d < hole + 1.6) { (*s).albedo = u.ink.rgb; }
  return 1.0;
}

@fragment
fn fragment(@builtin(position) pos: vec4f, @location(0) uv: vec2f) -> @location(0) vec4f {
  let p = pos.xy / u.dpr;
  let w = p + u.par;
  let id = floor(w / CELL);
  let f = w - id * CELL;
  let h = hash(id);
  let h2 = hash(id + 17.0);

  var s: Surface;
  s.albedo = u.panel.rgb;
  s.n = vec3f(0.0, 0.0, 1.0);
  s.glow = vec3f(0.0);

  // Rack rail along the top of every row, with a screw per module.
  if (f.y < 12.0) {
    s.albedo = mix(u.bg.rgb, u.panel.rgb, 0.6);
    s.n = normalize(vec3f(0.0, select(0.0, -0.8, f.y < 3.0), 1.0));
    if (f.y > 9.0) { s.albedo = u.ink.rgb; }
    let sd = length(f - vec2f(${CELL.w / 2}.0, 6.0));
    if (sd < 3.5) {
      s.albedo = u.screw.rgb;
      s.n = normalize(vec3f((f - vec2f(${CELL.w / 2}.0, 6.0)) / 3.5, 0.8));
    }
  } else {
    // Seams between modules: an ink groove with a lit bevel beside it.
    if (f.x < 2.0) {
      s.albedo = u.ink.rgb;
    } else if (f.x < 3.5) {
      s.n = normalize(vec3f(-0.7, 0.0, 1.0));
      s.albedo = u.panelHi.rgb;
    } else {
      // Silkscreen: a short label line under the top jack.
      if (abs(f.y - 70.0) < 0.8 && abs(f.x - 48.0) < 14.0 + 8.0 * h2) {
        s.albedo = mix(u.panel.rgb, u.panelHi.rgb, 1.6);
      }
      // Every module has a jack at the top; the cables plug in here.
      nut(f, vec2f(${TOP_JACK.x}.0, ${TOP_JACK.y}.0), 11.0, 4.5, &s);
      if (h < 0.5) {
        nut(f, vec2f(48.0, 94.0), 11.0, 4.5, &s);
      } else if (h < 0.8) {
        // A knob that turns to watch the cursor (or drifts when it is away).
        let kc = vec2f(48.0, 95.0);
        let screen = id * CELL + kc - u.par;
        let toward = atan2(u.pointer.y - screen.y, u.pointer.x - screen.x);
        let idle = h2 * 6.28 + sin(u.time * 0.3 + h * 20.0) * 0.6;
        let ang = mix(idle, toward, u.pointerOn);
        let d = length(f - kc);
        if (d < 15.5) {
          if (d > 14.0) {
            s.albedo = u.ink.rgb;
          } else {
            s.albedo = mix(u.panel.rgb, u.panelHi.rgb, 0.9);
            s.n = normalize(vec3f((f - kc) / 14.0 * select(0.25, 1.0, d > 11.0), 0.8));
            let tip = kc + vec2f(cos(ang), sin(ang)) * 10.0;
            if (sdSeg(f, kc, tip) < 1.6) { s.albedo = u.ink.rgb; }
          }
        }
      } else {
        // A fader: an ink slot with a lit cap that drifts slowly.
        if (sdBox(f - vec2f(48.0, 98.0), vec2f(2.0, 16.0), 2.0) < 0.0) { s.albedo = u.ink.rgb; }
        let y = 98.0 + sin(u.time * 0.4 + h2 * 30.0) * 12.0;
        let cap = sdBox(f - vec2f(48.0, y), vec2f(9.0, 4.0), 2.0);
        if (cap < 1.5) {
          s.albedo = select(u.ink.rgb, u.screw.rgb, cap < 0.0);
          s.n = normalize(vec3f(0.0, select(0.6, -0.6, f.y < y), 1.0));
        }
      }
      // Status LED: mostly dark, a few breathe.
      let ld = length(f - vec2f(78.0, 24.0));
      if (ld < 4.0) {
        s.albedo = select(u.ink.rgb, u.bg.rgb, ld < 2.8);
        if (h2 > 0.82 && ld < 2.8) {
          let on = 0.5 + 0.5 * sin(u.time * (0.6 + h * 1.4) + h2 * 40.0);
          s.glow = mix(u.cobalt.rgb, u.rose.rgb, step(0.91, h2)) * on * 0.9;
        }
      }
    }
  }

  let i = lighting(p, s.n);
  let shade = mountShadow(p);
  let band = toon(i * (1.0 - shade), p);
  // Two tints in the light: cobalt from the key side, a little rose from below.
  let tint = mix(u.cobalt.rgb, u.rose.rgb, smoothstep(0.2, 1.1, uv.y + uv.x * 0.3));
  var col = s.albedo * (0.38 + band * 1.7) + tint * band * 0.08;
  col *= 1.0 - shade * 0.65;
  col += s.glow;
  let ring = ripple(p);
  col = mix(col, u.lit.rgb * (0.4 + 0.6 * band), ring * 0.55);

  // Calm under the copy, so text stays easy to read.
  let c = u.calm;
  let calmD = sdBox(p - c.xy - c.zw * 0.5, c.zw * 0.5, 40.0);
  col *= mix(0.3, 1.0, smoothstep(-20.0, 140.0, calmD) * select(0.0, 1.0, c.z > 0.0) + select(1.0, 0.0, c.z > 0.0));

  let v = length((uv - vec2f(0.55, 0.45)) * vec2f(1.0, 1.25));
  col *= 1.0 - smoothstep(0.25, 0.95, v) * 0.75;
  col += (hash(p + fract(u.time) * 91.0) - 0.5) * 0.018;
  col = mix(u.bg.rgb, col, 0.9);
  let a = u.fade;
  return vec4f(max(col, vec3f(0.0)) * a, a);
}
`;
