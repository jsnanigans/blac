import React from 'react';
import { Dashboard } from './ui/Dashboard';
import './ui/dashboard.css';
import { DebugPage } from './DebugPage';
import { DemoPage } from './DemoPage';

export const App: React.FC = () => {
  // `/debug` serves the instrumentation/tracing tools page and `/demo` serves
  // the interactive manual benchmark demo, both kept entirely separate from
  // the benchmark Dashboard so they never affect perf results. Everything
  // else renders the normal Dashboard.
  const path =
    typeof location !== 'undefined'
      ? location.pathname.replace(/\/+$/, '')
      : '';
  if (path.endsWith('/debug')) {
    return <DebugPage />;
  }
  if (path.endsWith('/demo')) {
    return <DemoPage />;
  }
  return <Dashboard />;
};
