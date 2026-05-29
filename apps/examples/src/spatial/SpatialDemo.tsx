import { useEffect, useRef, useState } from 'react';
import type { Rect, DamageKind } from '@dirtytalk/spatial';
import { ExampleLayout } from '../shared/ExampleLayout';
import { createSpatialScene } from './scene';
import type { FrameReport, SpatialScene } from './scene';
import './spatial.css';

const NORMAL_W = 660;
const NORMAL_H = 420;
const LOG_LIMIT = 5;
const FLASH_MS = 500;

interface Dims {
  w: number;
  h: number;
}

/** Gap left around the expanded canvas so the HUD/controls clear the screen edges. */
const EXPAND_MARGIN = 48;

/**
 * Normal: a fixed inline canvas. Expanded: as large as the viewport allows
 * (minus a margin so nothing is clipped), capped at screen size and centred.
 */
const computeDims = (expanded: boolean): Dims =>
  expanded
    ? {
        w: Math.max(NORMAL_W, window.innerWidth - EXPAND_MARGIN * 2),
        h: Math.max(NORMAL_H, window.innerHeight - EXPAND_MARGIN * 2),
      }
    : { w: NORMAL_W, h: NORMAL_H };

interface Flash {
  rect: Rect;
  born: number;
}

const KIND_COLOR: Record<DamageKind | 'mixed', string> = {
  paint: '#818cf8',
  layout: '#fbbf24',
  data: '#34d399',
  mixed: '#cbd5e1',
};

/** How many recent frames to keep per metric for the percentile readout. */
const SAMPLE_WINDOW = 300;

/** A rolling window of recent samples for one metric (nodes / paint / layout). */
interface Metric {
  samples: number[];
}

interface Aggregates {
  nodes: Metric;
  paint: Metric;
  layout: Metric;
}

const emptyMetric = (): Metric => ({ samples: [] });

const emptyAggregates = (): Aggregates => ({
  nodes: emptyMetric(),
  paint: emptyMetric(),
  layout: emptyMetric(),
});

const pushSample = (m: Metric, v: number): void => {
  m.samples.push(v);
  if (m.samples.length > SAMPLE_WINDOW) m.samples.shift();
};

/** avg / p5 / p95 over a metric's current window; `count` 0 means no data yet. */
interface MetricStats {
  count: number;
  avg: number;
  p5: number;
  p95: number;
}

/** Nearest-rank percentile over an already-sorted ascending array. */
const percentile = (sorted: number[], p: number): number =>
  sorted[Math.round((p / 100) * (sorted.length - 1))];

const computeStats = (m: Metric): MetricStats => {
  const n = m.samples.length;
  if (n === 0) return { count: 0, avg: 0, p5: 0, p95: 0 };
  let sum = 0;
  for (const v of m.samples) sum += v;
  const sorted = [...m.samples].sort((a, b) => a - b);
  return {
    count: n,
    avg: sum / n,
    p5: percentile(sorted, 5),
    p95: percentile(sorted, 95),
  };
};

