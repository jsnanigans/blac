import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';
import { getPluginManager } from '@blac/core/plugins';
import { LoggingPlugin } from '@blac/logging-plugin';
import { createDevToolsAgent } from '@blac/devtools-connect';
import { BlacDevtoolsUi } from '@blac/devtools-ui';

getPluginManager().install(
  new LoggingPlugin({
    level: 'verbose',
  }),
);

getPluginManager().install(createDevToolsAgent());

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
    <BlacDevtoolsUi />
  </StrictMode>,
);
