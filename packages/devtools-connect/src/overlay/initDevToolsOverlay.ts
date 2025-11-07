/**
 * Initialize in-app DevTools overlay
 *
 * Call this function after installing the DevTools plugin to show
 * a floating overlay window in your app (no Chrome extension needed).
 *
 * @example
 * ```ts
 * import { createDevToolsBrowserPlugin, initDevToolsOverlay } from '@blac/devtools-connect';
 *
 * getPluginManager().install(createDevToolsBrowserPlugin());
 *
 * if (import.meta.env.DEV) {
 *   initDevToolsOverlay();
 * }
 * ```
 */
export function initDevToolsOverlay(): void {
  if (typeof window === 'undefined') {
    console.warn('[BlaC DevTools Overlay] Window is not defined, skipping initialization');
    return;
  }

  if (typeof document === 'undefined') {
    console.warn('[BlaC DevTools Overlay] Document is not defined, skipping initialization');
    return;
  }

  // Check if API is available
  if (typeof (window as any).__BLAC_DEVTOOLS__ === 'undefined') {
    console.error(
      '[BlaC DevTools Overlay] window.__BLAC_DEVTOOLS__ is not defined. ' +
      'Make sure you install DevToolsBrowserPlugin first:\n\n' +
      'import { getPluginManager } from \'@blac/core\';\n' +
      'import { createDevToolsBrowserPlugin } from \'@blac/devtools-connect\';\n\n' +
      'getPluginManager().install(createDevToolsBrowserPlugin());'
    );
    return;
  }

  console.log('[BlaC DevTools Overlay] Initializing overlay...');

  // Check if already initialized
  if (document.getElementById('blac-devtools-overlay-root')) {
    console.warn('[BlaC DevTools Overlay] Already initialized');
    return;
  }

  // Wait for DOM to be ready
  const init = async () => {
    try {
      // Dynamically import the overlay component
      const { renderOverlay } = await import('./overlay');
      renderOverlay();
      console.log('[BlaC DevTools Overlay] Ready! Press Alt+D to toggle');
    } catch (error) {
      console.error('[BlaC DevTools Overlay] Failed to initialize:', error);
    }
  };

  // Initialize when DOM is ready
  if (document.body) {
    init();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      // DOM is ready but body doesn't exist yet? Wait a bit
      setTimeout(init, 100);
    }
  }
}
