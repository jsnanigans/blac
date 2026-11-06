export {};

const BAND = { wide: '-45% 0px -45% 0px', narrow: '-66% 0px -26% 0px' };
const narrow = matchMedia('(max-width: 900px)');

class BlacScrolly extends HTMLElement {
  private io: IntersectionObserver | null = null;
  active: string | null = null;

  connectedCallback() {
    const beats = [...this.querySelectorAll<HTMLElement>('[data-beat]')];
    if (!beats.length) return;
    this.setActive(beats[0]!);
    const observe = () => {
      this.io?.disconnect();
      this.io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) this.setActive(e.target as HTMLElement);
        },
        { rootMargin: narrow.matches ? BAND.narrow : BAND.wide },
      );
      for (const b of beats) this.io.observe(b);
    };
    observe();
    narrow.addEventListener('change', observe);
  }

  disconnectedCallback() {
    this.io?.disconnect();
  }

  private setActive(el: HTMLElement) {
    const id = el.dataset.beat!;
    if (id === this.active) return;
    this.active = id;
    for (const b of this.querySelectorAll('[data-beat]'))
      b.classList.toggle('active', b === el);
    this.dispatchEvent(new CustomEvent('beat', { detail: id, bubbles: true }));
  }
}

customElements.define('blac-scrolly', BlacScrolly);
