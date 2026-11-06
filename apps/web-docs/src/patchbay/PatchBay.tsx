import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  center,
  type CableView,
  type SceneCable,
  type ScenePulse,
  type SceneSpark,
  type Tone,
  type Vec,
} from './cables';
import {
  along,
  createRope,
  endDir,
  endPins,
  kick,
  nearest,
  setLength,
  slackLength,
  smooth,
  stepRope,
  type Pin,
  type Pointer,
  type Rope,
} from './rope';
import { createSvgView } from './svg-view';
import { light } from './site';
import './patchbay.css';

const SIGNAL_MS = 560;
const DECAY_MS = 900;
/** A plug's flight from the jack to its input. */
const FLY_MS = 760;
const SPARK_MS = 520;
/** Unplugged: the plug pops, the cable drops, then reels back into its jack. */
const DROP_MS = 380;
const REEL_MS = 520;
/** Room around the bay for plugs pulled out of it. */
const MARGIN = 56;
const POINTS = 16;
/** Pull a cable this much past its length and the plug comes out. */
const YANK = 1.3;
const GRAB_PX = 16;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const glide = (t: number) => {
  const u = clamp01(t);
  return u < 0.5 ? 4 * u ** 3 : 1 - (2 - 2 * u) ** 3 / 2;
};
const lerp = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const isControl = (t: EventTarget | null) =>
  t instanceof Element &&
  !!t.closest('button, input, label, a, select, textarea');

interface Pulse {
  wire: string;
  start: number;
  onArrive: () => void;
}

interface Wire {
  id: string;
  key: string;
  tone?: Tone;
  rope: Rope;
  /** The jack and the input, relative to the bay. */
  a: Vec;
  b: Vec;
  /**
   * `fly`: the plug travels from `from` into its input. `seated`: plugged in.
   * `loose`: pulled out by the cursor, back in after release. `out`: its
   * input is gone (the component stopped reading it), so it drops and reels in.
   */
  phase: 'fly' | 'seated' | 'loose' | 'out';
  /** Ms spent in this phase, from frame time (negative: waiting its turn). */
  t: number;
  /** Where the jack and input are drawn: they ease after `a`, `b` when the layout moves. */
  ja: Vec;
  jb: Vec;
  from: Vec;
  /** Which way the plug faced when its flight began; it turns square as it lands. */
  fromDir: Vec;
  heat: number;
  hover: number;
  lift: number;
  alpha: number;
  input: HTMLElement | null;
}

interface Bay {
  jack(key: string, el: HTMLElement | null): void;
  input(
    consumer: string,
    key: string,
    el: HTMLElement | null,
    tone?: Tone,
  ): void;
  /** Send a signal from `keys`' jacks to `consumer`; `onArrive` fires when it lands. */
  signal(consumer: string, keys: string[], onArrive: () => void): void;
}

const BayContext = createContext<Bay | null>(null);

/** The wire under the cursor, if any. */
function hoverWire(wires: Map<string, Wire>, p: Vec): string | null {
  let best: string | null = null;
  let dist = GRAB_PX;
  for (const w of wires.values()) {
    if (w.phase === 'out') continue;
    const n = nearest(w.rope, p);
    if (n.dist < dist) {
      dist = n.dist;
      best = w.id;
    }
  }
  return best;
}

const cableId = (consumer: string, key: string) => `${key}→${consumer}`;

/**
 * Which way a cable leaves each end: along the dominant axis, like a patch
 * lead. Sideways plugs tip down a little under the cable's weight, so a short
 * lead hangs in a U instead of looping.
 */
function outward(a: Vec, b: Vec): [Vec, Vec] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = (Math.sign(dx) || 1) * 0.9;
    return [
      { x: s, y: 0.44 },
      { x: -s, y: 0.44 },
    ];
  }
  const s = Math.sign(dy) || 1;
  return [
    { x: 0, y: s },
    { x: 0, y: -s },
  ];
}

