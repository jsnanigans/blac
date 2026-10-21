// Dumb relay between the page agent (window.postMessage) and the service
// worker (port). Classic script: keep it import-free. The two source tags
// mirror WINDOW_AGENT_SOURCE / WINDOW_CLIENT_SOURCE in @blac/devtools-connect.
const AGENT_SOURCE = 'blac-devtools-agent';
const CLIENT_SOURCE = 'blac-devtools-client';

let port: chrome.runtime.Port | undefined;

const toPage = (msg: unknown) =>
  window.postMessage({ source: CLIENT_SOURCE, msg }, '*');

const fromPage = (event: MessageEvent) => {
  if (event.source !== window || event.data?.source !== AGENT_SOURCE) return;
  port?.postMessage(event.data.msg);
};

window.addEventListener('message', fromPage);

chrome.runtime.onConnect.addListener((p) => {
  if (p.name !== 'blac-page') return;
  port = p;
  p.onMessage.addListener(toPage);
  p.onDisconnect.addListener(() => {
    // A replacement port may already be connected.
    if (port !== p) return;
    port = undefined;
    toPage({ t: 'bye' });
  });
});
