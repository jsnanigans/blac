import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsInstancesBloc } from '../blocs';
import { DevToolsLayoutBloc, type TabName } from '../blocs/DevToolsLayoutBloc';

const TABS: TabName[] = ['Instances', 'Logs'];

/**
 * Compact DevTools header with tabs, connection status, and instance count merged into one row
 */
export const DevToolsHeader: FC = React.memo(() => {
  const [{ connected, instances }] = useBloc(DevToolsInstancesBloc);
  const [{ activeTab }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  return (
    <div
      style={{
        padding: '8px 10px',
        borderBottom: '1px solid #444',
        background: '#252526',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {/* Title */}
      <h1 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>BlaC DevTools</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => layoutBloc.setActiveTab(tab)}
            style={{
              padding: '4px 12px',
              background: activeTab === tab ? '#1e1e1e' : 'transparent',
              color: activeTab === tab ? '#fff' : '#888',
              border: 'none',
              borderBottom:
                activeTab === tab ? '2px solid #007acc' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = '#2a2a2a';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Connection status and instance count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: connected ? '#4CAF50' : '#f44336',
          }}
        />
        <span style={{ fontSize: '11px' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span style={{ fontSize: '11px', color: '#888' }}>
          {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
        </span>
      </div>
    </div>
  );
});

DevToolsHeader.displayName = 'DevToolsHeader';
