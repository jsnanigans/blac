/**
 * Content Script - Bridges page context and extension
 *
 * Listens for messages posted by DevToolsBrowserPlugin (blac-devtools-plugin source)
 * and forwards them to the service worker. Also forwards commands from the DevTools
 * panel back to the page via window.postMessage.
 */

// Listen for messages from DevToolsBrowserPlugin
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if ((event.data as Record<string, any>)?.source !== 'blac-devtools-plugin')
    return;

  if (!chrome.runtime?.id) {
    console.warn(
      '[BlaC DevTools] Extension context invalidated, ignoring message',
    );
    return;
  }

  chrome.runtime
    .sendMessage({
      ...(event.data as Record<string, any>),
      source: 'blac-devtools-content',
    })
    .catch((error: Error) => {
      if (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Receiving end does not exist') ||
        error.message.includes('Could not establish connection')
      ) {
        return;
      }
      console.warn('[BlaC DevTools] Failed to send message:', error);
    });
});

// Listen for commands from DevTools panel (via service worker) and forward to page
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as Record<string, any>).source !== 'blac-devtools-panel') return;

  window.postMessage(
    {
      ...(message as Record<string, any>),
      source: 'blac-devtools-content',
    },
    window.location.origin,
  );

  sendResponse({ received: true });
  return true;
});

// Notify service worker when page unloads
window.addEventListener('beforeunload', () => {
  if (!chrome.runtime?.id) return;
  chrome.runtime
    .sendMessage({
      source: 'blac-devtools-content',
      type: 'PAGE_UNLOAD',
    })
    .catch(() => {});
});

export {};
