/**
 * Inject Script - Runs in MAIN world with access to window.__BLAC_DEVTOOLS__
 *
 * Monitors BlaC state and forwards to content script
 */

(() => {
  console.log('[BlaC DevTools] Inject script loaded');

  // Check for BlaC DevTools API
  function checkForAPI() {
    if (typeof window.__BLAC_DEVTOOLS__ === 'undefined') {
      console.log('[BlaC DevTools] API not found, retrying...');
      setTimeout(checkForAPI, 500);
      return;
    }

    console.log('[BlaC DevTools] API found!');
    initializeMonitoring();
  }

  // Initialize monitoring
  function initializeMonitoring() {
    const api = window.__BLAC_DEVTOOLS__;

    if (!api || !api.isEnabled()) {
      console.log('[BlaC DevTools] API is disabled');
      return;
    }

    console.log('[BlaC DevTools] Initializing monitoring');

    // Send initial state
    sendMessage({
      type: 'INITIAL_STATE',
      payload: {
        instances: api.getInstances(),
        version: api.getVersion(),
      },
    });

    // Subscribe to changes
    const unsubscribe = api.subscribe((event: any) => {
      sendMessage({
        type: 'STATE_UPDATE',
        payload: {
          event,
          instances: api.getInstances(),
        },
      });
    });

    // Periodic sync (every 2 seconds)
    const syncInterval = setInterval(() => {
      sendMessage({
        type: 'SYNC',
        payload: {
          instances: api.getInstances(),
        },
      });
    }, 2000);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      unsubscribe();
      clearInterval(syncInterval);
    });

    // Listen for commands from content script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.source !== 'blac-devtools-content') return;

      handleCommand(event.data);
    });
  }

  // Send message to content script
  function sendMessage(data: any) {
    window.postMessage(
      {
        source: 'blac-devtools-inject',
        ...data,
      },
      '*',
    );
  }

  // Handle commands from DevTools panel
  function handleCommand(command: any) {
    const api = window.__BLAC_DEVTOOLS__;
    if (!api) return;

    console.log('[BlaC DevTools] Handling command:', command);

    switch (command.type) {
      case 'GET_INSTANCES':
        sendMessage({
          type: 'INSTANCES_RESPONSE',
          payload: {
            instances: api.getInstances(),
          },
        });
        break;

      case 'GET_VERSION':
        sendMessage({
          type: 'VERSION_RESPONSE',
          payload: {
            version: api.getVersion(),
          },
        });
        break;

      case 'REFRESH':
        sendMessage({
          type: 'REFRESH_RESPONSE',
          payload: {
            instances: api.getInstances(),
          },
        });
        break;

      default:
        console.warn('[BlaC DevTools] Unknown command:', command.type);
    }
  }

  // Start checking for API
  checkForAPI();
})();

