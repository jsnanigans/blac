import React from 'react';
import { ProxyTimingProbe } from './ProxyTimingProbe';

/**
 * Debug tools page, served at `/debug`. Kept separate from the benchmark
 * Dashboard so instrumentation/tracing never affects perf results. Add future
 * debug utilities here rather than in the Dashboard.
 */
export const DebugPage: React.FC = () => {
  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <h1>Perf Debug</h1>
      <p style={{ maxWidth: 720 }}>
        Instrumentation &amp; tracing utilities. Not part of the benchmark
        suite.
      </p>
      <ProxyTimingProbe />
    </div>
  );
};
