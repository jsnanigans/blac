import React, { FC, useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { T } from '../theme';

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

    const safeState = state ?? null;

    const handleEdit = () => {
      try {
        setEditText(JSON.stringify(safeState, null, 2));
      } catch {
        setEditText(String(safeState));
      }
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
              e.currentTarget.style.color = T.textAccent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = T.text0;
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
                fontSize: '11px',
                padding: '2px 8px',
                background: 'transparent',
                border: `1px solid ${T.border2}`,
                color: T.text1,
                borderRadius: T.radius,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = T.text0;
                (e.currentTarget as HTMLButtonElement).style.background =
                  T.bgHover;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = T.text1;
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
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
                background: T.bg3,
                color: '#d4d4d4',
                border: `1px solid ${T.border2}`,
                borderRadius: T.radius,
                padding: '8px',
                fontSize: '12px',
                fontFamily: T.fontMono,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            {editError && (
              <div
                style={{ color: T.error, fontSize: '11px', marginTop: '4px' }}
              >
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
                  borderRadius: T.radius,
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
                  border: `1px solid ${T.border2}`,
                  color: T.text1,
                  borderRadius: T.radius,
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
                background: T.bg3,
                padding: '10px',
                borderRadius: T.radius,
                overflow: 'auto',
                border: `1px solid ${T.border1}`,
              }}
            >
              <JsonView
                value={
                  typeof safeState === 'object' && safeState !== null
                    ? safeState
                    : { value: safeState }
                }
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
