import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';
import { ReduxDevToolsAdapter } from '@blac/devtools-connect';

// Initialize Redux DevTools integration
const devtools = new ReduxDevToolsAdapter({
  enabled: import.meta.env.DEV,
  name: 'BlaC Examples',
  maxAge: 50,
  trace: false,
});

// Log connection status
if (devtools.isConnected()) {
  console.log('[BlaC Examples] Redux DevTools connected!');
} else {
  console.log('[BlaC Examples] Redux DevTools not available');
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
