/**
 * Inject Script - Runs in MAIN world with access to window.__BLAC_DEVTOOLS__
 *
 * Monitors BlaC state and forwards to content script
 */

(() => {
  let isInitialized = false;
  let checkAttempts = 0;
  const MAX_CHECK_ATTEMPTS = 20; // 10 seconds total (20 * 500ms)
  let queuedCommands: any[] = [];

  /**
   * Transform backend InstanceState to panel-compatible format
   * Backend returns: { id, className, name, isIsolated, currentState, history, createdAt }
   * Panel expects: { id, className, name, isDisposed, state, lastStateChangeTimestamp, createdAt }
   */
  function transformInstancesForPanel(instances: any[]): any[] {
    return instances.map((inst) => {
      // If already in panel format (legacy getInstances), pass through
      if ('state' in inst && !('currentState' in inst)) {
        return inst;
      }

      // Transform new format to panel format
      const history = inst.history || [];
      // Get the most recent change (last element in history array)
      const lastChange = history.length > 0 ? history[history.length - 1] : null;

      return {
        id: inst.id,
        className: inst.className,
        name: inst.name,
        isDisposed: inst.isDisposed || false,
        isIsolated: inst.isIsolated || false,
        state: inst.currentState !== undefined ? inst.currentState : inst.state,
        lastStateChangeTimestamp: lastChange?.timestamp || inst.createdAt || Date.now(),
        createdAt: inst.createdAt || Date.now(),
        hydrationStatus: inst.hydrationStatus,
        hydrationError: inst.hydrationError,
        callstack: inst.callstack,
        trigger: inst.trigger,
        history: inst.history,
        dependencies: inst.dependencies,
      };
    });
  }

  // Check for BlaC DevTools API
  function checkForAPI() {
    checkAttempts++;

    if (typeof window.__BLAC_DEVTOOLS__ === 'undefined') {
      if (checkAttempts >= MAX_CHECK_ATTEMPTS) {
        // Give up silently - BlaC is not on this page
        // Notify panel that BlaC is not available
        sendMessage({
          type: 'BLAC_NOT_AVAILABLE',
          payload: { reason: 'BlaC plugin not installed on page' }
        });
        return;
      }

      setTimeout(checkForAPI, 500);
      return;
    }

    initializeMonitoring();
  }

  // Initialize monitoring
  function initializeMonitoring() {
    const api = window.__BLAC_DEVTOOLS__;

    if (!api || !api.isEnabled()) {
      return;
    }

    isInitialized = true;

    // Send initial state with full history (backend API)
    const fullState = api.getFullState?.() || { instances: api.getInstances(), timestamp: Date.now() };
    const transformedInstances = transformInstancesForPanel(fullState.instances);
    const eventHistory = api.getEventHistory?.() || [];
    const dependencyGraph = api.getDependencyGraph?.() || { nodes: [], edges: [] };
    sendMessage({
      type: 'INITIAL_STATE',
      payload: {
        instances: transformedInstances,
        eventHistory: eventHistory,
        version: api.getVersion(),
        timestamp: fullState.timestamp,
        dependencyGraph,
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

    // Process any queued commands
    queuedCommands.forEach(handleCommand);
    queuedCommands = [];
  }

  // Send message to content script
  function sendMessage(data: any) {
    window.postMessage(
      {
        source: 'blac-devtools-inject',
        ...data,
      },
      window.location.origin,
    );
  }

  // Handle commands from DevTools panel
  function handleCommand(command: any) {
    // If not initialized yet, queue the command
    if (!isInitialized) {
      queuedCommands.push(command);
      return;
    }

    const api = window.__BLAC_DEVTOOLS__;
    if (!api) {
      console.warn('[BlaC DevTools] Cannot handle command, API not available');
      return;
    }

    switch (command.type) {
      case 'GET_INSTANCES': {
        // Send full state dump with history (for late panel connections)
        const fullState = api.getFullState?.() || { instances: api.getInstances(), timestamp: Date.now() };
        const transformedInstances = transformInstancesForPanel(fullState.instances);
        const eventHistory = api.getEventHistory?.() || [];
        const dependencyGraph = api.getDependencyGraph?.() || { nodes: [], edges: [] };
        sendMessage({
          type: 'INITIAL_STATE',
          payload: {
            instances: transformedInstances,
            eventHistory: eventHistory,
            version: api.getVersion(),
            timestamp: fullState.timestamp,
            dependencyGraph,
          },
        });
        break;
      }

      case 'TIME_TRAVEL':
        api.timeTravel?.(command.instanceId, command.state);
        break;

      default:
        console.warn('[BlaC DevTools] Unknown command:', command.type);
    }
  }

  // Listen for commands from content script (set up immediately!)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'blac-devtools-content') return;

    handleCommand(event.data);
  });

  // Start checking for API
  checkForAPI();
})();

