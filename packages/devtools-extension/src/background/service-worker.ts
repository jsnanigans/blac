/**
 * Service Worker - Background Script for BlaC DevTools
 *
 * Handles message routing between content scripts and devtools panels
 */

// Connection management
interface Connection {
  port: chrome.runtime.Port;
  tabId: number;
}

// Active connections from DevTools panels
const devToolsConnections = new Map<number, Connection>();

// Cached state for reconnection
const stateCache = new Map<number, any>();

console.log('[BlaC DevTools] Service worker started');

// Handle connections from DevTools panels
chrome.runtime.onConnect.addListener((port) => {
  console.log('[BlaC DevTools] Port connected:', port.name);

  if (port.name.startsWith('devtools-')) {
    const tabId = parseInt(port.name.split('-')[1], 10);

    // Store connection
    devToolsConnections.set(tabId, { port, tabId });

    // Send cached state if available
    if (stateCache.has(tabId)) {
      port.postMessage({
        type: 'CACHED_STATE',
        payload: stateCache.get(tabId),
      });
    }

    // Handle messages from DevTools panel
    port.onMessage.addListener((message) => {
      console.log('[BlaC DevTools] Message from panel:', message);

      // Forward to content script
      chrome.tabs.sendMessage(tabId, {
        source: 'blac-devtools-panel',
        ...message,
      });
    });

    // Clean up on disconnect
    port.onDisconnect.addListener(() => {
      console.log('[BlaC DevTools] Port disconnected for tab', tabId);
      devToolsConnections.delete(tabId);
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BlaC DevTools] Message from content:', message, 'Tab:', sender.tab?.id);

  // Only process messages from content scripts
  if (!sender.tab?.id || message.source !== 'blac-devtools-content') {
    return;
  }

  const tabId = sender.tab.id;

  // Cache the state
  if (message.type === 'STATE_UPDATE') {
    stateCache.set(tabId, message.payload);
  }

  // Forward to DevTools panel if connected
  const connection = devToolsConnections.get(tabId);
  if (connection) {
    connection.port.postMessage(message);
  }

  // Send acknowledgment
  sendResponse({ received: true });
  return true; // Keep channel open for async response
});

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[BlaC DevTools] Tab closed:', tabId);
  stateCache.delete(tabId);
  devToolsConnections.delete(tabId);
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[BlaC DevTools] Extension installed/updated:', details);

  if (details.reason === 'install') {
    console.log('[BlaC DevTools] First installation');
  } else if (details.reason === 'update') {
    console.log('[BlaC DevTools] Updated from version', details.previousVersion);
  }
});

// Export for TypeScript
export {};