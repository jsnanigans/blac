import React from 'react';
import { T } from '../theme';

export default function InstanceId({ id }: { id: string }) {
  const colonIndex = id.indexOf(':');

  if (colonIndex === -1) {
    return (
      <span
        style={{
          color: T.text0,
          fontWeight: 600,
          fontSize: '11px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {id}
      </span>
    );
  }

  const name = id.slice(0, colonIndex);
  const instanceKey = id.slice(colonIndex + 1);

  return (
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '11px',
      }}
    >
      <span style={{ color: T.text0, fontWeight: 600 }}>{name}</span>
      <span style={{ color: T.text2 }}>{` : ${instanceKey}`}</span>
    </span>
  );
}
