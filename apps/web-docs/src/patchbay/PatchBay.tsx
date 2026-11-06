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
  measure,
  pointAt,
  type CableSpec,
  type CableView,
  type SceneCable,
  type Tone,
} from './cables';
import { createSvgView } from './svg-view';
import { light } from './site';
import './patchbay.css';

const SIGNAL_MS = 560;
const DECAY_MS = 900;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Pulse {
  cable: string;
  start: number;
  onArrive: () => void;
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

const cableId = (consumer: string, key: string) => `${key}→${consumer}`;

/**
 * A patch bay: modules expose jacks (`useJack`), components plug inputs into
 * the jacks they read (`usePatch`), and every real re-render sends a pulse
 * down the cables of the values that changed. Cables are drawn by insomni on
 * WebGPU when available, else as SVG.
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
    cables: [] as SceneCable[],
    heat: new Map<string, number>(),
    pulses: [] as Pulse[],
    view: null as CableView | null,
    frame: 0,
    measureQueued: false,
  }).current;

  const draw = useCallback(
    (now: number) => {
      state.frame = 0;
      const box = host.current;
      if (!box || !state.view) return;
      let busy = false;
      const live = new Set<string>();
      const pulses = [];
      for (const p of [...state.pulses]) {
        const t = (now - p.start) / SIGNAL_MS;
        if (t >= 1) {
          state.pulses.splice(state.pulses.indexOf(p), 1);
          state.heat.set(p.cable, now);
          p.onArrive();
          continue;
        }
        const cable = state.cables.find((c) => c.id === p.cable);
        if (!cable) continue;
        live.add(p.cable);
        pulses.push({
          curve: cable.curve,
          at: pointAt(cable.curve, Math.max(0, t)),
          t: Math.max(0, t),
        });
        busy = true;
      }
      for (const c of state.cables) {
        if (live.has(c.id)) {
          c.heat = 1;
          continue;
        }
        const since = state.heat.get(c.id);
        c.heat =
          since === undefined ? 0 : Math.max(0, 1 - (now - since) / DECAY_MS);
        if (c.heat > 0) busy = true;
      }
      state.view.draw({
        width: box.clientWidth,
        height: box.clientHeight,
        cables: state.cables,
        pulses,
      });
      if (busy) state.frame = requestAnimationFrame(draw);
    },
    [state],
  );

  const kick = useCallback(() => {
    if (!state.frame) state.frame = requestAnimationFrame(draw);
  }, [state, draw]);

  const remeasure = useCallback(() => {
    if (state.measureQueued) return;
    state.measureQueued = true;
    requestAnimationFrame(() => {
      state.measureQueued = false;
      if (!host.current) return;
      const specs: CableSpec[] = [];
      for (const [id, i] of state.inputs) {
        const from = state.jacks.get(i.key);
        if (from) specs.push({ id, from, to: i.el, tone: i.tone });
      }
      state.cables = measure(host.current, specs);
      kick();
    });
  }, [state, kick]);

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
    return () => {
      cancelled = true;
      ro.disconnect();
      cancelAnimationFrame(state.frame);
      state.view?.destroy();
      state.view = null;
    };
  }, [state, renderer, remeasure, onRenderer]);

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
          .filter((id) => state.inputs.has(id));
        if (!ids.length || reduced() || !state.view) {
          for (const id of ids) state.heat.set(id, performance.now());
          onArrive();
          kick();
          return;
        }
        let pending = ids.length;
        for (const id of ids) {
          state.pulses.push({
            cable: id,
            start: performance.now(),
            onArrive: () => --pending === 0 && onArrive(),
          });
          const jack = state.jacks.get(state.inputs.get(id)!.key);
          light(jack ?? null);
        }
        kick();
      },
    }),
    [state, remeasure, kick],
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
