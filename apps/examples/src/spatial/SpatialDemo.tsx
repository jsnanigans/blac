import { useEffect, useRef, useState } from 'react';
import { unionRects } from '@dirtytalk/spatial';
import type { Rect } from '@dirtytalk/spatial';
import { ExampleLayout } from '../shared/ExampleLayout';
import { createSpatialScene } from './scene';
import type { DamageHudEntry, SpatialScene } from './scene';
import './spatial.css';

const CANVAS_W = 660;
const CANVAS_H = 420;
const LOG_LIMIT = 12;
const FLASH_MS = 500;

interface LoggedDamage extends DamageHudEntry {
  id: number;
}

interface Flash {
  rect: Rect;
  born: number;
}

export function SpatialDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayCtx = useRef<CanvasRenderingContext2D | null>(null);
  const sceneRef = useRef<SpatialScene | null>(null);
  const flashes = useRef<Flash[]>([]);
  const debugRef = useRef(false);
  const nextId = useRef(0);

  const [log, setLog] = useState<LoggedDamage[]>([]);
  const [frames, setFrames] = useState(0);
  const [debug, setDebug] = useState(true);

  // Build the scene + size the overlay. Runs once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(CANVAS_W * dpr);
    overlay.height = Math.round(CANVAS_H * dpr);
    overlay.style.width = `${CANVAS_W}px`;
    overlay.style.height = `${CANVAS_H}px`;
    const octx = overlay.getContext('2d');
    if (octx) octx.scale(dpr, dpr);
    overlayCtx.current = octx;

    const scene = createSpatialScene(canvas, {
      width: CANVAS_W,
      height: CANVAS_H,
      onDamage: (entries) => {
        setFrames((f) => f + 1);
        setLog((prev) => {
          const tagged = entries.map((e) => ({ ...e, id: nextId.current++ }));
          return [...tagged.reverse(), ...prev].slice(0, LOG_LIMIT);
        });
        if (debugRef.current && entries.length > 0) {
          flashes.current.push({
            rect: unionRects(entries.map((e) => e.rect)),
            born: performance.now(),
          });
        }
      },
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
      overlayCtx.current = null;
      flashes.current = [];
    };
  }, []);

  // Repaint-region overlay: a self-clearing fade loop, active only while on.
  useEffect(() => {
    debugRef.current = debug;
    const octx = overlayCtx.current;
    if (!octx) return;

    if (!debug) {
      octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      flashes.current = [];
      return;
    }

    let raf = 0;
    const loop = () => {
      const now = performance.now();
      octx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      flashes.current = flashes.current.filter((f) => now - f.born < FLASH_MS);
      for (const f of flashes.current) {
        const a = 1 - (now - f.born) / FLASH_MS;
        const { x, y, w, h } = f.rect;
        octx.fillStyle = `rgba(99, 102, 241, ${0.16 * a})`;
        octx.fillRect(x, y, w, h);
        octx.lineWidth = 1.5;
        octx.strokeStyle = `rgba(99, 102, 241, ${0.9 * a})`;
        octx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [debug]);

  return (
    <ExampleLayout
      title="Spatial Damage Tracking"
      description="A canvas scene graph driven entirely by @dirtytalk/spatial — no BlaC, no React reconciler in the render loop. Drag the boxes and watch only the damaged rectangles repaint."
      features={[
        'Rect-based damage instead of a single dirty bit',
        'Renderer scissors each frame to the damage region',
        'PointerRouter hit-tests in z-order + captures the drag',
        'DirtyChannel coalesces marks to one frame per rAF',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Live scene</h2>
          <p className="text-muted">
            Each box is a <code>SceneNode</code>. A drag calls{' '}
            <code>setBounds</code>, which emits <strong>two</strong> paint
            damages — erase(old&nbsp;rect) + fill(new&nbsp;rect) — so the old
            footprint is always cleaned. The renderer repaints only the union of
            those rects. Toggle <strong>show repaint regions</strong> to flash
            each frame&rsquo;s scissor box.
          </p>
        </div>

        <div className="spatial-stage">
          <div
            className="spatial-canvas-wrap"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            <canvas
              ref={canvasRef}
              className="spatial-canvas"
              style={{ width: CANVAS_W, height: CANVAS_H }}
            />
            <canvas ref={overlayRef} className="spatial-overlay" />
          </div>

          <aside className="spatial-hud">
            <div className="spatial-hud__head">
              <span className="spatial-hud__title">Damage log</span>
              <span className="spatial-hud__count">{frames} frames</span>
            </div>

            <label className="spatial-hud__toggle">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
              />
              <span>show repaint regions</span>
            </label>

            <ul className="spatial-hud__list">
              {log.length === 0 ? (
                <li className="spatial-hud__empty">drag a box…</li>
              ) : (
                log.map((d) => (
                  <li key={d.id} className={`dmg dmg--${d.kind}`}>
                    <span className="dmg__kind">{d.kind}</span>
                    <span className="dmg__rect">{fmtRect(d.rect)}</span>
                  </li>
                ))
              )}
            </ul>
          </aside>
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
            • <strong>Scissor repaint:</strong> <code>beginFrame(region)</code>{' '}
            clips the context to the union of the frame&rsquo;s damage, so
            untouched pixels survive. Drag one box and its neighbours are never
            redrawn.
          </p>
          <p>
            • <strong>Pointer capture:</strong> <code>pointerdown</code>{' '}
            hit-tests the topmost box and captures it; subsequent moves route to
            that box even if the cursor leaves its bounds — so a fast drag never
            drops.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}

function fmtRect(r: Rect): string {
  const n = (v: number) => Math.round(v);
  return `${n(r.x)},${n(r.y)} · ${n(r.w)}×${n(r.h)}`;
}
