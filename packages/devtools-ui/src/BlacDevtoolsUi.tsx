/**
 * BlacDevtoolsUi - Auto-initializing DevTools overlay component
 *
 * Just add this component anywhere in your React app:
 * ```tsx
 * import { BlacDevtoolsUi } from '@blac/devtools-ui';
 *
 * function App() {
 *   return (
 *     <>
 *       <BlacDevtoolsUi />
 *       <YourApp />
 *     </>
 *   );
 * }
 * ```
 *
 * Toggle with Alt+D
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { DraggableOverlay, defaultDevToolsMount } from './DraggableOverlay';
import type { DraggableOverlayProps } from './DraggableOverlay';

export interface BlacDevtoolsUiProps {
  /**
   * Optional custom mount handler for the DevToolsPanel.
   * If not provided, will use defaultDevToolsMount which connects to window.__BLAC_DEVTOOLS__.
   */
  onMount?: DraggableOverlayProps['onMount'];
}

let overlayRoot: ReactDOM.Root | null = null;
let overlayContainer: HTMLElement | null = null;

/**
 * Initialize the DevTools overlay.
 * Creates a container div and renders the DraggableOverlay component.
 */
function initOverlay(onMount?: DraggableOverlayProps['onMount']) {
  // Check if already initialized
  if (overlayContainer) {
    return;
  }

  // Create a container for the overlay
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'blac-devtools-overlay-root';
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;
  document.body.appendChild(overlayContainer);

  // Mount the overlay
  overlayRoot = ReactDOM.createRoot(overlayContainer);
  overlayRoot.render(
    <DraggableOverlay onMount={onMount ?? defaultDevToolsMount} />,
  );
}

/**
 * Cleanup the DevTools overlay.
 */
function cleanupOverlay() {
  if (overlayRoot) {
    overlayRoot.unmount();
    overlayRoot = null;
  }

  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
}

/**
 * BlacDevtoolsUi - Component that auto-initializes the DevTools UI.
 *
 * This component creates a floating DevTools overlay that can be toggled with Alt+D.
 *
 * @example
 * ```tsx
 * import { BlacDevtoolsUi } from '@blac/devtools-ui';
 *
 * function App() {
 *   return (
 *     <>
 *       <BlacDevtoolsUi />
 *       <Counter />
 *     </>
 *   );
 * }
 * ```
 */
export function BlacDevtoolsUi({ onMount }: BlacDevtoolsUiProps = {}) {
  useEffect(() => {
    const init = () => {
      if (document.body) {
        initOverlay(onMount);
      } else {
        setTimeout(init, 10);
      }
    };
    init();

    // Cleanup overlay on unmount
    return () => {
      cleanupOverlay();
    };
  }, [onMount]);

  // Overlay is rendered via portal, return null here
  return null;
}
