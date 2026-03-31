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

// Handle connections from DevTools panels
chrome.runtime.onConnect.addListener((port) => {
  if (port.name.startsWith('devtools-')) {
    const tabId = parseInt(port.name.split('-')[1], 10);

    // Store connection
    devToolsConnections.set(tabId, { port, tabId });

    // Send cached full state if available (panel gets an immediate INITIAL_STATE on reconnect)
    if (stateCache.has(tabId)) {
      port.postMessage(stateCache.get(tabId));
    }

    // Handle messages from DevTools panel
    port.onMessage.addListener((message) => {
      // Forward to content script
      chrome.tabs
        .sendMessage(tabId, {
          source: 'blac-devtools-panel',
          ...message,
        })
        .catch(() => {});
    });

    // Clean up on disconnect
    port.onDisconnect.addListener(() => {
      devToolsConnections.delete(tabId);
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only process messages from content scripts
  if (!sender.tab?.id || message.source !== 'blac-devtools-content') {
    return;
  }

  const tabId = sender.tab.id;

  // Handle page unload - clear cache and notify panel
  if (message.type === 'PAGE_UNLOAD') {
    // Clear cached state for this tab
    stateCache.delete(tabId);

    // Notify DevTools panel that page is reloading
    const connection = devToolsConnections.get(tabId);
    if (connection) {
      connection.port.postMessage({
        type: 'PAGE_RELOAD',
        payload: { tabId, timestamp: Date.now() },
      });
    }

    sendResponse({ received: true });
    return true;
  }

  // Cache full state snapshots for reconnecting panels
  if (message.type === 'INITIAL_STATE') {
    stateCache.set(tabId, message);
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

// Detect page navigation/reload via tabs.onUpdated (no extra permissions needed)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;

  stateCache.delete(tabId);

  const connection = devToolsConnections.get(tabId);
  if (connection) {
    connection.port.postMessage({
      type: 'PAGE_RELOAD',
      payload: { tabId, timestamp: Date.now() },
    });
  }
});

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  stateCache.delete(tabId);
  devToolsConnections.delete(tabId);
});

// Export for TypeScript
export {};
