import React, { FC, useState } from 'react';

interface StackFrame {
  fn: string;
  file: string;
  line: number;
  isUser: boolean;
}

function parseCallstack(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of stack.split('\n')) {
    const match = line.match(/at (.+?) \((.+?):(\d+):\d+\)/);
    if (match) {
      frames.push({
        fn: match[1],
        file: match[2],
        line: parseInt(match[3]),
        isUser: !match[2].includes('node_modules'),
      });
    }
  }
  return frames;
}

function shortPath(filePath: string): string {
  const parts = filePath.replace(/\?.*$/, '').split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : filePath;
}

interface CallStackViewProps {
  callstack: string;
}

export const CallStackView: FC<CallStackViewProps> = ({ callstack }) => {
  const [libExpanded, setLibExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const frames = parseCallstack(callstack);
  const userFrames = frames.filter((f) => f.isUser);
  const libFrames = frames.filter((f) => !f.isUser);

  const handleCopy = () => {
    navigator.clipboard?.writeText(callstack).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      style={{
        padding: '8px 10px',
        background: '#252526',
        borderBottom: '1px solid #333',
        fontSize: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span style={{ color: '#888', fontWeight: 600 }}>INITIATOR:</span>
        <button
          onClick={handleCopy}
          style={{
            fontSize: '9px',
            padding: '1px 6px',
            background: 'transparent',
            border: '1px solid #444',
            color: copied ? '#10b981' : '#666',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {userFrames.length > 0 ? (
        <div style={{ marginBottom: libFrames.length > 0 ? '4px' : 0 }}>
          {userFrames.map((frame, i) => (
            <div key={i} style={{ marginBottom: '3px' }}>
              <span
                style={{
                  color: '#d4d4d4',
                  fontWeight: 600,
                  fontFamily: 'Monaco, Menlo, Consolas, monospace',
                }}
              >
                {frame.fn}
              </span>
              <span
                style={{
                  color: '#666',
                  marginLeft: '8px',
                  fontFamily: 'Monaco, Menlo, Consolas, monospace',
                }}
              >
                {shortPath(frame.file)}:{frame.line}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <pre
          style={{
            margin: '0 0 4px',
            color: '#d4d4d4',
            fontFamily: 'Monaco, Menlo, Consolas, monospace',
            fontSize: '9px',
            lineHeight: '1.3',
            overflow: 'auto',
            maxHeight: '80px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {callstack}
        </pre>
      )}

      {libFrames.length > 0 && (
        <div>
          <button
            onClick={() => setLibExpanded((v) => !v)}
            style={{
              fontSize: '9px',
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {libExpanded ? '▾' : '▸'} {libFrames.length} library frame{libFrames.length !== 1 ? 's' : ''}
          </button>
          {libExpanded && (
            <div style={{ paddingLeft: '10px', marginTop: '3px' }}>
              {libFrames.map((frame, i) => (
                <div
                  key={i}
                  style={{
                    color: '#555',
                    fontSize: '9px',
                    fontFamily: 'Monaco, Menlo, Consolas, monospace',
                    marginBottom: '2px',
                  }}
                >
                  {frame.fn}{' '}
                  <span style={{ color: '#444' }}>
                    {shortPath(frame.file)}:{frame.line}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CallStackView.displayName = 'CallStackView';
