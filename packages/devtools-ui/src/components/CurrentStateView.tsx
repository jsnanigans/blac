import React, { FC } from 'react';
import JsonView from '@uiw/react-json-view';

interface CurrentStateViewProps {
  state: any;
}

/**
 * Displays current state with syntax highlighting
 */
export const CurrentStateView: FC<CurrentStateViewProps> = React.memo(
  ({ state }) => {
    return (
      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 600 }}>
          Current State
        </h3>
        <div
          style={{
            background: '#252526',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            border: '1px solid #333',
          }}
        >
          <JsonView
            value={state}
            className="w-json-view-container"
            style={
              {
                fontSize: '13px',
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
      </div>
    );
  },
);

CurrentStateView.displayName = 'CurrentStateView';
