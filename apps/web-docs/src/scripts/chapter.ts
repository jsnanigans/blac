export {};

// Reading bar under the topbar, and a rail of beat numbers that follows the active beat.
class ChapterProgress extends HTMLElement {
  connectedCallback() {
    const article = this.closest('article')!;
    const bar = this.querySelector<HTMLElement>('.progress-bar span')!;
    const list = this.querySelector('.rail ol')!;
    const beats = [...article.querySelectorAll<HTMLElement>('[data-beat]')];
    list.innerHTML = beats
      .map(
        (b, i) =>
          `<li><a href="#${b.id}" data-for="${b.id}"><span class="rail-num">${String(i + 1).padStart(2, '0')}</span><span class="rail-title">${b.dataset.title}</span></a></li>`,
      )
      .join('');
    const links = [...list.querySelectorAll<HTMLAnchorElement>('a')];

    let queued = false;
    const measure = () => {
      queued = false;
      const r = article.getBoundingClientRect();
      const total = r.height - innerHeight;
      bar.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0})`;
      const mid = innerHeight / 2;
      const active = [
        ...article.querySelectorAll<HTMLElement>('[data-beat].active'),
      ].find((b) => {
        const s = b.closest('blac-scrolly')!.getBoundingClientRect();
        return s.top < mid && s.bottom > mid;
      });
      for (const a of links)
        a.toggleAttribute('aria-current', a.dataset.for === active?.id);
      const body = article.querySelector('.body')!.getBoundingClientRect();
      this.classList.toggle('in-body', body.top < mid && body.bottom > mid);
    };
    const schedule = () => {
      if (!queued) requestAnimationFrame(measure);
      queued = true;
    };
    addEventListener('scroll', schedule, { passive: true });
    article.addEventListener('beat', schedule);
    measure();
  }
}

customElements.define('chapter-progress', ChapterProgress);
