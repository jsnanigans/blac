import React, { FC, useRef } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsSearchBloc } from '../blocs';
import { T } from '../theme';

export const SearchBar: FC = React.memo(() => {
  const [{ query }, bloc] = useBloc(DevToolsSearchBloc);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        padding: '6px 8px',
        borderBottom: `1px solid ${T.border1}`,
        background: T.bg3,
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search instances…"
          value={query}
          onChange={(e) => bloc.setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              bloc.setQuery('');
              inputRef.current?.blur();
            }
          }}
          style={{
            width: '100%',
            padding: '4px 24px 4px 8px',
            background: T.bg2,
            border: `1px solid ${T.border2}`,
            borderRadius: T.radius,
            color: T.text0,
            fontSize: '11px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = T.borderAccent;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = T.border2;
          }}
        />
        {query && (
          <button
            onClick={() => {
              bloc.setQuery('');
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: T.text2,
              cursor: 'pointer',
              fontSize: '12px',
              padding: '0 2px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
