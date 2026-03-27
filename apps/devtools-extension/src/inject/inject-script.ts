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
      const i = inst as Record<string, any>;
      // If already in panel format (legacy getInstances), pass through
      if ('state' in i && !('currentState' in i)) {
        return inst;
      }

      // Transform new format to panel format
      const history = (i.history as any[] | undefined) || [];
      // Get the most recent change (last element in history array)
      const lastChange =
        history.length > 0
          ? (history[history.length - 1] as Record<string, any> | null)
          : null;

      return {
        id: i.id,
        className: i.className,
        name: i.name,
        isDisposed: i.isDisposed || false,
        isIsolated: i.isIsolated || false,
        state: i.currentState !== undefined ? i.currentState : i.state,
        lastStateChangeTimestamp:
          (lastChange?.timestamp as number) ||
          (i.createdAt as number) ||
          Date.now(),
        createdAt: (i.createdAt as number) || Date.now(),
        hydrationStatus: i.hydrationStatus,
        hydrationError: i.hydrationError,
        callstack: i.callstack,
        trigger: i.trigger,
        history: i.history,
        dependencies: i.dependencies,
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
          payload: { reason: 'BlaC plugin not installed on page' },
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
    const fullState = api.getFullState?.() || {
      instances: api.getInstances(),
      timestamp: Date.now(),
    };
    const transformedInstances = transformInstancesForPanel(
      fullState.instances,
    );
    const eventHistory = api.getEventHistory?.() || [];
    const dependencyGraph = api.getDependencyGraph?.() || {
      nodes: [],
      edges: [],
    };
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
  function sendMessage(data: Record<string, any>) {
    window.postMessage(
      {
        source: 'blac-devtools-inject',
        ...data,
      },
      window.location.origin,
    );
  }

  // Handle commands from DevTools panel
  function handleCommand(command: Record<string, any>) {
    // PING always responds immediately regardless of init state
    if (command.type === 'PING') {
      const api = window.__BLAC_DEVTOOLS__;
      sendMessage({
        type: api?.isEnabled() ? 'PONG' : 'BLAC_NOT_AVAILABLE',
        payload: api?.isEnabled()
          ? { timestamp: Date.now() }
          : { reason: 'BlaC API not available' },
      });
      return;
    }

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
        const fullState = api.getFullState?.() || {
          instances: api.getInstances(),
          timestamp: Date.now(),
        };
        const transformedInstances = transformInstancesForPanel(
          fullState.instances,
        );
        const eventHistory = api.getEventHistory?.() || [];
        const dependencyGraph = api.getDependencyGraph?.() || {
          nodes: [],
          edges: [],
        };
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
