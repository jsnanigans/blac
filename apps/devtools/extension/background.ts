export {};

const connections = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name !== 'blac-devtools-panel') return;

  let inspectedTabId: number | undefined;

  port.onMessage.addListener((message: any) => {
    // Handle initialization message from devtools panel
    if (message.type === 'INIT' && typeof message.tabId === 'number') {
      const tabId: number = message.tabId;
      inspectedTabId = tabId;
      connections.set(tabId, port);

      // Persist connection info in session storage
      chrome.storage.session
        .set({
          [`connection_${tabId}`]: {
            connected: true,
            timestamp: Date.now(),
          },
        })
        .catch((error) => {
          console.error('[Background] Failed to persist connection:', error);
        });

      return;
    }

    // Handle heartbeat messages
    if (message.type === 'HEARTBEAT') {
      // Send heartbeat acknowledgment back
      port.postMessage({
        type: 'HEARTBEAT_ACK',
      });
      return;
    }

    // Forward other messages to the content script
    if (inspectedTabId !== undefined) {
      chrome.tabs.sendMessage(inspectedTabId, message).catch((error) => {
        console.warn(
          '[Background] Failed to send message to tab:',
          inspectedTabId,
          error,
        );
      });
    }
  });

  port.onDisconnect.addListener(() => {
    if (inspectedTabId !== undefined) {
      connections.delete(inspectedTabId);

      // Remove connection from session storage
      chrome.storage.session
        .remove(`connection_${inspectedTabId}`)
        .catch((error) => {
          console.error('[Background] Failed to remove connection:', error);
        });
    }
  });
});

chrome.runtime.onMessage.addListener(
  (message: any, sender: chrome.runtime.MessageSender) => {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    const port = connections.get(tabId);
    if (port) {
      port.postMessage(message);
    }
  },
);

// Restore connections on service worker wake
chrome.runtime.onStartup.addListener(async () => {
  try {
    const items = await chrome.storage.session.get();
    Object.keys(items).forEach((key) => {
      if (key.startsWith('connection_')) {
        const tabId = parseInt(key.replace('connection_', ''));
        console.log(`[Background] Connection data found for tab ${tabId}`);
        // Actual connection will be restored when DevTools panel reconnects
      }
    });
  } catch (error) {
    console.error('[Background] Failed to restore connections:', error);
  }
});
