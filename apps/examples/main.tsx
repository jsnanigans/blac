import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';
import { getPluginManager } from '@blac/core';
import { LoggingPlugin } from '@blac/logging-plugin';
import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';

getPluginManager().install(
  new LoggingPlugin({
    level: 'verbose',
  }),
);

getPluginManager().install(
  createDevToolsBrowserPlugin({
    enabled: true,
  }),
);

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
