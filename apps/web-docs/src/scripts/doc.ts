export {};

// Scroll-spy: the last heading above the reading line is the current one.
const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
const targets = links
  .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
  .filter((el): el is HTMLElement => el !== null);
let queued = false;
const spy = () => {
  queued = false;
  const line = innerHeight * 0.25;
  let current = targets[0];
  for (const t of targets)
    if (t.getBoundingClientRect().top < line) current = t;
  for (const a of links)
    a.toggleAttribute('aria-current', a.hash.slice(1) === current?.id);
};
addEventListener(
  'scroll',
  () => {
    if (!queued) requestAnimationFrame(spy);
    queued = true;
  },
  { passive: true },
);
spy();

document
  .querySelector('.sidebar [aria-current="page"]')
  ?.scrollIntoView({ block: 'center' });
document.querySelector('.sidebar')?.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('a'))
    document.body.classList.remove('nav-open');
});
