/**
 * PictureInPictureDevTools - DevTools in a native browser PiP window
 *
 * Uses Document Picture-in-Picture API (Chrome 116+) for always-on-top DevTools.
 * Falls back to DraggableOverlay for unsupported browsers.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { DevToolsPanel } from './DevToolsPanel';
import { defaultDevToolsMount } from './DraggableOverlay';
import type { DraggableOverlayProps } from './DraggableOverlay';

// Type declaration for Document PiP API
interface DocumentPictureInPictureAPI {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  }
}

export interface PictureInPictureDevToolsProps {
  /**
   * Optional custom mount handler for the DevToolsPanel.
   * If not provided, will use defaultDevToolsMount.
   */
  onMount?: DraggableOverlayProps['onMount'];
}

/**
 * Check if Document Picture-in-Picture API is supported
 */
export function isPiPSupported(): boolean {
  return 'documentPictureInPicture' in window;
}

/**
 * Copy all stylesheets from main document to PiP window
 */
function copyStylesToPiP(pipWindow: Window) {
  // Copy all stylesheets
  const styleSheets = Array.from(document.styleSheets);

  for (const styleSheet of styleSheets) {
    try {
      // Try to access cssRules (may fail for CORS stylesheets)
      const cssRules = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');

      const style = pipWindow.document.createElement('style');
      style.textContent = cssRules;
      pipWindow.document.head.appendChild(style);
    } catch (e) {
      // If we can't access cssRules (CORS), create a link to the external stylesheet
      if (styleSheet.href) {
        const link = pipWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        pipWindow.document.head.appendChild(link);
      } else {
        console.warn('[BlaC PiP] Could not copy stylesheet:', e);
      }
    }
  }

  // Add PiP-specific styles
  const pipStyles = pipWindow.document.createElement('style');
  pipStyles.textContent = `
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1e1e1e;
      color: #ccc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  `;
  pipWindow.document.head.appendChild(pipStyles);
}

/**
 * PictureInPictureDevTools - Component that manages PiP DevTools window
 */
export function PictureInPictureDevTools({
  onMount,
}: PictureInPictureDevToolsProps = {}) {
  const [visible, setVisible] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipRoot, setPipRoot] = useState<ReactDOM.Root | null>(null);

  // Open PiP window
  const openPiP = async () => {
    if (!isPiPSupported()) {
      console.error('[BlaC PiP] Document PiP API not supported');
      return;
    }

    // Check if already open
    if (window.documentPictureInPicture!.window) {
      return;
    }

    try {
      const pip = await window.documentPictureInPicture!.requestWindow({
        width: 800,
        height: 600,
      });

      setPipWindow(pip);

      // Copy styles to PiP window
      copyStylesToPiP(pip);

      // Create container for React app
      const container = pip.document.createElement('div');
      container.id = 'blac-devtools-pip-root';
      container.style.cssText = `
        width: 100%;
        height: 100vh;
        overflow: auto;
        display: flex;
        flex-direction: column;
      `;
      pip.document.body.appendChild(container);

      // Render DevTools into PiP window
      const root = ReactDOM.createRoot(container);
      setPipRoot(root);
      root.render(<DevToolsPanel onMount={onMount ?? defaultDevToolsMount} />);

      // Handle PiP window closing
      pip.addEventListener('pagehide', () => {
        setVisible(false);
        closePiP();
      });

      setVisible(true);
    } catch (error) {
      console.error('[BlaC PiP] Failed to open PiP window:', error);
    }
  };

  // Close PiP window
  const closePiP = () => {
    if (pipRoot) {
      pipRoot.unmount();
      setPipRoot(null);
    }

    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }

    setPipWindow(null);
    setVisible(false);
  };

  // Toggle PiP window
  const togglePiP = () => {
    if (visible && pipWindow && !pipWindow.closed) {
      closePiP();
    } else {
      openPiP();
    }
  };

  // Keyboard shortcut: Alt+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        togglePiP();
      }
    };

    // Listen for custom toggle event
    const handleToggleEvent = () => {
      togglePiP();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blac-devtools-toggle', handleToggleEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blac-devtools-toggle', handleToggleEvent);
    };
  }, [visible, pipWindow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePiP();
    };
  }, []);

  // Render small toggle button when PiP is not visible
  if (!visible) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#252526',
          color: '#ccc',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 2147483646,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid #444',
          pointerEvents: 'auto',
        }}
        onClick={() => {
          openPiP();
        }}
        title="Open BlaC DevTools in Picture-in-Picture (Alt+D)"
      >
        🔧 BlaC DevTools
      </div>
    );
  }

  // When visible, render nothing (DevTools is in PiP window)
  return null;
}
