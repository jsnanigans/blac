export {};

const STORE = 'blac-tabs:';

class BlacTabs extends HTMLElement {
  connectedCallback() {
    const list = this.querySelector<HTMLElement>('.tab-list')!;
    const panels = [
      ...this.querySelectorAll<HTMLElement>(':scope > .tab-panel'),
    ];
    const key = this.dataset.syncKey;
    const buttons = panels.map((panel, i) => {
      const id = `${Math.random().toString(36).slice(2)}-${i}`;
      panel.id = `panel-${id}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'tab';
      b.id = `tab-${id}`;
      b.textContent = panel.dataset.label ?? `Tab ${i + 1}`;
      b.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', () => {
        this.select(b.textContent!);
        if (!key) return;
        try {
          localStorage.setItem(STORE + key, b.textContent!);
        } catch {
          // Storage blocked: fall back to the default.
        }
        for (const other of document.querySelectorAll<BlacTabs>(
          `blac-tabs[data-sync-key="${key}"]`,
        ))
          if (other !== this) other.select(b.textContent!);
      });
      list.append(b);
      return b;
    });
    let saved: string | null = null;
    try {
      saved = key ? localStorage.getItem(STORE + key) : null;
    } catch {
      // Storage blocked: fall back to the default.
    }
    this.select(
      saved && buttons.some((b) => b.textContent === saved)
        ? saved
        : (buttons[0]?.textContent ?? ''),
    );
  }

  select(label: string) {
    for (const b of this.querySelectorAll<HTMLButtonElement>(
      '.tab-list > button',
    )) {
      const on = b.textContent === label;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')!)!.hidden = !on;
    }
  }
}

customElements.define('blac-tabs', BlacTabs);
