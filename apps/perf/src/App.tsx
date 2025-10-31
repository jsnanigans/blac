import React, { useState } from 'react';
import { JSFrameworkBenchmark } from './benchmarks/JSFrameworkBenchmark';
import { HybridModeBenchmark } from './benchmarks/HybridModeBenchmark';

type BenchmarkType = 'jsframework' | 'hybridmode';

export const App = () => {
  const [activeBenchmark, setActiveBenchmark] =
    useState<BenchmarkType>('hybridmode');

  return (
    <div>
      <nav
        style={{
          padding: '15px 20px',
          background: '#333',
          color: 'white',
          marginBottom: '0',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>
          BlaC Performance Benchmarks
        </h2>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setActiveBenchmark('hybridmode')}
          style={{
            padding: '8px 16px',
            background: activeBenchmark === 'hybridmode' ? '#4caf50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Hybrid Mode
        </button>
        <button
          onClick={() => setActiveBenchmark('jsframework')}
          style={{
            padding: '8px 16px',
            background: activeBenchmark === 'jsframework' ? '#4caf50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          JS Framework
        </button>
      </nav>

      <div>
        {activeBenchmark === 'hybridmode' && <HybridModeBenchmark />}
        {activeBenchmark === 'jsframework' && <JSFrameworkBenchmark />}
      </div>
    </div>
  );
};
