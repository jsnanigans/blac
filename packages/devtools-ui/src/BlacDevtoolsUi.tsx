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
 *
 * Uses Document Picture-in-Picture API when available (Chrome 116+),
 * falls back to draggable overlay for unsupported browsers.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { DraggableOverlay, defaultDevToolsMount } from './DraggableOverlay';
import {
  PictureInPictureDevTools,
  isPiPSupported,
} from './PictureInPictureDevTools';
import type { DraggableOverlayProps } from './DraggableOverlay';

export interface BlacDevtoolsUiProps {
  /**
   * Optional custom mount handler for the DevToolsPanel.
   * If not provided, will use defaultDevToolsMount which connects to window.__BLAC_DEVTOOLS__.
   */
  onMount?: DraggableOverlayProps['onMount'];

  /**
   * Force a specific mode instead of auto-detecting.
   * - 'pip': Use Picture-in-Picture API (throws if not supported)
   * - 'overlay': Use draggable overlay
   * - 'auto': Auto-detect (default) - use PiP if available, fallback to overlay
   */
  mode?: 'pip' | 'overlay' | 'auto';
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
    console.log('[BlaC DevTools] Already initialized');
    return;
  }

  console.log('[BlaC DevTools] Initializing overlay...');

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
  overlayRoot.render(<DraggableOverlay onMount={onMount ?? defaultDevToolsMount} />);

  console.log('[BlaC DevTools] Ready! Press Alt+D to toggle');
}

/**
 * Cleanup the DevTools overlay.
 */
function cleanupOverlay() {
  if (overlayRoot) {
    console.log('[BlaC DevTools] Cleaning up overlay...');
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
 * Automatically uses Picture-in-Picture API (Chrome 116+) when available,
 * falls back to draggable overlay for unsupported browsers.
 *
 * This component creates a floating DevTools window that can be toggled with Alt+D.
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
 *
 * @example Force overlay mode (skip PiP even if supported)
 * ```tsx
 * <BlacDevtoolsUi mode="overlay" />
 * ```
 */
export function BlacDevtoolsUi({
  onMount,
  mode = 'auto',
}: BlacDevtoolsUiProps = {}) {
  const [usePiP, setUsePiP] = useState<boolean | null>(null);

  useEffect(() => {
    // Determine which mode to use
    let shouldUsePiP = false;

    if (mode === 'pip') {
      if (!isPiPSupported()) {
        console.error(
          '[BlaC DevTools] PiP mode forced but Document Picture-in-Picture API is not supported'
        );
        throw new Error(
          'Document Picture-in-Picture API is not supported in this browser'
        );
      }
      shouldUsePiP = true;
      console.log('[BlaC DevTools] Using Picture-in-Picture mode (forced)');
    } else if (mode === 'overlay') {
      shouldUsePiP = false;
      console.log('[BlaC DevTools] Using overlay mode (forced)');
    } else {
      // Auto mode - detect support
      shouldUsePiP = isPiPSupported();
      console.log(
        `[BlaC DevTools] Auto-detected mode: ${shouldUsePiP ? 'Picture-in-Picture' : 'overlay'}`
      );
    }

    setUsePiP(shouldUsePiP);

    // If using legacy overlay mode, initialize it
    if (!shouldUsePiP) {
      const init = () => {
        if (document.body) {
          initOverlay(onMount);
        } else {
          setTimeout(init, 10);
        }
      };
      init();
    }

    // Cleanup overlay on unmount (PiP component handles its own cleanup)
    return () => {
      if (!shouldUsePiP) {
        cleanupOverlay();
      }
    };
  }, [onMount, mode]);

  // Still loading - render nothing
  if (usePiP === null) {
    return null;
  }

  // Render PiP component or nothing (overlay is rendered via portal)
  if (usePiP) {
    return <PictureInPictureDevTools onMount={onMount} />;
  }

  // Overlay mode - component renders via portal, return null here
  return null;
}
