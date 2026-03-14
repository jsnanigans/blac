import React, { FC, useState } from 'react';
import JsonView from '@uiw/react-json-view';

interface CurrentStateViewProps {
  state: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onTimeTravel?: (state: any) => void;
}

export const CurrentStateView: FC<CurrentStateViewProps> = React.memo(
  ({ state, isExpanded, onToggleExpanded, onTimeTravel }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    const handleEdit = () => {
      setEditText(JSON.stringify(state, null, 2));
      setEditError(null);
      setIsEditing(true);
    };

    const handleApply = () => {
      try {
        const parsed = JSON.parse(editText);
        onTimeTravel?.(parsed);
        setIsEditing(false);
        setEditError(null);
      } catch {
        setEditError('Invalid JSON');
      }
    };

    const handleCancel = () => {
      setIsEditing(false);
      setEditError(null);
    };

    return (
      <div>
        <div
          style={{
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            onClick={onToggleExpanded}
            style={{
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
          {onTimeTravel && !isEditing && (
            <button
              onClick={handleEdit}
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid #444',
                color: '#888',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d4';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#888';
              }}
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                background: '#252526',
                color: '#d4d4d4',
                border: '1px solid #444',
                borderRadius: '3px',
                padding: '8px',
                fontSize: '12px',
                fontFamily: 'Monaco, Consolas, monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            {editError && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                {editError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={handleApply}
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
              <button
                onClick={handleCancel}
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#888',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          isExpanded && (
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
          )
        )}
      </div>
    );
  },
);

CurrentStateView.displayName = 'CurrentStateView';
