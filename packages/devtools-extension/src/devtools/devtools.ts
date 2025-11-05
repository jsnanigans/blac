/**
 * DevTools Page Script - Creates the BlaC panel
 */

console.log('[BlaC DevTools] DevTools page loaded');

// Create the BlaC panel
chrome.devtools.panels.create(
  'BlaC',
  'icons/icon-16.png',
  'dist/panel/index.html',
  (panel) => {
    console.log('[BlaC DevTools] Panel created');

    // Handle panel shown/hidden events
    panel.onShown.addListener((window) => {
      console.log('[BlaC DevTools] Panel shown');

      // Notify panel that it's visible
      if (window && window.postMessage) {
        window.postMessage({ type: 'PANEL_SHOWN' }, '*');
      }
    });

    panel.onHidden.addListener(() => {
      console.log('[BlaC DevTools] Panel hidden');
    });
  }
);

// Export for TypeScript
export {};