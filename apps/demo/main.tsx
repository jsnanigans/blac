import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Blac (optional, if you need to configure global Blac settings)
// import { Blac } from '@blac/core';
// Blac.instance.config({ logLevel: 'DEBUG' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
