import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsInstancesBloc } from '../blocs';
import { DevToolsLayoutBloc, type TabName } from '../blocs/DevToolsLayoutBloc';
import { T } from '../theme';

const TABS: TabName[] = ['Instances', 'Logs', 'Graph', 'Performance'];

const pulseKeyframes = `
@keyframes blac-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
`;

let styleInjected = false;
function injectPulseStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}

export const DevToolsHeader: FC = React.memo(() => {
  const [{ connected, instances }] = useBloc(DevToolsInstancesBloc);
  const [{ activeTab }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  injectPulseStyle();

  const statusColor = connected ? T.success : T.warning;
  const statusText = connected ? 'Connected' : 'Waiting for page\u2026';

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
            background: statusColor,
            flexShrink: 0,
            animation: connected
              ? 'none'
              : 'blac-pulse 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ color: connected ? T.text1 : T.warning }}>
          {statusText}
        </span>
        {connected && (
          <span
            style={{
              color: T.text2,
              borderLeft: `1px solid ${T.border1}`,
              paddingLeft: '6px',
            }}
          >
            {instances.length}{' '}
            {instances.length === 1 ? 'instance' : 'instances'}
          </span>
        )}
      </div>
    </div>
  );
});

DevToolsHeader.displayName = 'DevToolsHeader';
