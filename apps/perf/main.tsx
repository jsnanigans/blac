import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';

const container = document.getElementById('main');

if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("Failed to find the root element with ID 'main'");
}
