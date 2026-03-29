import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import {
  DevToolsInstancesBloc,
  DevToolsSearchBloc,
  DevToolsLayoutBloc,
} from '../blocs';
import { SearchBar } from './SearchBar';
import { InstanceListItem } from './InstanceListItem';
import { T } from '../theme';

export const InstanceList: FC<{ width?: number }> = React.memo(
  ({ width = 300 }) => {
    const [{ instances, animationTriggers }] = useBloc(DevToolsInstancesBloc);
    const [, searchBloc] = useBloc(DevToolsSearchBloc, { autoTrack: false });
    const [{ selectedId }, layoutBloc] = useBloc(DevToolsLayoutBloc);

    const groupedInstances = searchBloc.getGroupedInstances();
    const hasMultipleGroups = groupedInstances.length > 1;

    return (
      <div
        style={{
          width: `${width}px`,
          borderRight: `1px solid ${T.border1}`,
          display: 'flex',
          flexDirection: 'column',
          background: T.bg2,
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
            groupedInstances.map((group) => (
              <div key={group.className}>
                {hasMultipleGroups && (
                  <div
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      color: T.text1,
                      background: T.bg3,
                      borderBottom: `1px solid ${T.border0}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      letterSpacing: '0.3px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 5,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: group.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>{group.className}</span>
                    <span style={{ color: T.text2 }}>
                      ({group.instances.length})
                    </span>
                  </div>
                )}
                {group.instances.map((instance) => (
                  <InstanceListItem
                    key={instance.id}
                    instance={instance}
                    isSelected={selectedId === instance.id}
                    animationTriggers={animationTriggers.get(instance.id) || []}
                    onSelect={() => layoutBloc.setSelectedId(instance.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
);

InstanceList.displayName = 'InstanceList';
