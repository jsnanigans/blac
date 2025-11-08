/**
 * In-App Overlay - Floating DevTools window injected into the page
 * Toggle with Alt+D
 *
 * This file could be simplified to use DraggableOverlay from @blac/devtools-ui,
 * but we keep it separate for extension-specific customization.
 */

import ReactDOM from 'react-dom/client';
import { DraggableOverlay, defaultDevToolsMount } from '@blac/devtools-ui';

// Check if we're in the main world with access to __BLAC_DEVTOOLS__
if (typeof window !== 'undefined') {
  console.log('[BlaC Overlay] Initializing...');

  // Wait for DOM to be ready
  const initOverlay = () => {
    // Check if already initialized
    if (document.getElementById('blac-devtools-overlay-root')) {
      console.log('[BlaC Overlay] Already initialized');
      return;
    }

    // Create a container for the overlay
    const container = document.createElement('div');
    container.id = 'blac-devtools-overlay-root';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    // Mount the overlay using the DraggableOverlay component from @blac/devtools-ui
    const root = ReactDOM.createRoot(container);
    root.render(<DraggableOverlay onMount={defaultDevToolsMount} />);

    console.log('[BlaC Overlay] Ready! Press Alt+D to toggle');
  };

  // Initialize when DOM is ready
  if (document.body) {
    initOverlay();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
      // DOM is already ready but body doesn't exist yet? Wait a bit
      setTimeout(initOverlay, 100);
    }
  }
}
