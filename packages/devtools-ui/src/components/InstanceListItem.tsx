import React, { FC } from 'react';
import type { InstanceData } from '../types';
import InstanceId from './InstanceId';
import { stringToColor } from '../utils/stringToColor';

interface InstanceListItemProps {
  instance: InstanceData;
  isSelected: boolean;
  animationTriggers: number[];
  onSelect: () => void;
}

/**
 * Individual instance list item with animation effects
 */
export const InstanceListItem: FC<InstanceListItemProps> = React.memo(
  ({ instance, isSelected, animationTriggers, onSelect }) => {
    const borderColor = stringToColor(instance.className);
    const now = Date.now();

    // Only show lines for triggers within 300ms
    const activeTriggers = animationTriggers.filter((t) => now - t < 300);

    return (
      <div
        onClick={onSelect}
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid #333',
          borderLeft: `4px solid ${borderColor}`,
          cursor: 'pointer',
          background: isSelected ? '#094771' : 'transparent',
          transition: 'background 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = '#252526';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {/* Render animated lines for each trigger */}
        {activeTriggers.map((triggerTime) => (
          <div
            key={triggerTime}
            className="sweep-line"
            style={{
              background: borderColor,
            }}
          />
        ))}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <InstanceId id={instance.id} />
          {instance.isDisposed && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: '#f44336',
                borderRadius: '3px',
              }}
            >
              DISPOSED
            </span>
          )}
        </div>
      </div>
    );
  },
);

InstanceListItem.displayName = 'InstanceListItem';