export function SpatialDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayCtx = useRef<CanvasRenderingContext2D | null>(null);
  const sceneRef = useRef<SpatialScene | null>(null);
  const flashes = useRef<Flash[]>([]);
  const stats = useRef<FrameReport[]>([]);
  const agg = useRef<Aggregates>(emptyAggregates());
  const frameCount = useRef(0);
  const showRegionsRef = useRef(true);
  const dims = useRef<Dims>({ w: NORMAL_W, h: NORMAL_H });

  const [showRegions, setShowRegions] = useState(true);
  const [fullFrame, setFullFrame] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);

  // Build the scene + size the overlay. Rebuilds when the canvas expands so the
  // tile field is regenerated to fit the larger surface.
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const d = computeDims(expanded);
    dims.current = d;

    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(d.w * dpr);
    overlay.height = Math.round(d.h * dpr);
    overlay.style.width = `${d.w}px`;
    overlay.style.height = `${d.h}px`;
    const octx = overlay.getContext('2d');
    if (octx) {
      // Setting .width above reset the transform — re-apply the DPR scale.
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.scale(dpr, dpr);
    }
    overlayCtx.current = octx;

    const scene = createSpatialScene(canvas, {
      width: d.w,
      height: d.h,
      onFrame: (report) => {
        frameCount.current++;
        stats.current = [report, ...stats.current].slice(0, LOG_LIMIT);
        pushSample(agg.current.nodes, report.paintedNodes);
        pushSample(agg.current.paint, report.paintMs);
        pushSample(agg.current.layout, report.layoutMs);
        if (showRegionsRef.current) {
          // Flash exactly what the renderer repainted: the damage rects in
          // tracked mode, or the whole canvas when full-frame is on.
          const born = performance.now();
          for (const r of report.rects) flashes.current.push({ rect: r, born });
        }
      },
    });
    sceneRef.current = scene;
    setNodeCount(scene.nodeCount);
    scene.setFullFrame(fullFrame);

    return () => {
      scene.dispose();
      sceneRef.current = null;
      overlayCtx.current = null;
      flashes.current = [];
      stats.current = [];
    };
    // fullFrame is intentionally not a dep — it's applied here on (re)build and
    // updated live by the effect below without tearing the scene down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Any toggle change starts a fresh measurement window — clear the aggregates,
  // the frame log, and the frame counter so comparisons aren't muddied.
  useEffect(() => {
    agg.current = emptyAggregates();
    stats.current = [];
    frameCount.current = 0;
  }, [fullFrame, showRegions, expanded]);

  // Toggle damage tracking on/off and repaint so the change shows immediately.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setFullFrame(fullFrame);
    scene.requestFullRepaint();
  }, [fullFrame]);

  // Repaint-region flashes are opt-in; drop any pending ones when turned off.
  useEffect(() => {
    showRegionsRef.current = showRegions;
    if (!showRegions) flashes.current = [];
  }, [showRegions]);

  // Overlay paint loop: runs for the component's lifetime. Draws the flashes
  // (when enabled) and the on-canvas HUD (always). Reads dims/ctx from refs so a
  // resize doesn't need to restart it.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const octx = overlayCtx.current;
      const { w, h } = dims.current;
      if (octx) {
        const now = performance.now();
        octx.clearRect(0, 0, w, h);

        if (showRegionsRef.current) {
          flashes.current = flashes.current.filter(
            (f) => now - f.born < FLASH_MS,
          );
          for (const f of flashes.current) {
            const a = 1 - (now - f.born) / FLASH_MS;
            const { x, y, w: fw, h: fh } = f.rect;
            octx.fillStyle = `rgba(99, 102, 241, ${0.16 * a})`;
            octx.fillRect(x, y, fw, fh);
            octx.lineWidth = 1.5;
            octx.strokeStyle = `rgba(99, 102, 241, ${0.9 * a})`;
            octx.strokeRect(x + 0.75, y + 0.75, fw - 1.5, fh - 1.5);
          }
        }

        drawHud(octx, w, stats.current, frameCount.current, agg.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggles = (
    <>
      <label className="spatial-hud__toggle">
        <input
          type="checkbox"
          checked={fullFrame}
          onChange={(e) => setFullFrame(e.target.checked)}
        />
        <span className="spatial-hud__toggle-text">
          Full-frame repaint
          <span className="spatial-hud__toggle-sub">damage tracking off</span>
        </span>
      </label>
      <label className="spatial-hud__toggle">
        <input
          type="checkbox"
          checked={showRegions}
          onChange={(e) => setShowRegions(e.target.checked)}
        />
        <span className="spatial-hud__toggle-text">
          Show repaint regions
          <span className="spatial-hud__toggle-sub">flash damaged rects</span>
        </span>
      </label>
      <button
        type="button"
        className="spatial-btn"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Exit fullscreen' : 'Expand canvas'}
      </button>
    </>
  );

  return (
    <ExampleLayout
      title="Spatial Damage Tracking"
      description="A canvas scene graph driven entirely by @dirtytalk/spatial — no BlaC, no React reconciler in the render loop. Drag the boxes and watch only the damaged rectangles repaint."
      features={[
        'Paint walk culled to nodes touching the damage',
        'Renderer scissors each frame to its individual damage rects',
        'PointerRouter hit-tests in z-order + captures the drag',
        'DirtyChannel coalesces marks to one frame per rAF',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Live scene</h2>
          <p className="text-muted">
            Hundreds of static <code>SceneNode</code> tiles sit under three
            draggable boxes. Dragging a box marks erase(old) + fill(new) damage;{' '}
            <code>SceneRoot</code> then <strong>culls the paint walk</strong> to
            the handful of nodes those rects touch. Flip{' '}
            <strong>full-frame repaint</strong> to disable tracking — now every
            node repaints every frame. Watch the <strong>paint</strong> stat in
            the on-canvas HUD: a handful of tiles vs. all {nodeCount}.{' '}
            <strong>Expand</strong> grows the field so the gap widens.
          </p>
        </div>

        <div className="spatial-stage">
          <div
            className={`spatial-canvas-wrap${expanded ? ' is-expanded' : ''}`}
            style={expanded ? undefined : { width: NORMAL_W, height: NORMAL_H }}
          >
            <canvas ref={canvasRef} className="spatial-canvas" />
            <canvas ref={overlayRef} className="spatial-overlay" />
            {expanded ? (
              <div className="spatial-panel">
                <span className="spatial-panel__title">{nodeCount} nodes</span>
                {toggles}
              </div>
            ) : null}
          </div>

          {expanded ? null : (
            <aside className="spatial-controls">
              <span className="spatial-controls__title">
                Controls · {nodeCount} nodes
              </span>
              {toggles}
              <p className="spatial-controls__hint text-small text-muted">
                Drag a box across the tile field. With tracking on, only tiles
                under the drag repaint; <strong>full-frame</strong> repaints all{' '}
                {nodeCount}. The damage log + stage stats are on the canvas
                (top-right).
              </p>
            </aside>
          )}
        </div>
      </section>

      <section className="stack-md">
        <h2>How it works</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Damage carries geometry:</strong> every mutation reports a{' '}
            <code>Rect</code> and a <code>DamageKind</code> (<code>paint</code>/
            <code>layout</code>/<code>data</code>), not just &ldquo;something
            changed.&rdquo;
          </p>
          <p>
            • <strong>Erase + fill:</strong> moving a node damages both its old
            and new rect, so the previous position is repainted as background —
            no trails, no full-canvas clear.
          </p>
          <p>
            • <strong>Cull, then scissor:</strong> the paint walk skips any node
            whose bounds don&rsquo;t intersect the damage (cost scales with{' '}
            <em>damaged nodes</em>, not scene size), and the renderer&rsquo;s
            multi-rect <code>beginFrame(regions)</code> clips the
            survivors&rsquo; draws to the damage rects so untouched pixels —
            including the dead corridor of a fast drag — are never
            re-rasterised.
          </p>
          <p>
            • <strong>Cost readout:</strong> the HUD shows the % of canvas
            repainted per frame plus a rolling <strong>avg / p5 / p95</strong>{' '}
            (over the last {SAMPLE_WINDOW} frames, reset on any toggle) for the
            number of <strong>nodes repainted</strong> and the{' '}
            <strong>layout</strong>/<strong>paint</strong> stage times. The node
            gap is the headline: a few tiles vs. all {nodeCount}. Area is exact;
            times are CPU-side dispatch only (the browser composites the canvas
            on the GPU, which the web exposes no counters for). Layout reads ~0
            here — the tiles have no <code>doLayout</code>.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Draw the cost HUD onto the overlay (CSS-px coordinates). */
function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  rows: FrameReport[],
  totalFrames: number,
  agg: Aggregates,
): void {
  const W = 268;
  const PAD = 12;
  const X = canvasW - W - 12;
  const Y = 12;
  const titleH = 20;
  const headerH = 16;
  const rowH = 16;
  const sectionGap = 10;
  const footerH = 16;
  const bodyRows = Math.max(rows.length, 1);
  // title + log(header + rows) + gap + stats(header + 3 rows) + gap + footer
  const H =
    PAD +
    titleH +
    headerH +
    bodyRows * rowH +
    sectionGap +
    headerH +
    3 * rowH +
    sectionGap +
    footerH +
    PAD;

  // Panel background.
  ctx.fillStyle = 'rgba(10, 12, 22, 0.82)';
  roundRect(ctx, X, Y, W, H, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1;
  roundRect(ctx, X + 0.5, Y + 0.5, W - 1, H - 1, 10);
  ctx.stroke();

  // Three right-aligned numeric columns share the same anchors across the log
  // and the stats table so they line up; KIND/labels are left-aligned.
  const left = X + PAD;
  const timeR = X + W - PAD; // TIME / P95
  const areaR = timeR - 58; // AREA / P5
  const nodesR = areaR - 54; // NODES / AVG
  let y = Y + PAD + 12;

  // Title + frame counter.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font =
    "600 12px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('repaint cost', left, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = `500 11px ${MONO}`;
  ctx.fillText(`${totalFrames} frames`, timeR, y);
  y += titleH - 4;

  // ---- last-N frames log ----
  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText('KIND', left, y);
  ctx.textAlign = 'right';
  ctx.fillText('NODES', nodesR, y);
  ctx.fillText('AREA', areaR, y);
  ctx.fillText('TIME', timeR, y);
  y += headerH;

  ctx.font = `12px ${MONO}`;
  if (rows.length === 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText('drag a box…', left, y);
    y += rowH;
  }
  for (const r of rows) {
    const kind = r.kinds.length === 1 ? r.kinds[0] : 'mixed';
    ctx.textAlign = 'left';
    ctx.fillStyle = KIND_COLOR[kind];
    ctx.fillText(kind, left, y);
    ctx.textAlign = 'right';
    // Full-frame rows repaint every node / ~100% — flag them red so the cost
    // stands out against the handful repainted under damage tracking.
    ctx.fillStyle = r.fullFrame ? '#f87171' : '#cbd5e1';
    ctx.fillText(`${r.paintedNodes}`, nodesR, y);
    ctx.fillText(`${(r.areaFraction * 100).toFixed(1)}%`, areaR, y);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${r.paintMs.toFixed(2)}ms`, timeR, y);
    y += rowH;
  }
  y += sectionGap;

  // ---- rolling per-frame stats (avg / p5 / p95 over the sample window) ----
  // Right-aligned columns reuse the log's numeric anchors so they line up.
  const avgR = nodesR;
  const p5R = areaR;
  const p95R = timeR;
  ctx.font = `600 10px ${MONO}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText('PER-FRAME', left, y);
  ctx.textAlign = 'right';
  ctx.fillText('AVG', avgR, y);
  ctx.fillText('P5', p5R, y);
  ctx.fillText('P95', p95R, y);
  y += headerH;

  ctx.font = `12px ${MONO}`;
  const cols = { left, avgR, p5R, p95R };
  // nodes repainted: the headline. avg keeps a decimal; p5/p95 are whole counts.
  drawStatRow(
    ctx,
    'nodes',
    computeStats(agg.nodes),
    KIND_COLOR.data,
    { ...cols, y },
    fmtNodeAvg,
    fmtCount,
  );
  y += rowH;
  drawStatRow(
    ctx,
    'paint ms',
    computeStats(agg.paint),
    KIND_COLOR.paint,
    { ...cols, y },
    fmtMs,
    fmtMs,
  );
  y += rowH;
  drawStatRow(
    ctx,
    'layout ms',
    computeStats(agg.layout),
    KIND_COLOR.layout,
    { ...cols, y },
    fmtMs,
    fmtMs,
  );
  y += rowH + sectionGap;

  // Footer: best-effort memory readout. JS heap is Chromium-only and is process
  // heap, not paint memory — included for reference, not a paint-cost signal.
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText(`JS heap ${heapText()}`, left, y);
}

interface StatCols {
  left: number;
  avgR: number;
  p5R: number;
  p95R: number;
  y: number;
}

const fmtMs = (v: number): string => v.toFixed(2);
const fmtCount = (v: number): string => Math.round(v).toString();
const fmtNodeAvg = (v: number): string => v.toFixed(1);

function drawStatRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  s: MetricStats,
  color: string,
  cols: StatCols,
  fmtAvg: (v: number) => string,
  fmtPct: (v: number) => string,
): void {
  const { left, avgR, p5R, p95R, y } = cols;
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.fillText(label, left, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cbd5e1';
  if (s.count === 0) {
    ctx.fillText('—', avgR, y);
    ctx.fillText('—', p5R, y);
    ctx.fillText('—', p95R, y);
    return;
  }
  ctx.fillText(fmtAvg(s.avg), avgR, y);
  ctx.fillText(fmtPct(s.p5), p5R, y);
  ctx.fillText(fmtPct(s.p95), p95R, y);
}

function heapText(): string {
  const mem = (
    performance as unknown as { memory?: { usedJSHeapSize: number } }
  ).memory;
  return mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'n/a';
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
