import React, { FC } from 'react';
import JsonView from '@uiw/react-json-view';

interface CurrentStateViewProps {
  state: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Displays current state with syntax highlighting
 */
export const CurrentStateView: FC<CurrentStateViewProps> = React.memo(
  ({ state, isExpanded, onToggleExpanded }) => {
    return (
      <div>
        <div
          onClick={onToggleExpanded}
          style={{
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            padding: '3px 0',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#569cd6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#fff';
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '12px',
            }}
          >
            ▶
          </span>
          <span>Current State</span>
        </div>
        {isExpanded && (
          <div
          style={{
            background: '#252526',
            padding: '10px',
            borderRadius: '3px',
            overflow: 'auto',
            border: '1px solid #333',
          }}
        >
          <JsonView
            value={state}
            className="w-json-view-container"
            style={
              {
                fontSize: '12px',
                fontFamily: 'Monaco, Consolas, monospace',
                '--w-rjv-background-color': '#252526',
                '--w-rjv-color': '#d4d4d4',
                '--w-rjv-key-string': '#9cdcfe',
                '--w-rjv-type-string-color': '#ce9178',
                '--w-rjv-type-int-color': '#b5cea8',
                '--w-rjv-type-float-color': '#b5cea8',
                '--w-rjv-type-bigint-color': '#b5cea8',
                '--w-rjv-type-boolean-color': '#569cd6',
                '--w-rjv-type-null-color': '#569cd6',
                '--w-rjv-type-undefined-color': '#569cd6',
                '--w-rjv-brackets-color': '#808080',
                '--w-rjv-arrow-color': '#808080',
                '--w-rjv-quotes-color': '#808080',
              } as React.CSSProperties
            }
          />
        </div>
        )}
      </div>
    );
  },
);

CurrentStateView.displayName = 'CurrentStateView';
