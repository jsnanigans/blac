import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';
import { getPluginManager } from '@blac/core';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

// Install DevTools plugin (new plugin API)
// This exposes window.__BLAC_DEVTOOLS__ for the browser extension
if (import.meta.env.DEV) {
  const devToolsPlugin = createDevToolsBrowserPlugin({
    enabled: true,
  });

  getPluginManager().install(devToolsPlugin);
  console.log('[BlaC Examples] DevTools plugin installed');
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
