import React, { FC } from 'react';
import { useBloc } from '@blac/react';
import { DevToolsSearchBloc } from '../blocs';

/**
 * Search input for filtering instances
 */
export const SearchBar: FC = React.memo(() => {
  const [{ query }, bloc] = useBloc(DevToolsSearchBloc);

  return (
    <div
      style={{
        padding: '10px',
        borderBottom: '1px solid #444',
        background: '#252526',
      }}
    >
      <input
        type="text"
        placeholder="Search instances..."
        value={query}
        onChange={(e) => bloc.setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          background: '#1e1e1e',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '13px',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#007acc';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#444';
        }}
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
