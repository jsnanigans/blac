import React from 'react';

export default function InstanceId(props: { id: string }) {
  const colonIndex = props.id.indexOf(':');
  if (colonIndex === -1) {
    return (
      <div className="instance-id">
        <strong>{props.id}</strong>
      </div>
    );
  }

  const name = props.id.slice(0, colonIndex);
  const instance = props.id.slice(colonIndex + 1);

  return (
    <div className="instance-id">
      <strong>{name}</strong> : {instance}
    </div>
  );
}
