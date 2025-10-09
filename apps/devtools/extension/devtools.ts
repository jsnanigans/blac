export {};

chrome.devtools.panels.create('BlaC', '', 'extension/panel.html', () => {
  console.log('[BlaC DevTools] Panel created');
});
