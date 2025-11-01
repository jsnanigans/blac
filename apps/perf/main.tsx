import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSFrameworkBenchmark } from './src/benchmarks/JSFrameworkBenchmark';
import './main.css';

const container = document.getElementById('main');

if (container) {
  const root = createRoot(container);
  root.render(<JSFrameworkBenchmark />);
} else {
  console.error("Failed to find the root element with ID 'main'");
}
