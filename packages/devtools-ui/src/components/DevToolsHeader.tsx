import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsInstancesBloc } from '../blocs';
import { DevToolsLayoutBloc, type TabName } from '../blocs/DevToolsLayoutBloc';
import { T } from '../theme';

const TABS: TabName[] = ['Instances', 'Logs', 'Graph', 'Performance'];

export const DevToolsHeader: FC = React.memo(() => {
  const [{ connected, instances }] = useBloc(DevToolsInstancesBloc);
  const [{ activeTab }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  return (
    <div
      style={{
        height: '38px',
        padding: '0 10px',
        borderBottom: `1px solid ${T.border1}`,
        background: T.bg3,
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: T.textAccent,
          letterSpacing: '-0.2px',
          marginRight: '12px',
          flexShrink: 0,
        }}
      >
        BlaC
        <span style={{ color: T.text2, fontWeight: 400 }}> DevTools</span>
      </span>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '14px',
          background: T.border1,
          marginRight: '8px',
          flexShrink: 0,
        }}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => layoutBloc.setActiveTab(tab)}
              style={{
                padding: '4px 10px',
                background: isActive ? T.bgAccent : 'transparent',
                color: isActive ? T.text0 : T.text1,
                border: 'none',
                borderRadius: T.radius,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isActive ? 500 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = T.bgHover;
                  e.currentTarget.style.color = T.text0;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = T.text1;
                }
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Status — right side */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginLeft: 'auto',
          fontSize: '11px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: connected ? T.success : T.error,
            flexShrink: 0,
          }}
        />
        <span style={{ color: T.text1 }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span
          style={{
            color: T.text2,
            borderLeft: `1px solid ${T.border1}`,
            paddingLeft: '6px',
          }}
        >
          {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
        </span>
      </div>
    </div>
  );
});

DevToolsHeader.displayName = 'DevToolsHeader';
