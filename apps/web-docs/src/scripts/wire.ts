/**
 * Plug elements in as they scroll into view: each gets `.is-on` once. The root
 * gets `.wired` first, so without JS everything renders already plugged in.
 */
export function wire(selector: string) {
  document.documentElement.classList.add('wired');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-on');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -20% 0px' },
  );
  for (const el of document.querySelectorAll(selector)) io.observe(el);
}
