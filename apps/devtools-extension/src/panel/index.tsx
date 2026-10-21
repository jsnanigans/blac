import { createRoot } from 'react-dom/client';
import { DevToolsClient } from '@blac/devtools-connect/client';
import { Panel } from '@blac/devtools-ui';
import { createPanelTransport } from './transport';

const tabId = chrome.devtools.inspectedWindow.tabId;
const theme = chrome.devtools.panels.themeName === 'dark' ? 'dark' : 'light';
const client = new DevToolsClient(createPanelTransport(`blac-panel:${tabId}`));

createRoot(document.getElementById('root')!).render(
  <Panel client={client} theme={theme} />,
);
