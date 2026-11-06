/** Restart the amber "lit" glow on `el`: it lights, then decays. */
export function light(el: Element | null) {
  if (!el) return;
  el.classList.remove('is-lit');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-lit');
}
