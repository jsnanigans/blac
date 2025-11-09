import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsLayoutBloc, type TabName } from '../blocs/DevToolsLayoutBloc';

const TABS: TabName[] = ['Instances', 'Logs'];

/**
 * Tab bar for switching between DevTools views
 */
export const TabBar: FC = React.memo(() => {
  const [{ activeTab }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #444',
        background: '#252526',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => layoutBloc.setActiveTab(tab)}
          style={{
            padding: '10px 20px',
            background: activeTab === tab ? '#1e1e1e' : 'transparent',
            color: activeTab === tab ? '#fff' : '#888',
            border: 'none',
            borderBottom:
              activeTab === tab ? '2px solid #007acc' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
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
  );
});

TabBar.displayName = 'TabBar';
