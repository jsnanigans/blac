/// <reference types="@webgpu/types" />
import { createLayer, createRenderer, initGPU, install, rgba } from 'insomni';
import { paths } from 'insomni/paths';
import type { Color, GPUHandle } from 'insomni';
import {
  pointAt,
  tokenRgb,
  type CableView,
  type Scene,
  type Tone,
} from './cables';

install(paths);

let gpu: Promise<GPUHandle> | null = null;

/** One GPU device per page, shared by every stage on it. */
const sharedGpu = () => (gpu ??= initGPU());

type Rgb = [number, number, number];
const mix = (a: Rgb, b: Rgb, t: number): Rgb =>
  [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as Rgb;
const col = ([r, g, b]: Rgb, a = 1): Color => rgba(r, g, b, a);

/**
 * Cable view drawn by insomni on WebGPU: sagging cables with soft shadows,
 * signal pulses with a bloom and a comet tail, and a glow where a cable is live.
 * Resolves to null when WebGPU is unavailable, so callers fall back to SVG.
 */
export async function createGpuView(
  host: HTMLElement,
): Promise<CableView | null> {
  if (!('gpu' in navigator)) return null;
  let handle: GPUHandle;
  try {
    handle = await sharedGpu();
  } catch {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'bay-cables';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const renderer = createRenderer(handle, canvas);
  renderer.setBackground(rgba(0, 0, 0, 0));
  const layer = createLayer({ space: 'ui' });

  let palette = readPalette(host);
  const themeWatch = new MutationObserver(() => (palette = readPalette(host)));
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  let size = { w: 0, h: 0 };

  return {
    draw(scene: Scene) {
      if (scene.width !== size.w || scene.height !== size.h) {
        size = { w: scene.width, h: scene.height };
        renderer.setSize(
          scene.width,
          scene.height,
          Math.min(devicePixelRatio, 2),
        );
      }
      layer.clear();
      for (const c of scene.cables) {
        const [p0, p1, p2, p3] = c.curve;
        const base = palette[c.tone];
        layer.pushCurve({
          p0,
          p1,
          p2,
          p3,
          color: col(palette.shadow, 0.55),
          width: 9,
        });
        if (c.heat > 0.01) {
          layer.pushCurve({
            p0,
            p1,
            p2,
            p3,
            color: col(palette.lit, 0.22 * c.heat),
            width: 14,
          });
        }
        layer.pushCurve({
          p0,
          p1,
          p2,
          p3,
          color: col(mix(base, palette.lit, c.heat * 0.85)),
          width: 3.5,
        });
        for (const end of [p0, p3]) {
          layer.pushCircle({
            cx: end.x,
            cy: end.y,
            radius: 6,
            fill: col(palette.plug),
          });
          layer.pushCircle({
            cx: end.x,
            cy: end.y,
            radius: 3,
            fill: col(mix(base, palette.lit, c.heat)),
          });
        }
      }
      for (const p of scene.pulses) {
        for (let i = 1; i <= 6; i++) {
          const tail = pointAt(p.curve, Math.max(0, p.t - i * 0.025));
          layer.pushCircle({
            cx: tail.x,
            cy: tail.y,
            radius: 4.5 - i * 0.5,
            fill: col(palette.lit, 0.5 - i * 0.07),
          });
        }
        layer.pushCircle({
          cx: p.at.x,
          cy: p.at.y,
          radius: 16,
          fill: col(palette.lit, 0.55),
          blur: 7,
        });
        layer.pushCircle({
          cx: p.at.x,
          cy: p.at.y,
          radius: 4.5,
          fill: col(palette.hot),
        });
      }
      renderer.render([layer]);
    },
    destroy() {
      themeWatch.disconnect();
      layer.destroy();
      renderer.destroy?.();
      canvas.remove();
    },
  };
}

function readPalette(
  el: Element,
): Record<Tone | 'lit' | 'hot' | 'shadow' | 'plug', Rgb> {
  return {
    cable: tokenRgb(el, '--cable'),
    cobalt: tokenRgb(el, '--cobalt'),
    rose: tokenRgb(el, '--rose'),
    lit: tokenRgb(el, '--lit'),
    hot: tokenRgb(el, '--lit-hot'),
    shadow: tokenRgb(el, '--bg'),
    plug: tokenRgb(el, '--screw'),
  };
}
