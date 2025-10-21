import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BenchmarkDashboard } from './src/components/BenchmarkDashboard';
import { JSFrameworkBenchmark } from './src/benchmarks/JSFrameworkBenchmark';
import { AdapterExamples } from './src/examples/AdapterExamples';
import './bootstrap.css';
import './main.css';
import './src/examples/examples.css';
import { Blac } from '@blac/core';

type Page = 'home' | 'jsframework' | 'dashboard' | 'examples';

const HomePage: React.FC<{ onNavigate: (page: Page) => void }> = ({
  onNavigate,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '60px 40px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '48px', fontWeight: 'bold' }}>
            BlaC Performance Suite
          </h1>
          <p style={{ margin: '20px 0 0 0', fontSize: '20px', opacity: 0.9 }}>
            Browser-based performance testing for BlaC state management
          </p>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onNavigate('jsframework')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#667eea' }}>
              JS Framework Benchmark
            </h2>
            <p style={{ margin: 0, color: '#666', lineHeight: '1.6' }}>
              Classic framework benchmark based on js-framework-benchmark. Tests
              list operations like create, update, swap, and delete with 1,000
              and 10,000 rows.
            </p>
            <div
              style={{
                marginTop: '20px',
                color: '#667eea',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Launch Benchmark →
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onNavigate('examples')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#28a745' }}>
              useBlocAdapter Examples
            </h2>
            <p style={{ margin: 0, color: '#666', lineHeight: '1.6' }}>
              Interactive examples demonstrating various patterns and use cases:
            </p>
            <ul
              style={{
                marginTop: '15px',
                marginBottom: 0,
                color: '#666',
                lineHeight: '1.8',
              }}
            >
              <li>Basic usage with counters and todo lists</li>
              <li>Selectors for fine-grained subscriptions</li>
              <li>
                React 18 features (Suspense, useTransition, useDeferredValue)
              </li>
              <li>Lifecycle callbacks and custom comparisons</li>
              <li>10+ complete working examples</li>
            </ul>
            <div
              style={{
                marginTop: '20px',
                color: '#28a745',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              View Examples →
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onNavigate('dashboard')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#764ba2' }}>
              Comprehensive Benchmark Suite
            </h2>
            <p style={{ margin: 0, color: '#666', lineHeight: '1.6' }}>
              Complete performance testing dashboard with multiple benchmark
              categories:
            </p>
            <ul
              style={{
                marginTop: '15px',
                marginBottom: 0,
                color: '#666',
                lineHeight: '1.8',
              }}
            >
              <li>Memory leak detection with mount/unmount cycles</li>
              <li>Dependency tracking optimization tests</li>
              <li>Large state tree performance</li>
              <li>Concurrent updates and batching</li>
              <li>Full metrics and visualization</li>
            </ul>
            <div
              style={{
                marginTop: '20px',
                color: '#764ba2',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Open Dashboard →
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>
            Tips for Best Results
          </h3>
          <ul style={{ margin: 0, color: '#666', lineHeight: '1.8' }}>
            <li>
              Run benchmarks in Chrome or Edge for full memory profiling support
            </li>
            <li>Open DevTools Performance tab before running benchmarks</li>
            <li>Close other tabs and applications for more accurate results</li>
            <li>
              Enable Chrome's memory profiler with{' '}
              <code style={{ background: '#f5f5f5', padding: '2px 6px' }}>
                --enable-precise-memory-info
              </code>
            </li>
            <li>
              For advanced profiling, start Chrome with{' '}
              <code style={{ background: '#f5f5f5', padding: '2px 6px' }}>
                --expose-gc
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'jsframework':
        return (
          <div>
            <div
              style={{
                background: '#667eea',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <button
                onClick={() => setCurrentPage('home')}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>
                JS Framework Benchmark
              </div>
            </div>
            <JSFrameworkBenchmark />
          </div>
        );
      case 'examples':
        return (
          <div>
            <div
              style={{
                background: '#28a745',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <button
                onClick={() => setCurrentPage('home')}
                style={{
                  background: 'white',
                  color: '#28a745',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>
                useBlocAdapter Examples
              </div>
            </div>
            <AdapterExamples />
          </div>
        );
      case 'dashboard':
        return (
          <div>
            <div
              style={{
                background: '#764ba2',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <button
                onClick={() => setCurrentPage('home')}
                style={{
                  background: 'white',
                  color: '#764ba2',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ← Back
              </button>
            </div>
            <BenchmarkDashboard />
          </div>
        );
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return <>{renderPage()}</>;
};

const container = document.getElementById('main');

if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("Failed to find the root element with ID 'main'");
}
