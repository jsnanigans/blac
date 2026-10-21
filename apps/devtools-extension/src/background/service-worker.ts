import {
  PROTOCOL_VERSION,
  type AgentMsg,
} from '@blac/devtools-connect/protocol';

// Stateless router: a panel port per tab, spliced to a port into that tab's
// top-frame content script. Nothing is cached; if this worker is killed the
// panel's port closes and it reconnects.
const PANEL_PREFIX = 'blac-panel:';
const panels = new Map<number, chrome.runtime.Port>();
const pages = new Map<number, chrome.runtime.Port>();

const post = (port: chrome.runtime.Port | undefined, msg: unknown) => {
  try {
    port?.postMessage(msg);
  } catch {
    // port already gone; its onDisconnect cleans up
  }
};

const detach = (tabId: number) => {
  pages.get(tabId)?.disconnect();
  pages.delete(tabId);
};

const attach = (tabId: number, panel: chrome.runtime.Port) => {
  detach(tabId);
  const page = chrome.tabs.connect(tabId, { name: 'blac-page', frameId: 0 });
  pages.set(tabId, page);
  page.onMessage.addListener((msg: AgentMsg) => post(panel, msg));
  // Fires when the document unloads (reload, navigation) or has no content
  // script (e.g. chrome:// pages).
  page.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    if (pages.get(tabId) !== page) return;
    pages.delete(tabId);
    post(panel, { t: 'bye' } satisfies AgentMsg);
  });
};

// Same-document (SPA) navigations keep the page port; only a new document
// needs relinking, after which the panel is nudged to say hello again.
const onUpdated = (tabId: number, info: { status?: string }) => {
  const panel = panels.get(tabId);
  if (!panel || info.status !== 'complete' || pages.has(tabId)) return;
  attach(tabId, panel);
  post(panel, { t: 'ready', protocol: PROTOCOL_VERSION } satisfies AgentMsg);
};

chrome.runtime.onConnect.addListener((panel) => {
  if (!panel.name.startsWith(PANEL_PREFIX)) return;
  const tabId = Number(panel.name.slice(PANEL_PREFIX.length));

  if (panels.size === 0) chrome.tabs.onUpdated.addListener(onUpdated);
  panels.set(tabId, panel);
  attach(tabId, panel);

  panel.onMessage.addListener((msg) => post(pages.get(tabId), msg));
  panel.onDisconnect.addListener(() => {
    if (panels.get(tabId) !== panel) return;
    panels.delete(tabId);
    detach(tabId);
    if (panels.size === 0) chrome.tabs.onUpdated.removeListener(onUpdated);
  });
});
