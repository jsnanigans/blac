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

    // Send initial state (only time we send all instances)
    sendMessage({
      type: 'INITIAL_STATE',
      payload: {
        instances: api.getInstances(),
        version: api.getVersion(),
      },
    });

    // Subscribe to atomic changes
    const unsubscribe = api.subscribe((event: any) => {
      // Forward atomic events directly - DO NOT fetch all instances!
      sendMessage({
        type: 'ATOMIC_UPDATE',
        payload: event,
      });
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      unsubscribe();
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
        // Only send all instances when explicitly requested (initial load)
        sendMessage({
          type: 'INITIAL_STATE',
          payload: {
            instances: api.getInstances(),
            version: api.getVersion(),
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

