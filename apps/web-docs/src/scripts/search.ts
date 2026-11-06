export {};

type Hit = { url: string; excerpt: string; meta: { title?: string } };
type Pagefind = {
  debouncedSearch: (
    q: string,
  ) => Promise<{ results: { data: () => Promise<Hit> }[] } | null>;
};

const dialog = document.querySelector<HTMLDialogElement>('dialog.search')!;
const input = dialog.querySelector('input')!;
const list = dialog.querySelector('.search-results')!;
let pagefind: Promise<Pagefind | null> | null = null;

const load = (): Promise<Pagefind | null> =>
  (pagefind ??= import(
    /* @vite-ignore */ `${location.origin}/pagefind/pagefind.js`
  ).catch(() => null));

const open = () => {
  void load();
  dialog.showModal();
  input.select();
};

document.querySelector('.search-btn')!.addEventListener('click', open);
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (dialog.open) dialog.close();
    else open();
  }
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

input.addEventListener('input', async () => {
  const q = input.value.trim();
  const pf = await load();
  if (!pf) {
    list.innerHTML =
      '<li class="search-empty">Search runs on the built site (<code>pnpm build</code>).</li>';
    return;
  }
  if (!q) {
    list.innerHTML = '';
    return;
  }
  const search = await pf.debouncedSearch(q);
  if (!search) return;
  const hits = await Promise.all(
    search.results.slice(0, 8).map((r) => r.data()),
  );
  list.innerHTML = hits.length
    ? hits
        .map(
          (h) =>
            `<li><a href="${h.url}"><strong>${escape(h.meta.title ?? h.url)}</strong><span>${h.excerpt}</span></a></li>`,
        )
        .join('')
    : `<li class="search-empty">No matches for “${escape(q)}”.</li>`;
});
