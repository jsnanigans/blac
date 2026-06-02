import React, { FC } from 'react';
import { T } from '../theme';

/**
 * Renders a list of dotted state paths as compact chips. `'all'` collapses to a
 * single `<all>` chip. When `highlight` is omitted every chip is filled (the
 * default look). When provided, only paths in the set are filled and the rest
 * are dimmed — used to call out the paths that matched the latest change.
 */
export const PathChips: FC<{
  paths: string[] | 'all';
  /** Paths to render emphasised (must match a string in `paths` exactly). */
  highlight?: ReadonlySet<string>;
  /** Max chips shown before collapsing the remainder into a `+N` chip. */
  maxVisible?: number;
}> = ({ paths, highlight, maxVisible = 5 }) => {
  const chipStyle: React.CSSProperties = {
    fontSize: '9px',
    padding: '0 4px',
    background: 'rgba(0,122,204,0.15)',
    border: '1px solid rgba(0,122,204,0.35)',
    borderRadius: '3px',
    color: T.textAccent,
    fontFamily: T.fontMono,
    lineHeight: '14px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };
  const dimStyle: React.CSSProperties = {
    ...chipStyle,
    background: 'transparent',
    border: `1px solid ${T.border1}`,
    color: T.text2,
  };

  if (paths === 'all') {
    return (
      <span style={chipStyle} title="Tracks all paths — wakes on any change">
        &lt;all&gt;
      </span>
    );
  }

  if (paths.length === 0) {
    return <span style={{ ...dimStyle }}>none</span>;
  }

  const visible = paths.slice(0, maxVisible);
  const overflow = paths.length - maxVisible;

  return (
    <span
      style={{ display: 'inline-flex', gap: '2px', flexWrap: 'wrap' }}
      title={paths.join(', ')}
    >
      {visible.map((p) => (
        <span
          key={p}
          style={!highlight || highlight.has(p) ? chipStyle : dimStyle}
        >
          {p}
        </span>
      ))}
      {overflow > 0 && (
        <span style={{ ...dimStyle, opacity: 0.7 }}>+{overflow}</span>
      )}
    </span>
  );
};
