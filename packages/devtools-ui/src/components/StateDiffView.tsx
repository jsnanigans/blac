import React, { FC, useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { Viewer, Differ } from 'json-diff-kit';
import 'json-diff-kit/dist/viewer.css';
import type { DiffResult } from '../blocs';
import { SectionHeader } from './SectionHeader';
import { T } from '../theme';
import { jsonViewTheme } from '../utils/jsonViewTheme';

const differ = new Differ();

type DiffMode = 'changes-only' | 'full-diff';

interface StateDiffViewProps {
  diff: DiffResult;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const StateDiffView: FC<StateDiffViewProps> = React.memo(
  ({ diff, isExpanded, onToggleExpanded }) => {
    const [mode, setMode] = useState<DiffMode>('changes-only');

    if (!diff) return null;

    const hasChanges = diff.changedOnly !== undefined;
    const safePrevious =
      diff.previous != null && typeof diff.previous === 'object'
        ? diff.previous
        : {};
    const safeCurrent =
      diff.current != null && typeof diff.current === 'object'
        ? diff.current
        : {};

    return (
      <div>
        <style>{`
          .json-diff-viewer {
            font-family: ${T.fontMono} !important;
            font-size: 12px !important;
            line-height: 1.6 !important;
            border-collapse: collapse !important;
            width: 100%;
          }
          .json-diff-viewer td.line-modify {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
          .json-diff-viewer td.line-add {
            background-color: rgba(16, 185, 129, 0.15) !important;
          }
          .json-diff-viewer td.line-delete {
            background-color: rgba(239, 68, 68, 0.15) !important;
          }
          .json-diff-viewer td.line-number {
            color: ${T.text2} !important;
            background-color: ${T.bg1} !important;
            padding: 2px 12px !important;
            text-align: right !important;
            user-select: none !important;
            border-right: 1px solid ${T.border1} !important;
            vertical-align: top !important;
            width: 50px !important;
          }
          .json-diff-viewer td:not(.line-number) {
            padding: 2px 12px !important;
            vertical-align: top !important;
          }
          .json-diff-viewer .inline-diff-add {
            background-color: rgba(16, 185, 129, 0.35) !important;
            color: #10b981 !important;
            font-weight: 700 !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }
          .json-diff-viewer .inline-diff-remove {
            background-color: rgba(239, 68, 68, 0.35) !important;
            color: #ef4444 !important;
            font-weight: 700 !important;
            text-decoration: line-through !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }
          .json-diff-viewer .token.plain {
            color: #d4d4d4 !important;
          }
          .json-diff-viewer pre {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            font-family: inherit !important;
          }
        `}</style>

        <SectionHeader
          label="State Diff"
          isExpanded={isExpanded}
          onToggle={onToggleExpanded}
          trailing={
            hasChanges ? (
              <span
                style={{
                  fontSize: '10px',
                  color: T.success,
                  fontWeight: 400,
                }}
              >
                changes detected
              </span>
            ) : undefined
          }
        />

        {isExpanded && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '2px',
                marginBottom: '6px',
              }}
            >
              {(['changes-only', 'full-diff'] as DiffMode[]).map((m) => {
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: '4px 10px',
                      background: isActive ? T.bgAccent : 'transparent',
                      color: isActive ? T.text0 : T.text1,
                      border: 'none',
                      borderRadius: T.radius,
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: isActive ? 500 : 400,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = T.bgHover;
                        e.currentTarget.style.color = T.text0;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = T.text1;
                      }
                    }}
                  >
                    {m === 'changes-only' ? 'Changes Only' : 'Full Diff'}
                  </button>
                );
              })}
            </div>

            {mode === 'changes-only' ? (
              <div
                style={{
                  background: T.bg2,
                  borderRadius: T.radius,
                  padding: '10px',
                  border: `1px solid ${T.border1}`,
                }}
              >
                {!hasChanges ? (
                  <div style={{ color: T.text2, fontSize: '12px' }}>
                    No changes detected
                  </div>
                ) : (
                  <JsonView
                    value={
                      typeof diff.changedOnly === 'object' &&
                      diff.changedOnly !== null
                        ? diff.changedOnly
                        : { value: diff.changedOnly }
                    }
                    style={
                      {
                        fontSize: '12px',
                        fontFamily: T.fontMono,
                        ...jsonViewTheme(T.bg2),
                        '--w-rjv-border-left': `1px solid ${T.border1}`,
                        '--w-rjv-add-color': '#10b981',
                        '--w-rjv-copied-color': '#10b981',
                      } as React.CSSProperties
                    }
                  />
                )}
              </div>
            ) : (
              <div
                style={{
                  background: T.bg2,
                  borderRadius: T.radius,
                  overflow: 'auto',
                  border: `1px solid ${T.border1}`,
                }}
              >
                <Viewer
                  diff={differ.diff(safePrevious, safeCurrent)}
                  indent={2}
                  lineNumbers={true}
                  highlightInlineDiff={true}
                  inlineDiffOptions={{
                    mode: 'word',
                    wordSeparator: ' ',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

StateDiffView.displayName = 'StateDiffView';
