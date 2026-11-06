import type { CableView, Scene } from './cables';

const NS = 'http://www.w3.org/2000/svg';

/** Fallback cable view: plain SVG, for browsers without WebGPU. */
export function createSvgView(host: HTMLElement): CableView {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'bay-cables');
  svg.setAttribute('aria-hidden', 'true');
  host.append(svg);
  const paths = new Map<string, SVGPathElement[]>();
  const dots: SVGCircleElement[] = [];

  return {
    draw(scene: Scene) {
      svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`);
      const seen = new Set<string>();
      for (const c of scene.cables) {
        seen.add(c.id);
        let pair = paths.get(c.id);
        if (!pair) {
          pair = ['bay-cable-shadow', 'bay-cable'].map((cls) => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('class', cls);
            svg.prepend(p);
            return p;
          });
          paths.set(c.id, pair);
        }
        const [p0, p1, p2, p3] = c.curve;
        const d = `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
        for (const p of pair) p.setAttribute('d', d);
        pair[1]!.dataset.tone = c.tone;
        pair[1]!.style.setProperty('--heat', c.heat.toFixed(3));
      }
      for (const [id, pair] of paths) {
        if (seen.has(id)) continue;
        for (const p of pair) p.remove();
        paths.delete(id);
      }
      while (dots.length < scene.pulses.length) {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('class', 'bay-pulse');
        dot.setAttribute('r', '5');
        svg.append(dot);
        dots.push(dot);
      }
      dots.forEach((dot, i) => {
        const p = scene.pulses[i];
        dot.style.display = p ? '' : 'none';
        if (!p) return;
        dot.setAttribute('cx', String(p.at.x));
        dot.setAttribute('cy', String(p.at.y));
      });
    },
    destroy() {
      svg.remove();
    },
  };
}
