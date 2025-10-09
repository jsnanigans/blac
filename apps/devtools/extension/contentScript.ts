export {};

// Inject script into page context to set __BLAC_DEVTOOLS__
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// Forward messages from page to background
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.source === 'blac-devtools-app') {
    chrome.runtime.sendMessage(event.data.payload);
  }
});

// Forward messages from background to page
chrome.runtime.onMessage.addListener((message: any) => {
  window.postMessage(
    {
      source: 'blac-devtools-extension',
      payload: message,
    },
    '*',
  );
});
