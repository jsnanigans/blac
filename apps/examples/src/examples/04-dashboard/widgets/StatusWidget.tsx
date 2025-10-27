import { useBloc } from '@blac/react';
import { DashboardBloc } from '../DashboardBloc';
import { useRef } from 'react';

/**
 * Widget that ONLY accesses lastUpdated and isAutoUpdating.
 * Will NOT re-render when ANY metric changes, only when update status changes!
 */
export function StatusWidget() {
  const [state] = useBloc(DashboardBloc);
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`  ↳ [StatusWidget] Rendered (${renderCount.current} times)`);

  const timeAgo = Math.floor((Date.now() - state.lastUpdated) / 1000);

  return (
    <div
      className="card"
      style={{
        background: state.isAutoUpdating ? 'var(--gray-50)' : 'white',
        border: state.isAutoUpdating ? '2px solid var(--secondary)' : '1px solid var(--gray-200)',
        position: 'relative',
      }}
    >
      {/* Render counter */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: 'var(--secondary)',
          color: 'white',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          boxShadow: 'var(--shadow)',
        }}
        title={`Rendered ${renderCount.current} times`}
      >
        {renderCount.current}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            fontSize: '2rem',
            animation: state.isAutoUpdating ? 'pulse 2s infinite' : 'none',
          }}
        >
          {state.isAutoUpdating ? '🔄' : '⏸️'}
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-small text-muted">Status</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {state.isAutoUpdating ? 'Auto-Updating' : 'Paused'}
          </div>
          <div className="text-small text-muted">
            Last update: {timeAgo}s ago
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}
