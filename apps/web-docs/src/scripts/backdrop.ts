export {};

const host = document.querySelector<HTMLElement>('[data-backdrop]');
if (host) {
  const preset = host.dataset.backdrop === 'chapter' ? 'chapter' : 'hero';
  void import('../backdrop/backdrop')
    .then((m) => m.mountBackdrop(host, preset))
    .catch((e: unknown) => console.warn('backdrop: falling back to CSS', e));
}
