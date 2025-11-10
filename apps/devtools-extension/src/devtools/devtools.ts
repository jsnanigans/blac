/**
 * DevTools Page Script - Creates the BlaC panel
 */

// Create the BlaC panel
chrome.devtools.panels.create(
  'BlaC',
  '', // Empty icon path (icons not needed)
  'dist/src/panel/index.html',
  (panel) => {
    // Handle panel shown/hidden events
    panel.onShown.addListener((window) => {
      // Notify panel that it's visible
      if (window && window.postMessage) {
        window.postMessage({ type: 'PANEL_SHOWN' }, '*');
      }
    });

    panel.onHidden.addListener(() => {
      // Panel hidden
    });
  }
);

// Export for TypeScript
export {};