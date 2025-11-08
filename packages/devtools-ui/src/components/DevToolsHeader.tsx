import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsInstancesBloc } from '../blocs';

/**
 * DevTools header with connection status and instance count
 */
export const DevToolsHeader: FC = React.memo(() => {
  const [{ connected, instances }] = useBloc(DevToolsInstancesBloc);

  return (
    <div
      style={{
        padding: '10px',
        borderBottom: '1px solid #444',
        background: '#252526',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <h1 style={{ fontSize: '16px', fontWeight: 600 }}>BlaC DevTools</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? '#4CAF50' : '#f44336',
          }}
        />
        <span style={{ fontSize: '12px' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span style={{ fontSize: '12px', color: '#888' }}>
          {instances.length} instances
        </span>
      </div>
    </div>
  );
});

DevToolsHeader.displayName = 'DevToolsHeader';
