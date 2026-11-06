/// <reference types="@webgpu/types" />
import { createLayer, createRenderer, rgba } from 'insomni';
import { tokenRgb, type CableView, type Scene, type Tone } from './cables';
import {
  cable,
  cableShadow,
  col,
  mix,
  plug,
  spark,
  type Rgb,
  type Shades,
} from './cel';
import { sharedGpu } from './gpu';

/**
 * Cable view drawn by insomni on WebGPU, cel-shaded like the logo: inked
 * cables with shade and light bands, hard shadows on the panel, three-quarter
 * plugs, sparks where a plug seats and pulses with a comet tail.
 * Resolves to null when WebGPU is unavailable, so callers fall back to SVG.
 */
export async function createGpuView(
  host: HTMLElement,
): Promise<CableView | null> {
  const handle = await sharedGpu();
  if (!handle) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'bay-cables';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const renderer = createRenderer(handle, canvas, {
    config: { oit: false, persistent: false, maxDpr: 2 },
  });
  renderer.setBackground(rgba(0, 0, 0, 0));
  const shadows = createLayer({ space: 'ui', cache: 'never' });
  const wires = createLayer({ space: 'ui', cache: 'never' });
  const lights = createLayer({ space: 'ui', cache: 'never' });

  let pal = readPalette(host);
  const themeWatch = new MutationObserver(() => (pal = readPalette(host)));
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  let size = { w: 0, h: 0 };

  return {
    draw(scene: Scene) {
      const m = scene.margin;
      const w = scene.width + 2 * m;
      const h = scene.height + 2 * m;
      if (w !== size.w || h !== size.h) {
        size = { w, h };
        canvas.style.inset = `${-m}px`;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        renderer.setSize(w, h, Math.min(devicePixelRatio, 2));
      }
      shadows.clear();
      wires.clear();
      lights.clear();
      const o = (p: { x: number; y: number }) => ({ x: p.x + m, y: p.y + m });

      for (const c of scene.cables) {
        const pts = c.pts.map(o);
        cableShadow(shadows, pts, 4, { x: 5, y: 8 }, pal.shadow, 0.4 * c.alpha);
        if (c.heat > 0.01)
          wires.pushStroke({
            points: pts,
            color: col(pal.lit, 0.22 * c.heat * c.alpha),
            width: 16,
            cap: 'round',
            join: 'round',
          });
        const s = toneShades(pal, c.tone, c.heat, c.hover);
        cable(wires, pts, s, {
          width: 4.2 + c.hover * 0.6,
          ink: pal.ink,
          alpha: c.alpha,
        });
        for (const p of c.plugs)
          plug(
            wires,
            { ...p, at: o(p.at) },
            {
              size: 0.82,
              body: s,
              sleeve: pal.sleeve,
              ink: pal.ink,
              shadow: pal.shadow,
              alpha: c.alpha,
            },
          );
      }
      for (const sp of scene.sparks)
        spark(lights, o(sp.at), sp.t, pal.hot, pal.lit);
      for (const p of scene.pulses) {
        p.trail.forEach((q, i) => {
          const at = o(q);
          lights.pushCircle({
            cx: at.x,
            cy: at.y,
            radius: 4.5 - i * 0.5,
            fill: col(pal.lit, 0.55 - i * 0.07),
          });
        });
        const at = o(p.at);
        lights.pushCircle({
          cx: at.x,
          cy: at.y,
          radius: 16,
          fill: col(pal.lit, 0.55),
          blur: 7,
        });
        lights.pushCircle({
          cx: at.x,
          cy: at.y,
          radius: 4.5,
          fill: col(pal.hot),
        });
      }
      renderer.render([shadows, wires, lights]);
    },
    destroy() {
      themeWatch.disconnect();
      for (const l of [shadows, wires, lights]) l.destroy();
      renderer.destroy?.();
      canvas.remove();
    },
  };
}

type Palette = ReturnType<typeof readPalette>;

function toneShades(
  pal: Palette,
  tone: Tone,
  heat: number,
  hover: number,
): Shades {
  const s = pal[tone];
  const warm = heat * 0.85;
  return {
    lo: mix(s.lo, pal.litLo, warm),
    base: mix(mix(s.base, s.hi, hover * 0.25), pal.lit, warm),
    hi: mix(s.hi, pal.hot, warm),
  };
}

function readPalette(el: Element) {
  const t = (name: string): Rgb => tokenRgb(el, name);
  const shades = (name: string): Shades => ({
    lo: t(`--${name}-lo`),
    base: t(`--${name}`),
    hi: t(`--${name}-hi`),
  });
  return {
    cable: shades('cable'),
    cobalt: shades('cobalt'),
    rose: shades('rose'),
    sleeve: shades('screw'),
    lit: t('--lit'),
    litLo: t('--lit-lo'),
    hot: t('--lit-hot'),
    ink: t('--ink'),
    shadow: t('--shadow'),
  };
}
