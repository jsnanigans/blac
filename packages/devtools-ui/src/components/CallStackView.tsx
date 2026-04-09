import React, { FC, useEffect, useMemo, useState } from 'react';
import { SourceMapConsumer } from 'source-map-js';

interface StackFrame {
  fn: string;
  file: string;
  line: number;
  col: number;
  isUser: boolean;
}

interface ResolvedFrame extends StackFrame {
  displayFile: string;
  displayLine: number;
}

function parseCallstack(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of stack.split('\n')) {
    const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
    if (match) {
      frames.push({
        fn: match[1],
        file: match[2],
        line: parseInt(match[3]),
        col: parseInt(match[4]),
        isUser:
          !match[2].includes('node_modules') &&
          !match[2].includes('blac-core/dist') &&
          !match[2].includes('@blac/core') &&
          !match[2].includes('blac-react/dist') &&
          !match[2].includes('@blac/react'),
      });
    }
  }
  return frames;
}

function cleanFilePath(path: string): string {
  const cleaned = path
    .replace(/^https?:\/\/[^/]+\/@fs/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\?.*$/, '');

  return cleaned.replace(/^\//, '');
}

// Module-level cache so source maps are only fetched once across all component instances
const sourceMapCache = new Map<string, SourceMapConsumer | null>();
const pendingFetches = new Map<string, Promise<SourceMapConsumer | null>>();

async function getSourceMap(
  fileUrl: string,
): Promise<SourceMapConsumer | null> {
  const baseUrl = fileUrl.replace(/\?.*$/, '');

  if (sourceMapCache.has(baseUrl)) return sourceMapCache.get(baseUrl)!;

  if (!pendingFetches.has(baseUrl)) {
    const promise = fetch(`${baseUrl}.map`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => (raw ? new SourceMapConsumer(raw) : null))
      .catch(() => null);
    pendingFetches.set(baseUrl, promise);
  }

  const consumer = await pendingFetches.get(baseUrl)!;
  sourceMapCache.set(baseUrl, consumer);
  return consumer;
}

function useSourceMappedFrames(frames: StackFrame[]): ResolvedFrame[] {
  const [resolved, setResolved] = useState<ResolvedFrame[]>([]);

  useEffect(() => {
    setResolved(
      frames.map((f) => ({
        ...f,
        displayFile: cleanFilePath(f.file),
        displayLine: f.line,
      })),
    );

    let cancelled = false;
    void (async () => {
      const result = await Promise.all(
        frames.map(async (frame) => {
          if (!frame.file.startsWith('http')) {
            return {
              ...frame,
              displayFile: cleanFilePath(frame.file),
              displayLine: frame.line,
            };
          }
          const consumer = await getSourceMap(frame.file);
          if (!consumer) {
            return {
              ...frame,
              displayFile: cleanFilePath(frame.file),
              displayLine: frame.line,
            };
          }
          const pos = consumer.originalPositionFor({
            line: frame.line,
            column: frame.col,
          });
          return {
            ...frame,
            displayFile: cleanFilePath(frame.file),
            displayLine: pos.line ?? frame.line,
          };
        }),
      );
      if (!cancelled) setResolved(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [frames]);

  return resolved;
}

interface CallStackViewProps {
  callstack: string;
}

function copyViaExecCommand(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export const CallStackView: FC<CallStackViewProps> = ({ callstack }) => {
  const [libExpanded, setLibExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const frames = useMemo(() => parseCallstack(callstack), [callstack]);
  const resolvedFrames = useSourceMappedFrames(frames);

  const userFrames = resolvedFrames.filter((f) => f.isUser);
  const libFrames = resolvedFrames.filter((f) => !f.isUser);

  const handleCopy = () => {
    const finish = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(callstack)
        .then(finish)
        .catch(() => {
          copyViaExecCommand(callstack);
          finish();
        });
    } else {
      copyViaExecCommand(callstack);
      finish();
    }
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
                {frame.displayFile}:{frame.displayLine}
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
            {libExpanded ? '▾' : '▸'} {libFrames.length} library frame
            {libFrames.length !== 1 ? 's' : ''}
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
                    {frame.displayFile}:{frame.displayLine}
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
