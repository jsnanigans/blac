import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Blac } from '@blac/core';
import { RenderLoggingPlugin } from '@blac/plugin-render-logging';
import { DevToolsPlugin, ReduxDevToolsAdapter } from '@blac/devtools-connect';
import App from './App';
import './index.css';
import './demos'; // Register all demos

// Initialize BlaC plugins

// Redux DevTools integration (recommended - works immediately!)
Blac.instance.plugins.add(
  new ReduxDevToolsAdapter({
    enabled: true,
    name: 'BlaC Playground',
    maxAge: 100,
    trace: true,
  }),
);

// Custom BlaC DevTools (requires Chrome extension)
// Blac.instance.plugins.add(
//   new DevToolsPlugin({
//     enabled: true,
//     maxEvents: 500,
//   }),
// );

Blac.instance.plugins.add(
  new RenderLoggingPlugin({
    enabled: true,
    level: 'normal',
    groupRerenders: true,
  }),
);

// Make BlaC available globally for debugging
declare global {
  interface Window {
    Blac: typeof Blac;
  }
}
window.Blac = Blac;

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
