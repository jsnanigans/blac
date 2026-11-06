/// <reference types="@webgpu/types" />
import { createLayer, createRenderer, rgba } from 'insomni';
import {
  createEffect,
  createEffectLayer,
  createFullscreenDrawable,
  createGlow,
  uniform,
} from 'insomni/shaders';
import { tokenRgb, type Tone, type Vec } from '../patchbay/cables';
import {
  cable,
  cableShadow,
  col,
  mix,
  plug,
  type Rgb,
  type Shades,
} from '../patchbay/cel';
import { sharedGpu } from '../patchbay/gpu';
import {
  createRope,
  endDir,
  endPins,
  kick,
  nearest,
  shift,
  smooth,
  stepRope,
  along,
  type Rope,
} from '../patchbay/rope';
import {
  CELL,
  MAX_MOUNTS,
  MAX_RIPPLES,
  TOP_JACK,
  UNIFORM_FLOATS,
  WALL_WGSL,
} from './wall';

export type Preset = 'hero' | 'chapter';

interface BackCable {
  tone: Tone;
  /** Ends in wall space; with `bOff` the `b` end hangs free (b is only where it started). */
  a: Vec;
  b: Vec;
  bOff: boolean;
  /** Which way each plug points out of its jack: down, leaning toward the other end. */
  aOut: Vec;
  bOut: Vec;
  /** The jacks it holds, so no two plugs share one. */
  jacks: string[];
  rope: Rope;
  /** Its own breeze, so the cables never sway in step. */
  sway: { f: number; p: number; amp: number };
  /** When the next pulse sets off down it (it may wait a moment). */
  pulse: number | null;
  ledAt: number;
}

interface Inlet {
  el: HTMLElement;
  rope: Rope;
  /** Where the plug was last frame, to carry the cable along with a scroll. */
  last: Vec;
}

const POINTS = 22;
const PULSE_S = 2.4;
/** How much of a scroll a cable follows rigidly; the rest it feels as a gentle sway. */
const CARRY = 0.98;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const GRAB_PX = 18;
const NOT_GRABBABLE =
  'a, button, input, label, p, h1, h2, h3, li, code, pre, .bay, [data-mount]';

const jackAt = (cx: number, cy: number): Vec => ({
  x: cx * CELL.w + TOP_JACK.x,
  y: cy * CELL.h + TOP_JACK.y,
});

const droop = (from: Vec, to: Vec): Vec => {
  const lean = Math.sign(to.x - from.x) * 0.35;
  const l = Math.hypot(lean, 1);
  return { x: lean / l, y: 1 / l };
};

/**
 * A full-screen insomni scene behind the page: the cel-shaded wall (a
 * fragment shader), cables hanging between its jacks (verlet ropes you can
 * brush, grab and pluck), status LEDs and pulses, under a glow. It answers
 * the page: `bay:signal` events from patch bays send a ring across the wall
 * and a pulse down a cable, and chapter beats send a surge.
 * Returns null without WebGPU (the CSS fallback stays).
 */