/**
 * A patch bay: modules expose jacks (`useJack`), components plug inputs into
 * the jacks they read (`usePatch`), and every real re-render sends a pulse
 * down the cables of the values that changed. Cables are ropes: they hang,
 * plug in and out with a little flight, sway when the cursor brushes them,
 * and can be grabbed and yanked (the plug pops out and seats again, since
 * only a render decides what is plugged in). Drawn by insomni on WebGPU when
 * available, else as SVG.
 */
export function PatchBay({
  className,
  children,
  renderer = 'auto',
  onRenderer,
}: {
  className?: string;
  children: ReactNode;
  renderer?: 'auto' | 'svg';
  /** Reports which backend draws the cables. */
  onRenderer?: (backend: 'insomni' | 'svg') => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({
    jacks: new Map<string, HTMLElement>(),
    inputs: new Map<
      string,
      { consumer: string; key: string; el: HTMLElement; tone?: Tone }
    >(),
    wires: new Map<string, Wire>(),
    heatAt: new Map<string, number>(),
    pulses: [] as Pulse[],
    sparks: [] as { at: Vec; start: number }[],
    pointer: null as (Pointer & { t: number }) | null,
    grab: null as {
      wire: string;
      i: number;
      x: number;
      y: number;
      down: Vec;
      start: number;
      moved: boolean;
    } | null,
    view: null as CableView | null,
    frame: 0,
    last: 0,
    measured: false,
    measureQueued: false,
  }).current;

  const draw = useCallback(
    (now: number) => {
      state.frame = 0;
      const box = host.current;
      if (!box || !state.view) return;
      const dt = Math.min(
        1 / 30,
        state.last ? (now - state.last) / 1000 : 1 / 60,
      );
      state.last = now;
      let busy = false;

      const live = new Set<string>();
      const pulses: ScenePulse[] = [];
      for (const p of [...state.pulses]) {
        const t = (now - p.start) / SIGNAL_MS;
        const w = state.wires.get(p.wire);
        if (t >= 1 || !w) {
          state.pulses.splice(state.pulses.indexOf(p), 1);
          state.heatAt.set(p.wire, now);
          p.onArrive();
          continue;
        }
        live.add(p.wire);
        const pts = w.rope.pts;
        pulses.push({
          at: along(pts, t),
          trail: [1, 2, 3, 4, 5, 6].map((i) => along(pts, t - i * 0.025)),
        });
        busy = true;
      }

      const ptr = state.pointer;
      const grab = state.grab;
      const cables: SceneCable[] = [];
      for (const w of [...state.wires.values()]) {
        w.t += dt * 1000;
        const t = w.t;
        const [aOut, bOut] = outward(w.a, w.b);
        const follow = Math.min(1, dt * 30);
        for (const [p, q] of [
          [w.ja, w.a],
          [w.jb, w.b],
        ] as const) {
          p.x += (q.x - p.x) * follow;
          p.y += (q.y - p.y) * follow;
          if (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 0.2) busy = true;
        }
        if (w.phase !== 'out' && t >= 0 && w.alpha < 1) {
          w.alpha = Math.min(1, w.alpha + dt * 4);
          busy = true;
        }
        let b: Vec | null = w.jb;
        let bDir: Vec | null = bOut;
        if (w.phase === 'fly') {
          if (t < 0) {
            busy = true;
            continue;
          }
          const u = glide(t / FLY_MS);
          // A low arc, the plug held square to its input until it lands.
          b = lerp(w.from, w.jb, u);
          const hop = Math.min(
            18,
            Math.hypot(w.jb.x - w.from.x, w.jb.y - w.from.y) * 0.2,
          );
          b.y -= Math.sin(Math.PI * u) * hop;
          w.lift = 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.4));
          const turn = ease(u * 1.6);
          const fx = w.fromDir.x + (bOut.x - w.fromDir.x) * turn;
          const fy = w.fromDir.y + (bOut.y - w.fromDir.y) * turn;
          const fl = Math.hypot(fx, fy) || 1;
          bDir = { x: fx / fl, y: fy / fl };
          setLength(w.rope, slackLength(w.ja, b), 1);
          if (t >= FLY_MS) {
            w.phase = 'seated';
            w.lift = 0;
            state.sparks.push({ at: w.jb, start: now });
            kick(w.rope, POINTS >> 1, 0, 60);
          }
        } else if (w.phase === 'loose') {
          b = null;
          bDir = null;
          w.lift = Math.min(0.6, w.lift + dt * 3);
          if (!grab || grab.wire !== w.id) {
            if (t > 380) {
              w.phase = 'fly';
              w.t = 0;
              w.from = { ...w.rope.pts[POINTS - 1]! };
              w.fromDir = endDir(w.rope.pts, 'b');
            }
          }
        } else if (w.phase === 'out') {
          w.lift = Math.min(0.6, w.lift + dt * 3);
          if (t < DROP_MS) {
            b = null;
          } else {
            const u = ease((t - DROP_MS) / REEL_MS);
            b = lerp(w.rope.pts[POINTS - 1]!, w.ja, u * 0.35);
            setLength(w.rope, slackLength(w.ja, b) * (1 - u), 0.3);
            w.alpha = 1 - u;
            if (u >= 1) {
              state.wires.delete(w.id);
              continue;
            }
          }
          bDir = null;
        } else {
          setLength(w.rope, slackLength(w.ja, w.jb));
        }

        const pins: Pin[] = endPins(w.rope, w.ja, aOut, b, bDir);
        if (grab?.wire === w.id) {
          pins.push({ i: grab.i, x: grab.x, y: grab.y });
          if (
            w.phase === 'seated' &&
            Math.hypot(grab.x - w.ja.x, grab.y - w.ja.y) +
              Math.hypot(grab.x - w.jb.x, grab.y - w.jb.y) >
              w.rope.seg * (POINTS - 1) * YANK
          ) {
            w.phase = 'loose';
            w.t = 0;
            kick(w.rope, POINTS - 1, -bOut.x * 320, -260);
          }
        }
        const moving = stepRope(w.rope, pins, dt, {
          pointer: ptr && !grab ? ptr : null,
        });
        if (moving || w.phase !== 'seated' || grab?.wire === w.id) busy = true;

        const hovered =
          grab?.wire === w.id ||
          (!!ptr && !grab && hoverWire(state.wires, ptr) === w.id);
        w.hover += ((hovered ? 1 : 0) - w.hover) * 0.25;
        if (w.hover > 0.01 && !hovered) busy = true;

        const since = state.heatAt.get(w.id);
        w.heat = live.has(w.id)
          ? 1
          : since === undefined
            ? 0
            : Math.max(0, 1 - (now - since) / DECAY_MS);
        if (w.heat > 0) busy = true;

        const pts = smooth(w.rope.pts);
        cables.push({
          id: w.id,
          pts,
          tone: w.tone ?? 'cable',
          heat: w.heat,
          hover: w.hover,
          alpha: w.alpha,
          plugs: [
            { at: pts[0]!, dir: aOut, lift: 0 },
            {
              at: pts[pts.length - 1]!,
              dir: bDir ?? endDir(pts, 'b'),
              lift: w.lift,
            },
          ],
        });
      }

      const sparks: SceneSpark[] = [];
      state.sparks = state.sparks.filter((s) => now - s.start < SPARK_MS);
      for (const s of state.sparks) {
        sparks.push({ at: s.at, t: (now - s.start) / SPARK_MS });
        busy = true;
      }

      state.view.draw({
        width: box.clientWidth,
        height: box.clientHeight,
        margin: MARGIN,
        cables,
        pulses,
        sparks,
      });
      if (busy) state.frame = requestAnimationFrame(draw);
      else state.last = 0;
    },
    [state],
  );

  const kickLoop = useCallback(() => {
    if (!state.frame) state.frame = requestAnimationFrame(draw);
  }, [state, draw]);

  const remeasure = useCallback(() => {
    if (state.measureQueued) return;
    state.measureQueued = true;
    requestAnimationFrame(() => {
      state.measureQueued = false;
      const el = host.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const calm = reduced();
      let stagger = 0;
      const seen = new Set<string>();
      for (const [id, i] of state.inputs) {
        const jack = state.jacks.get(i.key);
        if (!jack?.isConnected || !i.el.isConnected) continue;
        seen.add(id);
        const a = center(jack, box);
        const b = center(i.el, box);
        const w = state.wires.get(id);
        if (w) {
          w.a = a;
          w.b = b;
          w.input = i.el;
          if (w.phase === 'out') {
            w.phase = 'fly';
            w.t = 0;
            w.from = { ...w.rope.pts[POINTS - 1]! };
            w.fromDir = endDir(w.rope.pts, 'b');
            w.alpha = 1;
          }
          continue;
        }
        // A new cable fades in already hanging, its plug just short of the
        // input, then eases in; on first mount one after another.
        const [aOut, bOut] = outward(a, b);
        const from = calm ? b : { x: b.x + bOut.x * 30, y: b.y + bOut.y * 30 };
        const fresh: Wire = {
          id,
          key: i.key,
          tone: i.tone,
          rope: createRope(a, from, POINTS, slackLength(a, b), aOut, bOut),
          a,
          b,
          phase: calm ? 'seated' : 'fly',
          t: state.measured ? 0 : -(stagger++ * 90 + 200),
          ja: { ...a },
          jb: { ...b },
          from,
          fromDir: bOut,
          heat: 0,
          hover: 0,
          lift: 0,
          alpha: calm ? 1 : 0,
          input: i.el,
        };
        for (let s = 0; s < 80; s++)
          stepRope(
            fresh.rope,
            endPins(fresh.rope, a, aOut, from, bOut),
            1 / 60,
          );
        state.wires.set(id, fresh);
      }
      for (const w of state.wires.values()) {
        if (seen.has(w.id) || w.phase === 'out') continue;
        w.phase = 'out';
        w.t = 0;
        w.rope.still = 0;
        if (calm) state.wires.delete(w.id);
      }
      state.measured = true;
      kickLoop();
    });
  }, [state, kickLoop]);

  useEffect(() => {
    const el = host.current!;
    let cancelled = false;
    const mount = async () => {
      const gpu =
        renderer === 'auto'
          ? await import('./gpu-view')
              .then((m) => m.createGpuView(el))
              .catch(() => null)
          : null;
      if (cancelled) return gpu?.destroy();
      state.view = gpu ?? createSvgView(el);
      onRenderer?.(gpu ? 'insomni' : 'svg');
      remeasure();
    };
    void mount();
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    void document.fonts?.ready.then(remeasure);

    const local = (e: PointerEvent): Vec => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      const prev = state.pointer;
      const dt = prev ? Math.max(1, e.timeStamp - prev.t) / 1000 : 1;
      state.pointer = {
        ...p,
        vx: prev ? (p.x - prev.x) / dt : 0,
        vy: prev ? (p.y - prev.y) / dt : 0,
        t: e.timeStamp,
      };
      const g = state.grab;
      if (g) {
        const r = el.getBoundingClientRect();
        g.x = Math.max(-MARGIN + 8, Math.min(r.width + MARGIN - 8, p.x));
        g.y = Math.max(-MARGIN + 8, Math.min(r.height + MARGIN - 8, p.y));
        if (Math.hypot(p.x - g.down.x, p.y - g.down.y) > 4) g.moved = true;
      } else {
        el.style.cursor =
          !isControl(e.target) && hoverWire(state.wires, p) ? 'grab' : '';
      }
      kickLoop();
    };
    const onLeave = () => {
      if (!state.grab) state.pointer = null;
      el.style.cursor = '';
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || isControl(e.target)) return;
      const p = local(e);
      const id = hoverWire(state.wires, p);
      if (!id) return;
      const w = state.wires.get(id)!;
      const { i } = nearest(w.rope, p);
      if (e.pointerType === 'touch') {
        // Touch scrolls the page, so a tap only plucks.
        kick(w.rope, i, (Math.random() - 0.5) * 360, -220);
        kickLoop();
        return;
      }
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      state.grab = {
        wire: id,
        i: Math.max(2, Math.min(POINTS - 3, i)),
        ...p,
        down: p,
        start: e.timeStamp,
        moved: false,
      };
      kickLoop();
    };
    const onUp = (e: PointerEvent) => {
      const g = state.grab;
      if (!g) return;
      state.grab = null;
      el.style.cursor = '';
      const w = state.wires.get(g.wire);
      if (w && !g.moved && e.timeStamp - g.start < 300)
        kick(w.rope, g.i, (Math.random() - 0.5) * 360, -260);
      if (w?.phase === 'loose') w.t = 0;
      kickLoop();
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return () => {
      cancelled = true;
      ro.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.view?.destroy();
      state.view = null;
    };
  }, [state, renderer, remeasure, onRenderer, kickLoop]);

  const bay = useMemo<Bay>(
    () => ({
      jack(key, el) {
        if (el) state.jacks.set(key, el);
        else state.jacks.delete(key);
        remeasure();
      },
      input(consumer, key, el, tone) {
        const id = cableId(consumer, key);
        if (el) state.inputs.set(id, { consumer, key, el, tone });
        else state.inputs.delete(id);
        remeasure();
      },
      signal(consumer, keys, onArrive) {
        const ids = keys
          .map((k) => cableId(consumer, k))
          .filter((id) => state.wires.get(id)?.phase === 'seated');
        if (!ids.length || reduced() || !state.view) {
          for (const id of ids) state.heatAt.set(id, performance.now());
          onArrive();
          kickLoop();
          return;
        }
        let pending = ids.length;
        for (const id of ids) {
          state.pulses.push({
            wire: id,
            start: performance.now(),
            onArrive: () => --pending === 0 && onArrive(),
          });
          const jack = state.jacks.get(state.inputs.get(id)!.key) ?? null;
          light(jack);
          if (jack) {
            const r = jack.getBoundingClientRect();
            document.dispatchEvent(
              new CustomEvent('bay:signal', {
                detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
              }),
            );
          }
        }
        kickLoop();
      },
    }),
    [state, remeasure, kickLoop],
  );

  return (
    <BayContext.Provider value={bay}>
      <div ref={host} className={`bay ${className ?? ''}`}>
        {children}
      </div>
    </BayContext.Provider>
  );
}

