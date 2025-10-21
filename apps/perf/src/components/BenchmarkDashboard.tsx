import React, { useState } from 'react';
import { JSFrameworkBenchmark } from '../benchmarks/JSFrameworkBenchmark';
import { MemoryLeakBenchmark } from '../benchmarks/MemoryLeakBenchmark';
import { ConcurrentUpdatesBenchmark } from '../benchmarks/ConcurrentUpdatesBenchmark';

type BenchmarkTab =
  | 'jsframework'
  | 'memory'
  | 'dependency'
  | 'largestate'
  | 'concurrent';

interface TabInfo {
  id: BenchmarkTab;
  label: string;
  description: string;
  component: React.FC;
}

const tabs: TabInfo[] = [
  {
    id: 'jsframework',
    label: 'JS Framework Benchmark',
    description: 'Standard framework benchmark with list operations',
    component: JSFrameworkBenchmark,
  },
  {
    id: 'memory',
    label: 'Memory Leaks',
    description: 'Mount/unmount cycles to detect memory leaks',
    component: MemoryLeakBenchmark,
  },
  // {
  //   id: 'dependency',
  //   label: 'Dependency Tracking',
  //   description: 'Proxy-based dependency tracking optimization',
  //   component: DependencyTrackingBenchmark,
  // },
  // {
  //   id: 'largestate',
  //   label: 'Large State',
  //   description: 'Deeply nested state tree performance',
  //   component: LargeStateBenchmark,
  // },
  {
    id: 'concurrent',
    label: 'Concurrent Updates',
    description: 'Multiple simultaneous state updates',
    component: ConcurrentUpdatesBenchmark,
  },
];

export const BenchmarkDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BenchmarkTab>('jsframework');

  const activeTabInfo = tabs.find((t) => t.id === activeTab);
  const ActiveComponent = activeTabInfo?.component || (() => <div>Not found</div>);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
            BlaC Performance Benchmarks
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
            Comprehensive browser-based performance testing for BlaC state management
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            gap: '0',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: activeTab === tab.id ? '#667eea' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                borderBottom:
                  activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Description */}
      {activeTabInfo && (
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '20px',
            background: 'white',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666' }}>
            {activeTabInfo.description}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'white',
          minHeight: 'calc(100vh - 250px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <ActiveComponent />
      </div>

      {/* Footer */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '20px auto',
          padding: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <div>BlaC Performance Testing Suite</div>
        <div style={{ marginTop: '5px', fontSize: '12px' }}>
          Use Chrome DevTools Performance tab for detailed profiling
        </div>
      </div>
    </div>
  );
};
