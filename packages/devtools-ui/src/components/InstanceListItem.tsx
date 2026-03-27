import React, { FC } from 'react';
import type { InstanceData } from '../types';
import InstanceId from './InstanceId';
import { stringToColor } from '../utils/stringToColor';
import { T } from '../theme';

interface InstanceListItemProps {
  instance: InstanceData;
  isSelected: boolean;
  animationTriggers: number[];
  onSelect: () => void;
}

export const InstanceListItem: FC<InstanceListItemProps> = React.memo(
  ({ instance, isSelected, animationTriggers, onSelect }) => {
    const borderColor = stringToColor(instance.className);
    const now = Date.now();

    const activeTriggers = animationTriggers.filter((t) => now - t < 300);

    return (
      <div
        onClick={onSelect}
        style={{
          padding: '6px 10px',
          borderBottom: `1px solid ${T.border0}`,
          borderLeft: `3px solid ${borderColor}`,
          cursor: 'pointer',
          background: isSelected ? T.bgSelected : 'transparent',
          transition: 'background 0.15s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = T.bg3;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {activeTriggers.map((triggerTime) => (
          <div
            key={triggerTime}
            className="sweep-line"
            style={{ background: borderColor }}
          />
        ))}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <InstanceId id={instance.id} />
          <div
            style={{
              display: 'flex',
              gap: '3px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {instance.hydrationStatus === 'hydrating' && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  background: T.warningBg,
                  color: T.warningText,
                  borderRadius: T.radiusSm,
                  letterSpacing: '0.3px',
                }}
              >
                HYDRATING
              </span>
            )}
            {instance.hydrationStatus === 'error' && (
              <span
                title={instance.hydrationError}
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  background: T.errorBg,
                  color: T.errorText,
                  borderRadius: T.radiusSm,
                  cursor: 'help',
                  letterSpacing: '0.3px',
                }}
              >
                ERR
              </span>
            )}
            {instance.isDisposed && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  background: '#3a1a1a',
                  color: T.error,
                  borderRadius: T.radiusSm,
                  letterSpacing: '0.3px',
                }}
              >
                DISPOSED
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);

InstanceListItem.displayName = 'InstanceListItem';
