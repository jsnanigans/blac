export {};

for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  btn.addEventListener('click', () => {
    void navigator.clipboard?.writeText(btn.dataset.copy!).then(() => {
      btn.textContent = 'copied';
      setTimeout(() => (btn.textContent = 'copy'), 1400);
    });
  });
}
