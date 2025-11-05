/**
 * Popup Script - Simple status indicator
 */

document.getElementById('openDevTools')?.addEventListener('click', () => {
  // Send message to open DevTools
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      // This doesn't directly open DevTools, but we can show instructions
      alert('Press F12 or Cmd+Option+I to open Developer Tools, then navigate to the "BlaC" tab.');
    }
  });
});

// Export for TypeScript
export {};