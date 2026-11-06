import type { CableView, Scene, Vec } from './cables';

const NS = 'http://www.w3.org/2000/svg';

const pathOf = (pts: readonly Vec[]) =>
  pts
    .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join('');

/** Fallback cable view: plain SVG, for browsers without WebGPU. */
export function createSvgView(host: HTMLElement): CableView {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'bay-cables');
  svg.setAttribute('aria-hidden', 'true');
  host.append(svg);
  const cables = new Map<string, SVGGElement>();
  const dots: SVGCircleElement[] = [];

  const make = (id: string) => {
    const g = document.createElementNS(NS, 'g');
    for (const cls of [
      'bay-cable-shadow',
      'bay-cable',
      'bay-plug',
      'bay-plug',
    ]) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('class', cls);
      g.append(p);
    }
    svg.prepend(g);
    cables.set(id, g);
    return g;
  };

  return {
    draw(scene: Scene) {
      const m = scene.margin;
      svg.setAttribute(
        'viewBox',
        `${-m} ${-m} ${scene.width + 2 * m} ${scene.height + 2 * m}`,
      );
      svg.style.inset = `${-m}px`;
      svg.style.width = `${scene.width + 2 * m}px`;
      svg.style.height = `${scene.height + 2 * m}px`;
      const seen = new Set<string>();
      for (const c of scene.cables) {
        seen.add(c.id);
        const g = cables.get(c.id) ?? make(c.id);
        const [shadow, line, ...plugs] = [...g.children] as SVGPathElement[];
        const d = pathOf(c.pts);
        shadow!.setAttribute('d', d);
        line!.setAttribute('d', d);
        line!.dataset.tone = c.tone;
        line!.style.setProperty('--heat', c.heat.toFixed(3));
        g.style.opacity = String(c.alpha);
        plugs.forEach((el, i) => {
          const p = c.plugs[i];
          el.style.display = p ? '' : 'none';
          if (!p) return;
          const end = { x: p.at.x + p.dir.x * 16, y: p.at.y + p.dir.y * 16 };
          el.setAttribute('d', pathOf([p.at, end]));
          el.dataset.tone = c.tone;
        });
      }
      for (const [id, g] of cables) {
        if (seen.has(id)) continue;
        g.remove();
        cables.delete(id);
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
