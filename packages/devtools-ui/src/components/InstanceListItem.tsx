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

function statePreview(state: unknown): string {
  if (state === null) return 'null';
  if (state === undefined) return 'undefined';
  if (typeof state === 'string')
    return `"${state.length > 32 ? state.slice(0, 32) + '…' : state}"`;
  if (typeof state === 'number' || typeof state === 'boolean')
    return String(state);
  if (Array.isArray(state)) return `Array(${state.length})`;
  if (typeof state === 'object') {
    const keys = Object.keys(state as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) return `{ ${keys.join(', ')} }`;
    return `{ ${keys.slice(0, 3).join(', ')}, … }`;
  }
  return String(state);
}

export const InstanceListItem: FC<InstanceListItemProps> = React.memo(
  ({ instance, isSelected, animationTriggers, onSelect }) => {
    const borderColor = stringToColor(instance.className);
    const now = Date.now();
    const activeTriggers = animationTriggers.filter((t) => now - t < 300);
    const preview = statePreview(instance.state);

    return (
      <div
        onClick={onSelect}
        style={{
          padding: '5px 10px 5px 0',
          borderBottom: `1px solid ${T.border0}`,
          borderLeft: `3px solid ${borderColor}`,
          cursor: 'pointer',
          background: isSelected ? T.bgSelected : 'transparent',
          transition: 'background 0.15s',
          position: 'relative',
          overflow: 'hidden',
          paddingLeft: '8px',
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

        {/* Line 1: Instance ID + badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            minWidth: 0,
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
              <StatusBadge bg={T.warningBg} color={T.warningText}>
                HYDRATING
              </StatusBadge>
            )}
            {instance.hydrationStatus === 'error' && (
              <StatusBadge
                bg={T.errorBg}
                color={T.errorText}
                title={instance.hydrationError}
              >
                ERR
              </StatusBadge>
            )}
            {instance.isDisposed && (
              <StatusBadge bg="#3a1a1a" color={T.error}>
                DISPOSED
              </StatusBadge>
            )}
          </div>
        </div>

        {/* Line 2: State preview */}
        <div
          style={{
            fontSize: '10px',
            color: T.textCode,
            opacity: 0.7,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '1px',
            fontFamily: T.fontMono,
          }}
        >
          {preview}
        </div>
      </div>
    );
  },
);

InstanceListItem.displayName = 'InstanceListItem';

const StatusBadge: FC<{
  bg: string;
  color: string;
  title?: string;
  children: React.ReactNode;
}> = ({ bg, color, title, children }) => (
  <span
    title={title}
    style={{
      fontSize: '8px',
      padding: '0px 4px',
      background: bg,
      color,
      borderRadius: T.radiusSm,
      letterSpacing: '0.3px',
      lineHeight: '16px',
      cursor: title ? 'help' : undefined,
    }}
  >
    {children}
  </span>
);
