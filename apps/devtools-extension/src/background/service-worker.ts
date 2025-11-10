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

    // Send cached state if available
    if (stateCache.has(tabId)) {
      port.postMessage({
        type: 'CACHED_STATE',
        payload: stateCache.get(tabId),
      });
    }

    // Handle messages from DevTools panel
    port.onMessage.addListener((message) => {
      // Forward to content script
      chrome.tabs.sendMessage(tabId, {
        source: 'blac-devtools-panel',
        ...message,
      });
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
  stateCache.delete(tabId);
  devToolsConnections.delete(tabId);
});

// Export for TypeScript
export {};