function useBay(): Bay {
  const bay = useContext(BayContext);
  if (!bay) throw new Error('Patch bay hooks must be used inside <PatchBay>.');
  return bay;
}

/** Ref for a module's output jack. */
export function useJack(key: string) {
  const bay = useBay();
  return useCallback((el: HTMLElement | null) => bay.jack(key, el), [bay, key]);
}

/**
 * Wire a component into the bay. `reads` maps each state path the component
 * reads during render to the value it read; after every real re-render the
 * paths whose value changed send a pulse, and the card lights when it lands.
 */
export function usePatch<T extends HTMLElement>(
  consumer: string,
  reads: Record<string, unknown>,
  tone?: Tone,
) {
  const bay = useBay();
  const card = useRef<T>(null);
  const prev = useRef<Record<string, unknown> | null>(null);

  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = reads;
    if (!before) return;
    // Only values it read last time and reads again can carry a signal; a render
    // with none changed came from React (props, local state), not from the bay.
    const changed = Object.keys(reads).filter(
      (k) => k in before && !Object.is(reads[k], before[k]),
    );
    if (changed.length)
      bay.signal(consumer, changed, () => light(card.current));
    else light(card.current);
  });

  // Stable ref callbacks per key, so a re-render does not unplug and replug.
  const plugs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const plug = (key: string) => {
    let ref = plugs.current.get(key);
    if (!ref) {
      ref = (el) => bay.input(consumer, key, el, tone);
      plugs.current.set(key, ref);
    }
    return ref;
  };

  return { card, plug };
}
