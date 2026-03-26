import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsSearchBloc } from '../blocs';
import { T } from '../theme';

export const SearchBar: FC = React.memo(() => {
  const [{ query }, bloc] = useBloc(DevToolsSearchBloc);

  return (
    <div
      style={{
        padding: '6px 8px',
        borderBottom: `1px solid ${T.border1}`,
        background: T.bg3,
        flexShrink: 0,
      }}
    >
      <input
        type="text"
        placeholder="Search instances…"
        value={query}
        onChange={(e) => bloc.setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
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
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
