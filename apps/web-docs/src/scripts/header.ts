export {};

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('blac-theme', next);
  } catch {
    // Storage blocked: the choice just won't persist.
  }
});

const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
toggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', String(open));
});