export async function mountBackdrop(host: HTMLElement, preset: Preset) {
  const gpu = await sharedGpu();
  if (!gpu) return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const renderer = createRenderer(gpu, canvas, {
    config: { oit: false, persistent: false, maxDpr: 1.5 },
  });
  renderer.setBackground(rgba(0, 0, 0, 0));
  const { device } = renderer;

  const data = new Float32Array(UNIFORM_FLOATS);
  const buffer = device.createBuffer({
    label: 'backdrop.wall',
    size: data.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const wall = createFullscreenDrawable(renderer, {
    label: 'backdrop.wall',
    code: WALL_WGSL,
    bindings: [uniform(buffer)],
    blend: 'alpha',
  });
  const shadows = createLayer({ space: 'ui', cache: 'never' });
  const wires = createLayer({ space: 'ui', cache: 'never' });
  const lights = createLayer({ space: 'ui', cache: 'never' });
  const glow = createGlow(renderer, {
    strength: 1.2,
    threshold: 0.32,
    levels: 5,
  });
  // Custom drawables paint after a section's layers, so the wall gets a
  // section of its own (an effect layer needs an effect: a plain copy).
  const copy = createEffect(renderer, {
    label: 'backdrop.copy',
    code: /* wgsl */ `@fragment fn fragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
      return textureLoad(source, vec2u(p.xy), 0);
    }`,
  });
  const scene = [
    createEffectLayer([wall], [copy]),
    shadows,
    wires,
    createEffectLayer([lights], [glow]),
  ];

  const pal = readPalette(host);
  let width = 0;
  let height = 0;
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    renderer.setSize(width, height, Math.min(devicePixelRatio, 1.5));
  };
  resize();

  // ── Cables on the wall ───────────────────────────────────────────────
  const par = { x: 0, y: 0 };
  const scrollSpeed = preset === 'hero' ? 0.25 : 0.3;
  const narrow = innerWidth < 700;
  const count = preset === 'hero' ? (narrow ? 4 : 7) : narrow ? 4 : 8;
  const rows = () => Math.ceil(height / CELL.h) + 2;
  const tones: Tone[] = ['cable', 'cobalt', 'rose'];
  const toScreen = (v: Vec): Vec => ({ x: v.x - par.x, y: v.y - par.y });
  /** The plug's length: the cable leaves it straight. */
  const STIFF = 28;

  const taken = new Set<string>();

  function spawn(
    i: number,
    row0: number,
    span: number,
    settle = 60,
  ): BackCable {
    const cols = Math.ceil(width / CELL.w);
    // Keep them on the right, away from the copy (on phones, anywhere).
    const minCol = Math.ceil(cols * (narrow ? 0 : 0.5));
    // Retry until both jacks are free, widening the search as it goes.
    for (let t = 0; ; t++) {
      const cx =
        minCol +
        Math.floor((cols - minCol) * ((i * 0.618 + 0.3 + t * 0.382) % 1));
      const cy = row0 + Math.floor(Math.random() * (span + (t >> 3)));
      const ka = `${cx},${cy}`;
      if (taken.has(ka)) continue;
      // Some dangle from one jack, unplugged, swinging free.
      const hang = Math.random() < 0.3;
      const reach =
        (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
      const bx = Math.max(minCol, cx + reach);
      const by = cy + Math.floor(Math.random() * 3);
      const kb = `${bx},${by}`;
      // Never two plugs in one jack, nor one straight below the other.
      if (!hang && (bx === cx || taken.has(kb))) continue;
      const jacks = hang ? [ka] : [ka, kb];
      for (const k of jacks) taken.add(k);

      const a = jackAt(cx, cy);
      const b = hang
        ? { x: a.x + reach * 30, y: a.y + 140 + Math.random() * 160 }
        : jackAt(bx, by);
      const aOut = droop(a, b);
      const bOut = droop(b, a);
      const length =
        Math.hypot(b.x - a.x, b.y - a.y) * (hang ? 1.05 : 1.3) + 60;
      const sa = toScreen(a);
      const sb = toScreen(b);
      const rope = createRope(sa, sb, POINTS, length, aOut, hang ? null : bOut);
      // The start shape is close already: a short settle keeps a respawn cheap.
      for (let s = 0; s < settle; s++)
        stepRope(
          rope,
          endPins(rope, sa, aOut, hang ? null : sb, bOut, STIFF),
          1 / 60,
        );
      return {
        tone: tones[i % tones.length]!,
        a,
        b,
        bOff: hang,
        aOut,
        bOut,
        jacks,
        rope,
        sway: {
          f: 0.15 + Math.random() * 0.2,
          p: Math.random() * Math.PI * 2,
          amp: 20 + Math.random() * 30,
        },
        pulse: null,
        ledAt: -10,
      };
    }
  }

  const scrollPar = () => (reduced.matches ? 0 : scrollY * scrollSpeed);
  par.y = scrollPar();
  const firstRow = () => Math.floor(par.y / CELL.h) - 1;
  const cables: BackCable[] = Array.from({ length: count }, (_, i) =>
    spawn(i, firstRow(), Math.max(1, rows() - 2), 200),
  );

  const inlets: Inlet[] = [];
  const inletEnd = (el: HTMLElement): Vec => {
    const r = el.getBoundingClientRect();
    return { x: r.left + 6, y: r.top + r.height * 0.62 };
  };
  // Hangs off below the screen, and travels with its plug when the page scrolls.
  const inletAnchor = (end: Vec): Vec => ({
    x: end.x - 150,
    y: end.y + height + 170,
  });
  const syncInlets = () => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-inlet]')) {
      if (inlets.some((i) => i.el === el)) continue;
      const end = inletEnd(el);
      const anchor = inletAnchor(end);
      const rope = createRope(
        end,
        anchor,
        POINTS,
        Math.hypot(anchor.x - end.x, anchor.y - end.y) * 1.08 + 80,
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      );
      inlets.push({ el, rope, last: end });
    }
  };

  // ── Pointer ──────────────────────────────────────────────────────────
  let pointer: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    t: number;
  } | null = null;
  let lampOn = 0;
  const lamp = { x: width * 0.7, y: height * 0.3 };
  let grab: {
    cable: BackCable;
    i: number;
    x: number;
    y: number;
  } | null = null;

  const hoverCable = (p: Vec) => {
    let best: BackCable | null = null;
    let dist = GRAB_PX;
    let idx = 0;
    for (const c of cables) {
      const n = nearest(c.rope, p);
      if (n.dist < dist) {
        dist = n.dist;
        best = c;
        idx = n.i;
      }
    }
    return best && { cable: best, i: idx };
  };
  const free = (t: EventTarget | null) =>
    !(t instanceof Element && t.closest(NOT_GRABBABLE));

  /** A button is down elsewhere (dragging a bay cable, selecting text): the wall stays out of it. */
  let held = false;
  const onMove = (e: PointerEvent) => {
    held = e.buttons !== 0 && !grab;
    const prev = pointer;
    const dt = prev ? Math.max(1, e.timeStamp - prev.t) / 1000 : 1;
    pointer = {
      x: e.clientX,
      y: e.clientY,
      vx: prev ? (e.clientX - prev.x) / dt : 0,
      vy: prev ? (e.clientY - prev.y) / dt : 0,
      t: e.timeStamp,
    };
    if (grab) {
      grab.x = e.clientX;
      grab.y = e.clientY;
    } else if (e.pointerType === 'mouse') {
      const over = free(e.target) && hoverCable(pointer);
      document.documentElement.classList.toggle('backdrop-grab', !!over);
    }
    wake();
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !free(e.target)) return;
    const hit = hoverCable({ x: e.clientX, y: e.clientY });
    if (!hit) return;
    if (e.pointerType === 'touch') {
      kick(hit.cable.rope, hit.i, (Math.random() - 0.5) * 360, -200);
      wake();
      return;
    }
    e.preventDefault();
    grab = {
      ...hit,
      i: Math.max(2, Math.min(POINTS - 3, hit.i)),
      x: e.clientX,
      y: e.clientY,
    };
    document.documentElement.classList.add('backdrop-grabbing');
    wake();
  };
  const onUp = () => {
    if (!grab) return;
    kick(grab.cable.rope, grab.i, 0, -80);
    grab = null;
    document.documentElement.classList.remove('backdrop-grabbing');
  };
  const onLeave = () => (pointer = null);

  // ── Signals from the page ────────────────────────────────────────────
  const ripples: { x: number; y: number; t: number; s: number }[] = [];
  let clock = 0;
  const ring = (x: number, y: number, s: number) => {
    ripples.push({ x, y, t: clock, s });
    while (ripples.length > MAX_RIPPLES) ripples.shift();
  };
  const fire = (c: BackCable, delay = 0) => {
    if (c.pulse === null) c.pulse = clock + delay;
  };
  const nearestCable = (x: number, y: number) =>
    cables.reduce(
      (best, c) => {
        const d = nearest(c.rope, { x, y }).dist;
        return d < best.d ? { c, d } : best;
      },
      { c: cables[0]!, d: Infinity },
    ).c;
  const onSignal = (e: Event) => {
    const { x, y } = (e as CustomEvent<Vec>).detail;
    ring(x, y, 0.45);
    fire(nearestCable(x, y));
    wake();
  };
  const onBeat = () => {
    const stage = document
      .querySelector('.stage-wrap')
      ?.getBoundingClientRect();
    ring(
      stage ? stage.left + stage.width / 2 : width * 0.65,
      stage ? stage.top + stage.height / 2 : height / 2,
      0.6,
    );
    // A few cables answer, each in its own time.
    for (const c of cables)
      if (Math.random() < 0.6) fire(c, Math.random() * 1.5);
    wake();
  };

  // ── Frame ────────────────────────────────────────────────────────────
  let mounts: HTMLElement[] = [];
  let calmEls: HTMLElement[] = [];
  let lastQuery = -1;
  let frame = 0;
  let last = 0;
  let nextPulse = 3;
  const lastPar = { x: par.x, y: par.y };
  let fade = 1;

  const motes = Array.from({ length: narrow ? 14 : 28 }, () => ({
    x: Math.random(),
    y: Math.random(),
    s: 0.5 + Math.random(),
    p: Math.random() * 6.28,
  }));

  function render(now: number) {
    frame = 0;
    const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    const still = reduced.matches;
    if (!still) clock += dt;

    fade =
      preset === 'hero'
        ? 1 -
          Math.min(1, Math.max(0, (scrollY - height * 0.35) / (height * 0.65)))
        : 1;
    host.style.opacity = String(fade);
    if (fade <= 0.001) {
      last = 0;
      return;
    }

    if (now - lastQuery > 500) {
      lastQuery = now;
      mounts = [...document.querySelectorAll<HTMLElement>('[data-mount]')];
      calmEls = [...document.querySelectorAll<HTMLElement>('[data-calm]')];
      syncInlets();
    }

    // Parallax: the wall moves slower than the page, locked to the scroll.
    par.y = scrollPar();
    // The cables ride along with the wall, only swaying a little.
    for (const c of cables)
      shift(c.rope, (lastPar.x - par.x) * CARRY, (lastPar.y - par.y) * CARRY);
    lastPar.x = par.x;
    lastPar.y = par.y;

    // The lamp sits on the cursor and dims when it leaves.
    lampOn += ((pointer && !still ? 1 : 0) - lampOn) * Math.min(1, dt * 8);
    if (pointer) {
      lamp.x = pointer.x;
      lamp.y = pointer.y;
    }

    // Recycle cables that scrolled off the top into rows below the view.
    const top = par.y - CELL.h * 2;
    // One per frame, so a fast scroll never stalls a frame.
    let respawned = false;
    cables.forEach((c, i) => {
      if (respawned) return;
      const low = c.bOff ? c.a.y : Math.max(c.a.y, c.b.y);
      const high = c.bOff ? c.a.y : Math.min(c.a.y, c.b.y);
      const row =
        low < top
          ? firstRow() + rows() - 1
          : high > par.y + height + CELL.h * 3
            ? firstRow() - 1
            : null;
      if (row === null || grab?.cable === c) return;
      for (const k of c.jacks) taken.delete(k);
      cables[i] = spawn(i, row, 2);
      respawned = true;
    });

    if (!still) {
      nextPulse -= dt;
      if (nextPulse <= 0) {
        fire(cables[Math.floor(Math.random() * cables.length)]!);
        nextPulse = 3 + Math.random() * 4;
      }
    }

    // Uniforms.
    const m = mounts
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.bottom > -40 && r.top < height + 40 && r.width > 0)
      .slice(0, MAX_MOUNTS);
    // Calm the wall under whichever block of copy fills most of the view.
    const calm = calmEls
      .map((el) => el.getBoundingClientRect())
      .map((r) => ({
        r,
        seen: Math.max(0, Math.min(r.bottom, height) - Math.max(r.top, 0)),
      }))
      .sort((x, y) => y.seen - x.seen)
      .find((c) => c.seen > 0)?.r;
    let o = 0;
    const put = (...v: number[]) => {
      data.set(v, o);
      o += v.length;
    };
    const live = ripples.filter((r) => clock - r.t < 2.4);
    put(width, height, clock, canvas.width / width);
    put(
      pointer?.x ?? -9999,
      pointer?.y ?? -9999,
      still ? 0 : Math.min(1, lampOn * 1.2),
      1,
    );
    put(par.x, par.y, m.length, live.length);
    put(lamp.x, lamp.y, still ? 0 : lampOn, 0);
    put(
      ...(calm ? [calm.left, calm.top, calm.width, calm.height] : [0, 0, 0, 0]),
    );
    for (const c of [
      pal.bg,
      pal.panel,
      pal.panelHi,
      pal.ink,
      pal.screw.base,
      pal.cobalt.base,
      pal.rose.base,
      pal.lit,
      pal.cable.base,
    ])
      put(c[0], c[1], c[2], 1);
    data.fill(0, o);
    live.forEach((r, i) => data.set([r.x, r.y, clock - r.t, r.s], o + i * 4));
    o = 16 + 4 + 36 + MAX_RIPPLES * 4;
    m.forEach((r, i) =>
      data.set([r.left, r.top, r.width, r.height], o + i * 4),
    );
    device.queue.writeBuffer(buffer, 0, data);

    shadows.clear();
    wires.clear();
    lights.clear();

    const ptrForce =
      pointer && !grab && !held && !still ? { ...pointer } : null;
    const lightFrom =
      lampOn > 0.3 ? lamp : { x: width * 0.12, y: -height * 0.4 };

    /** `dirA`/`dirB`: a seated plug's set angle; a free one follows the cable. */
    const drawRope = (
      rope: Rope,
      tone: Tone,
      dirA: Vec | null,
      dirB: Vec | null | 'free',
      w = 5.5,
    ) => {
      const pts = smooth(rope.pts);
      const mid = pts[pts.length >> 1]!;
      const dx = mid.x - lightFrom.x;
      const dy = mid.y - lightFrom.y;
      const d = Math.hypot(dx, dy) || 1;
      const off = { x: (dx / d) * 12 + 3, y: (dy / d) * 12 + 6 };
      cableShadow(shadows, pts, w, off, pal.shadow, 0.5);
      const s = pal[tone];
      cable(wires, pts, s, { width: w, ink: pal.ink });
      const look = {
        size: w / 5.5,
        body: s,
        sleeve: pal.screw,
        ink: pal.ink,
        shadow: pal.shadow,
      };
      if (dirA) plug(wires, { at: pts[0]!, dir: dirA, lift: 0 }, look);
      if (dirB)
        plug(
          wires,
          {
            at: pts[pts.length - 1]!,
            dir: dirB === 'free' ? endDir(pts, 'b') : dirB,
            lift: 0,
          },
          look,
        );
      return pts;
    };

    for (const c of cables) {
      const a = toScreen(c.a);
      const b = toScreen(c.b);
      const pins = endPins(c.rope, a, c.aOut, c.bOff ? null : b, c.bOut, STIFF);
      if (grab?.cable === c) pins.push({ i: grab.i, x: grab.x, y: grab.y });
      const { f, p, amp } = c.sway;
      const wind = still
        ? 0
        : (Math.sin(clock * f + p) +
            0.4 * Math.sin(clock * f * 2.3 + p * 1.7)) *
          amp;
      if (!still || grab)
        stepRope(c.rope, pins, dt, {
          pointer: ptrForce,
          reach: 70,
          wind,
        });
      const pts = drawRope(c.rope, c.tone, c.aOut, c.bOff ? 'free' : c.bOut);
      const t = c.pulse === null ? -1 : (clock - c.pulse) / PULSE_S;
      if (t >= 1) {
        c.pulse = null;
        c.ledAt = clock;
        if (!c.bOff) ring(b.x, b.y, 0.25);
      } else if (t >= 0) {
        // Fades in and out at the ends, so it glides rather than pops.
        const vis = Math.min(1, t * 6, (1 - t) * 6);
        const at = along(pts, t);
        for (let k = 1; k <= 6; k++) {
          const q = along(pts, t - k * 0.015);
          lights.pushCircle({
            cx: q.x,
            cy: q.y,
            radius: 4 - k * 0.45,
            fill: col(pal.lit, (0.4 - k * 0.055) * vis),
          });
        }
        lights.pushCircle({
          cx: at.x,
          cy: at.y,
          radius: 14,
          fill: col(pal.lit, 0.28 * vis),
          blur: 8,
        });
        lights.pushCircle({
          cx: at.x,
          cy: at.y,
          radius: 3.5,
          fill: col(pal.hot, 0.85 * vis),
        });
      }
      // Status LED by the jack: green while live, amber when a pulse lands.
      for (const end of c.bOff ? [a] : [a, b]) {
        const heat = Math.max(0, 1 - (clock - c.ledAt) / 1.6) ** 2;
        const led = { x: end.x + 30, y: end.y - 22 };
        const colr = mix(pal.power, pal.lit, heat);
        wires.pushCircle({
          cx: led.x,
          cy: led.y,
          radius: 4.5,
          fill: col(pal.ink),
        });
        lights.pushCircle({
          cx: led.x,
          cy: led.y,
          radius: 3,
          fill: col(colr, 0.55 + heat * 0.45),
        });
        if (heat > 0)
          lights.pushCircle({
            cx: led.x,
            cy: led.y,
            radius: 9,
            fill: col(pal.lit, heat * 0.35),
            blur: 5,
          });
      }
    }

    const inletOut = { x: -1, y: 0 };
    for (const inlet of inlets) {
      if (!inlet.el.isConnected) continue;
      const end = inletEnd(inlet.el);
      shift(
        inlet.rope,
        (end.x - inlet.last.x) * CARRY,
        (end.y - inlet.last.y) * CARRY,
      );
      inlet.last = end;
      const pins = endPins(
        inlet.rope,
        end,
        inletOut,
        inletAnchor(end),
        null,
        STIFF * 1.3,
      );
      if (!still || grab)
        stepRope(inlet.rope, pins, dt, { pointer: ptrForce, reach: 70 });
      else for (let s = 0; s < 2; s++) stepRope(inlet.rope, pins, 1 / 60);
      drawRope(inlet.rope, 'cobalt', inletOut, null, 7);
    }

    if (!still) {
      for (const mo of motes) {
        mo.y -= dt * 0.008 * mo.s;
        if (mo.y < -0.05) mo.y = 1.05;
        const x = (mo.x * width + Math.sin(clock * 0.3 + mo.p) * 20) % width;
        const y = mo.y * height;
        const near =
          Math.max(0, 1 - Math.hypot(x - lamp.x, y - lamp.y) / 320) * lampOn;
        lights.pushCircle({
          cx: x,
          cy: y,
          radius: 1.2 * mo.s,
          fill: col(pal.cableHi, 0.08 + near * 0.5),
        });
      }
    }

    renderer.render(scene);
    if (!still && !document.hidden) frame = requestAnimationFrame(render);
    else last = 0;
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  const onResize = () => {
    resize();
    wake();
  };
  const onVisible = () => !document.hidden && wake();
  addEventListener('resize', onResize);
  addEventListener('scroll', wake, { passive: true });
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('bay:signal', onSignal);
  document.addEventListener('beat', onBeat);
  document.addEventListener('visibilitychange', onVisible);
  reduced.addEventListener('change', wake);
  document.documentElement.classList.add('has-backdrop');
  wake();

  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('resize', onResize);
    removeEventListener('scroll', wake);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onDown);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    document.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('bay:signal', onSignal);
    document.removeEventListener('beat', onBeat);
    document.removeEventListener('visibilitychange', onVisible);
    reduced.removeEventListener('change', wake);
    document.documentElement.classList.remove(
      'has-backdrop',
      'backdrop-grab',
      'backdrop-grabbing',
    );
    glow.destroy();
    for (const l of [shadows, wires, lights]) l.destroy();
    buffer.destroy();
    renderer.destroy?.();
    canvas.remove();
  };
}

function readPalette(el: Element) {
  const t = (name: string): Rgb => tokenRgb(el, name);
  const shades = (name: string): Shades => {
    // Cables on the wall sit deeper than the bay's: a touch darker.
    const bg = t('--bg');
    return {
      lo: mix(t(`--${name}-lo`), bg, 0.62),
      base: mix(t(`--${name}`), bg, 0.55),
      hi: mix(t(`--${name}-hi`), bg, 0.5),
    };
  };
  return {
    bg: t('--bg'),
    panel: t('--panel'),
    panelHi: t('--panel-hi'),
    ink: t('--ink'),
    shadow: t('--shadow'),
    lit: t('--lit'),
    hot: t('--lit-hot'),
    power: t('--power'),
    cableHi: t('--cable-hi'),
    cable: shades('cable'),
    cobalt: shades('cobalt'),
    rose: shades('rose'),
    screw: { lo: t('--screw-lo'), base: t('--screw'), hi: t('--screw-hi') },
  };
}
