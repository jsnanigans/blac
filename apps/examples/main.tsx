import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

// Install DevTools plugin (new plugin API)
// This exposes window.__BLAC_DEVTOOLS__ for the browser extension
console.log('[BlaC Examples] Installing DevTools plugin...');
if (import.meta.env.DEV) {
  console.log('[BlaC Examples] DEV mode detected, enabling DevTools plugin');
  const devToolsPlugin = createDevToolsBrowserPlugin({
    enabled: true,
  });

  getPluginManager().install(devToolsPlugin);
  console.log('[BlaC Examples] DevTools plugin installed');

  getPluginManager().install(new LoggingPlugin(), {
    environment: 'development',
  });
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
