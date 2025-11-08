import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsLayoutBloc,
} from '../blocs';
import { SearchBar } from './SearchBar';
import { InstanceListItem } from './InstanceListItem';

/**
 * Left panel containing search and instance list
 */
export const InstanceList: FC = React.memo(() => {
  const [{ instances, animationTriggers }] = useBloc(DevToolsInstancesBloc);
  const [, searchBloc] = useBloc(DevToolsSearchBloc);
  const [{ selectedId }, layoutBloc] = useBloc(DevToolsLayoutBloc);

  const groupedInstances = searchBloc.getGroupedInstances();

  return (
    <div
      style={{
        width: '300px',
        borderRight: '1px solid #444',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e1e',
      }}
    >
      {/* Sweep line animation CSS */}
      <style>{`
        @keyframes sweepLine {
          0% {
            left: -2px;
            opacity: 0.8;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        .sweep-line {
          position: absolute;
          top: 0;
          left: -2px;
          width: 2px;
          height: 100%;
          animation: sweepLine 300ms linear;
          pointer-events: none;
          z-index: 10;
        }
      `}</style>

      {/* Search Input */}
      <SearchBar />

      {/* Instance List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {instances.length === 0 ? (
          <div
            style={{
              padding: '20px',
              color: '#888',
              textAlign: 'center',
            }}
          >
            No instances detected
          </div>
        ) : groupedInstances.length === 0 ? (
          <div
            style={{
              padding: '20px',
              color: '#888',
              textAlign: 'center',
            }}
          >
            No matches found
          </div>
        ) : (
          groupedInstances.map((group) =>
            group.instances.map((instance) => (
              <InstanceListItem
                key={instance.id}
                instance={instance}
                isSelected={selectedId === instance.id}
                animationTriggers={animationTriggers.get(instance.id) || []}
                onSelect={() => layoutBloc.setSelectedId(instance.id)}
              />
            )),
          )
        )}
      </div>
    </div>
  );
});

InstanceList.displayName = 'InstanceList';
