import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import './src/styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
