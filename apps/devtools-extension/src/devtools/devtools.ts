/**
 * DevTools Page Script - Creates the BlaC panel
 */

// Create the BlaC panel
chrome.devtools.panels.create(
  'BlaC',
  '', // Empty icon path (icons not needed)
  'dist/src/panel/index.html',
);

// Export for TypeScript
export {};
