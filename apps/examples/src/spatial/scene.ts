import { SceneRoot, PointerRouter } from '@dirtytalk/spatial';
import type { Rect, DamageKind, SpatialPointerEvent } from '@dirtytalk/spatial';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import { BoxNode } from './BoxNode';
import { TileNode } from './TileNode';

const BACKGROUND = '#0e1018';

/** One repaint frame, summarised for the canvas HUD. */
export interface FrameReport {
  /** Distinct damage kinds coalesced into this frame. */
  kinds: DamageKind[];
  /** The rects actually repainted — drives the repaint-region flash. */
  rects: Rect[];
  /** Fraction of the canvas repainted, 0–1. */
  areaFraction: number;
  /** Wall-clock ms in the data + layout stages (CPU-side). */
  layoutMs: number;
  /** Wall-clock ms in the paint stage (CPU-side). */
  paintMs: number;
  /** Scene nodes repainted this frame (culled survivors; all nodes if full-frame). */
  paintedNodes: number;
  /** Whether damage tracking was off (whole-canvas repaint). */
  fullFrame: boolean;
}

export interface SpatialScene {
  renderer: Canvas2DRenderer;
  /** Total scene nodes (tiles + boxes) — shown in the HUD to frame the cost. */
  nodeCount: number;
  /** Toggle damage tracking on/off; off = repaint the whole canvas each frame. */
  setFullFrame(on: boolean): void;
  /** Re-mark the whole canvas, forcing a full repaint (e.g. after a toggle). */
  requestFullRepaint(): void;
  dispose(): void;
}

export interface SceneOptions {
  width: number;
  height: number;
  onFrame(report: FrameReport): void;
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
  const canvasArea = width * height;
  const renderer = new Canvas2DRenderer(ctx, BACKGROUND);

  // Mirrors root.fullFrame so the frame report can flag whole-canvas repaints.
  let fullFrameMode = false;

  // The render pipeline reports per-stage timing here; the frame subscriber
  // below (which runs after the renderer has painted) folds it into the report.
  let lastTiming = { layoutMs: 0, paintMs: 0, paintedNodes: 0 };
  const root = new SceneRoot(renderer, {
    bounds,
    onFrameTiming: (t) => {
      lastTiming = t;
    },
  });

  // A dense field of static tiles: cheap each, but hundreds of them. With
  // damage tracking the paint walk is culled to the few under the drag; in
  // full-frame mode every tile repaints. Adopt them first so they sit BELOW the
  // draggable boxes (adoption order = paint order = reverse hit-test order).
  const tiles = createTiles(renderer, width, height);
  for (const tile of tiles) root.adoptChild(tile);

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
  // Boxes adopted last → topmost, so a drag always hits a box, not a tile.
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

  // ---- frame report: a second subscriber on the same channel as the renderer.
  // The renderer (subscribed first, inside SceneRoot) has already painted by the
  // time this runs, so `renderer.lastFrame` holds this frame's cost + geometry. ----

  const unsubscribe = root.channel.subscribe(
    () => [{ rect: bounds, kind: 'paint' as const }],
    (dirty) => {
      const painted = renderer.lastFrame;
      options.onFrame({
        kinds: [...new Set(dirty.map((d) => d.kind))],
        rects: painted ? painted.rects : dirty.map((d) => d.rect),
        areaFraction: painted ? painted.areaPx / canvasArea : 0,
        layoutMs: lastTiming.layoutMs,
        paintMs: lastTiming.paintMs,
        paintedNodes: lastTiming.paintedNodes,
        fullFrame: fullFrameMode,
      });
    },
  );

  const requestFullRepaint = () => {
    root.channel.mark([{ rect: bounds, kind: 'paint' }]);
  };

  // Seed the first frame so the background + every box paint once.
  requestFullRepaint();

  return {
    renderer,
    nodeCount: tiles.length + boxes.length,
    setFullFrame(on: boolean) {
      fullFrameMode = on;
      root.fullFrame = on;
    },
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

/** Build a grid of static decorative tiles covering the canvas. */
function createTiles(
  renderer: Canvas2DRenderer,
  width: number,
  height: number,
): TileNode[] {
  const cell = 30;
  const gap = 6;
  const size = cell - gap;
  const tiles: TileNode[] = [];
  for (let y = gap; y + size <= height; y += cell) {
    for (let x = gap; x + size <= width; x += cell) {
      const hue = Math.round(218 + (x / width) * 26);
      const light = Math.round(12 + (y / height) * 9);
      const fill = `hsl(${hue}, 38%, ${light}%)`;
      tiles.push(new TileNode(renderer, { x, y, w: size, h: size }, fill));
    }
  }
  return tiles;
}
