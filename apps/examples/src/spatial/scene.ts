import { SceneRoot, PointerRouter } from '@dirtytalk/spatial';
import type { Rect, DamageKind, SpatialPointerEvent } from '@dirtytalk/spatial';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { BoxNode } from './BoxNode';

const BACKGROUND = '#0e1018';

export interface DamageHudEntry {
  kind: DamageKind;
  rect: Rect;
}

export interface SpatialScene {
  renderer: Canvas2DRenderer;
  /** Re-mark the whole canvas, forcing a full repaint (e.g. after a toggle). */
  requestFullRepaint(): void;
  dispose(): void;
}

export interface SceneOptions {
  width: number;
  height: number;
  onDamage(entries: DamageHudEntry[]): void;
}

/**
 * Build the spatial scene against a canvas element and wire up pointer input
 * and a damage-log subscription. Returns handles plus a `dispose` for React
 * effect cleanup.
 */
export function createSpatialScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
): SpatialScene {
  const { width, height } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  // Crisp rendering on HiDPI: scale the backing store, keep coordinates in CSS px.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  const bounds: Rect = { x: 0, y: 0, w: width, h: height };
  const renderer = new Canvas2DRenderer(ctx, BACKGROUND);
  const root = new SceneRoot(renderer, { bounds });

  const boxes = [
    new BoxNode(renderer, {
      bounds: { x: 48, y: 64, w: 132, h: 84 },
      label: 'drag me',
      color: '#7c9cff',
    }),
    new BoxNode(renderer, {
      bounds: { x: 260, y: 150, w: 132, h: 84 },
      label: 'and me',
      color: '#9be7a6',
    }),
    new BoxNode(renderer, {
      bounds: { x: 150, y: 250, w: 150, h: 92 },
      label: 'overlap me',
      color: '#ffd479',
    }),
  ];
  // Adopt order is paint order (and reverse hit-test order): last = on top.
  for (const box of boxes) root.adoptChild(box);

  const router = new PointerRouter(root);

  // ---- pointer input: translate DOM PointerEvents into SpatialPointerEvents ----

  const toSpatial = (
    e: PointerEvent,
    type: SpatialPointerEvent['type'],
  ): SpatialPointerEvent => {
    const r = canvas.getBoundingClientRect();
    return {
      type,
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      buttons: e.buttons,
      pointerId: e.pointerId,
    };
  };

  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    router.dispatch(toSpatial(e, 'down'));
  };
  const onMove = (e: PointerEvent) => {
    const hit = router.dispatch(toSpatial(e, 'move'));
    canvas.style.cursor = hit ? (e.buttons ? 'grabbing' : 'grab') : 'default';
  };
  const onUp = (e: PointerEvent) => {
    router.dispatch(toSpatial(e, 'up'));
  };
  const onCancel = (e: PointerEvent) => {
    router.dispatch(toSpatial(e, 'cancel'));
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);

  // ---- damage log: a second subscriber on the same channel as the renderer ----

  const unsubscribe = root.channel.subscribe(
    () => [{ rect: bounds, kind: 'paint' as const }],
    (dirty) => {
      options.onDamage(dirty.map((d) => ({ kind: d.kind, rect: d.rect })));
    },
  );

  const requestFullRepaint = () => {
    root.channel.mark([{ rect: bounds, kind: 'paint' }]);
  };

  // Seed the first frame so the background + every box paint once.
  requestFullRepaint();

  return {
    renderer,
    requestFullRepaint,
    dispose() {
      renderer.disposed = true;
      unsubscribe();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
    },
  };
}
