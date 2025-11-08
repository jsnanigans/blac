import React, { FC } from 'react';
import { Viewer, Differ } from 'json-diff-kit';
import 'json-diff-kit/dist/viewer.css';
import type { DiffResult } from '../blocs';

// Create a differ instance for state comparisons
const differ = new Differ();

interface StateDiffViewProps {
  diff: DiffResult;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Displays collapsible diff view comparing previous and current states
 */
export const StateDiffView: FC<StateDiffViewProps> = React.memo(
  ({ diff, isExpanded, onToggleExpanded }) => {
    if (!diff) return null;

    return (
      <div style={{ marginTop: '30px' }}>
        <style>{`
          /* Enhanced diff styling */
          .json-diff-viewer {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 13px !important;
            line-height: 1.6 !important;
            border-collapse: collapse !important;
            width: 100%;
          }

          /* Line backgrounds for modified lines */
          .json-diff-viewer td.line-modify {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }

          .json-diff-viewer td.line-add {
            background-color: rgba(16, 185, 129, 0.15) !important;
          }

          .json-diff-viewer td.line-delete {
            background-color: rgba(239, 68, 68, 0.15) !important;
          }

          /* Line numbers */
          .json-diff-viewer td.line-number {
            color: #6b7280 !important;
            background-color: #1a1a1a !important;
            padding: 2px 12px !important;
            text-align: right !important;
            user-select: none !important;
            border-right: 1px solid #333 !important;
            vertical-align: top !important;
            width: 50px !important;
          }

          /* Content cells */
          .json-diff-viewer td:not(.line-number) {
            padding: 2px 12px !important;
            vertical-align: top !important;
          }

          /* Inline diff highlights - ADDITIONS */
          .json-diff-viewer .inline-diff-add {
            background-color: rgba(16, 185, 129, 0.35) !important;
            color: #10b981 !important;
            font-weight: 700 !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }

          /* Inline diff highlights - REMOVALS */
          .json-diff-viewer .inline-diff-remove {
            background-color: rgba(239, 68, 68, 0.35) !important;
            color: #ef4444 !important;
            font-weight: 700 !important;
            text-decoration: line-through !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
          }

          /* Regular token colors (unchanged values) */
          .json-diff-viewer .token.plain {
            color: #d4d4d4 !important;
          }

          /* Pre tags inside cells */
          .json-diff-viewer pre {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            font-family: inherit !important;
          }

          /* Improved JsonView styles */
          .w-json-view-container {
            line-height: 1.8 !important;
          }

          /* Remove ugly highlight backgrounds on changed values */
          .w-json-view-container mark {
            background: transparent !important;
            color: inherit !important;
          }

          /* Improve collapse/expand arrows */
          .w-json-view-container .w-rjv-arrow {
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .w-json-view-container .w-rjv-arrow:hover {
            opacity: 1;
          }

          /* Better spacing for nested objects */
          .w-json-view-container .w-rjv-line {
            padding: 2px 0;
          }
        `}</style>

        <div
          onClick={onToggleExpanded}
          style={{
            fontSize: '16px',
            marginBottom: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            padding: '4px 0',
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
            }}
          >
            ▶
          </span>
          <span>State Diff (Previous vs Current)</span>
        </div>

        {isExpanded && (
          <div
            style={{
              background: '#1e1e1e',
              borderRadius: '4px',
              overflow: 'auto',
              border: '1px solid #333',
            }}
          >
            <Viewer
              diff={differ.diff(diff.previous, diff.current)}
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
    );
  },
);

StateDiffView.displayName = 'StateDiffView';
