import React, { FC, useState } from 'react';
import { EditableJsonTree } from './EditableJsonTree';
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
    const [isRawEditing, setIsRawEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    const safeState = state ?? null;

    const handleRawEdit = () => {
      try {
        setEditText(JSON.stringify(safeState, null, 2));
      } catch {
        setEditText(String(safeState));
      }
      setEditError(null);
      setIsRawEditing(true);
    };

    const handleRawApply = () => {
      try {
        const parsed = JSON.parse(editText);
        onTimeTravel?.(parsed);
        setIsRawEditing(false);
        setEditError(null);
      } catch {
        setEditError('Invalid JSON');
      }
    };

    const handleRawCancel = () => {
      setIsRawEditing(false);
      setEditError(null);
    };

    const editable = !!onTimeTravel;

    return (
      <div>
        <div
          onClick={onToggleExpanded}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 0',
            cursor: 'pointer',
            userSelect: 'none',
            color: T.text1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = T.text0;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = T.text1;
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.15s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '10px',
              color: T.text2,
            }}
          >
            ▶
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            Current State
          </span>
          {editable && isExpanded && !isRawEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRawEdit();
              }}
              title="Edit as raw JSON"
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                padding: '1px 6px',
                background: 'transparent',
                border: `1px solid ${T.border2}`,
                color: T.text2,
                borderRadius: T.radiusSm,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = T.text0;
                e.currentTarget.style.background = T.bgHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = T.text2;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Raw JSON
            </button>
          )}
        </div>

        {isRawEditing ? (
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
                onClick={handleRawApply}
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  background: T.success,
                  border: 'none',
                  color: '#fff',
                  borderRadius: T.radius,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
              <button
                onClick={handleRawCancel}
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
                padding: '8px 10px',
                borderRadius: T.radius,
                overflow: 'auto',
                border: `1px solid ${T.border1}`,
              }}
            >
              {editable ? (
                <EditableJsonTree
                  value={safeState}
                  onChange={(newState) => onTimeTravel?.(newState)}
                />
              ) : (
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
                      fontFamily: T.fontMono,
                      '--w-rjv-background-color': T.bg3,
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
              )}
            </div>
          )
        )}
      </div>
    );
  },
);

CurrentStateView.displayName = 'CurrentStateView';
