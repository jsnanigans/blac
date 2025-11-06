/**
 * Content Script - Bridges page context and extension
 *
 * Runs in ISOLATED world, communicates with injected script via postMessage
 */

console.log('[BlaC DevTools] Content script loaded');

// Inject script into MAIN world to access window.__BLAC_DEVTOOLS__
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('dist/inject/inject-script.js');
  script.onload = () => script.remove();

  // Inject as early as possible
  (document.head || document.documentElement).appendChild(script);
}

// Inject immediately
injectScript();

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  // Check for our message format
  if (event.data?.source !== 'blac-devtools-inject') return;

  console.log('[BlaC DevTools] Message from inject:', event.data);

  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    console.warn('[BlaC DevTools] Extension context invalidated, ignoring message');
    return;
  }

  // Forward to service worker (spread first to preserve our source)
  chrome.runtime
    .sendMessage({
      ...event.data,
      source: 'blac-devtools-content',
    })
    .catch((error) => {
      // Ignore errors if extension context is invalidated or no receivers
      if (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Receiving end does not exist') ||
        error.message.includes('Could not establish connection')
      ) {
        // Silent ignore - this is expected when devtools is not open
        return;
      }
      console.warn('[BlaC DevTools] Failed to send message:', error);
    });
});

// Listen for messages from DevTools panel (via service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BlaC DevTools] Message from panel:', message);

  // Only process messages from our extension
  if (message.source !== 'blac-devtools-panel') return;

  // Forward to injected script
  window.postMessage(
    {
      source: 'blac-devtools-content',
      ...message,
    },
    '*',
  );

  sendResponse({ received: true });
  return true;
});

// Handle page navigation
let isNavigating = false;

// Clean up on navigation
window.addEventListener('beforeunload', () => {
  isNavigating = true;

  // Check if extension context is still valid
  if (!chrome.runtime?.id) return;

  // Notify service worker (ignore errors during unload)
  chrome.runtime
    .sendMessage({
      source: 'blac-devtools-content',
      type: 'PAGE_UNLOAD',
    })
    .catch(() => {
      // Ignore errors during page unload
    });
});

// Re-inject on navigation without page reload (SPA)
const observer = new MutationObserver(() => {
  if (isNavigating) {
    isNavigating = false;

    // Check if we need to re-inject
    const checkInterval = setInterval(() => {
      if (document.readyState === 'complete') {
        clearInterval(checkInterval);

        // Re-inject script after navigation
        setTimeout(() => {
          injectScript();
        }, 100);
      }
    }, 100);
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Export for TypeScript
export {};

