import React, { FC, useState, useRef, useEffect, useCallback } from 'react';
import { T } from '../theme';

const COLORS = {
  key: '#9cdcfe',
  string: '#ce9178',
  number: '#b5cea8',
  boolean: '#569cd6',
  null: '#569cd6',
  bracket: '#808080',
  comma: '#808080',
  colon: '#808080',
} as const;

function setAtPath(obj: any, path: (string | number)[], value: any): any {
  if (path.length === 0) return value;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  const [key, ...rest] = path;
  clone[key] = setAtPath(clone[key], rest, value);
  return clone;
}

const InlineInput: FC<{
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  type?: 'text' | 'number';
  selectAll?: boolean;
}> = ({ initial, onCommit, onCancel, type = 'text', selectAll = true }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      if (selectAll) el.select();
    }
  }, [selectAll]);

  const commit = () => {
    onCommit(text);
  };

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={commit}
      type={type}
      style={{
        background: T.bg4,
        color: type === 'number' ? COLORS.number : COLORS.string,
        border: `1px solid ${T.borderAccent}`,
        borderRadius: '2px',
        padding: '0 3px',
        fontSize: '12px',
        fontFamily: T.fontMono,
        outline: 'none',
        minWidth: '40px',
        maxWidth: '300px',
        width: `${Math.max(40, text.length * 7.5 + 16)}px`,
      }}
    />
  );
};

const EditableValue: FC<{
  value: any;
  onEdit: (newValue: any) => void;
}> = ({ value, onEdit }) => {
  const [editing, setEditing] = useState(false);

  if (typeof value === 'boolean') {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          onEdit(!value);
        }}
        title="Click to toggle"
        style={{
          color: COLORS.boolean,
          cursor: 'pointer',
          borderBottom: `1px dashed ${COLORS.boolean}50`,
        }}
      >
        {String(value)}
      </span>
    );
  }

  if (value === null) {
    return (
      <span
        style={{ color: COLORS.null, cursor: 'default' }}
        title="null (edit parent to change)"
      >
        null
      </span>
    );
  }

  if (value === undefined) {
    return (
      <span style={{ color: COLORS.null, cursor: 'default' }}>undefined</span>
    );
  }

  if (editing) {
    if (typeof value === 'number') {
      return (
        <InlineInput
          initial={String(value)}
          type="number"
          onCommit={(text) => {
            setEditing(false);
            const num = Number(text);
            if (!isNaN(num)) onEdit(num);
          }}
          onCancel={() => setEditing(false)}
        />
      );
    }

    return (
      <InlineInput
        initial={String(value)}
        onCommit={(text) => {
          setEditing(false);
          onEdit(text);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Click to edit"
        style={{
          color: COLORS.string,
          cursor: 'text',
          borderBottom: `1px dashed ${COLORS.string}40`,
        }}
      >
        "{value}"
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Click to edit"
        style={{
          color: COLORS.number,
          cursor: 'text',
          borderBottom: `1px dashed ${COLORS.number}40`,
        }}
      >
        {value}
      </span>
    );
  }

  return <span style={{ color: T.text2 }}>{String(value)}</span>;
};

const JsonNode: FC<{
  value: any;
  path: (string | number)[];
  onEdit: (path: (string | number)[], newValue: any) => void;
  depth: number;
  keyName?: string | number;
  isLast?: boolean;
}> = ({ value, path, onEdit, depth, keyName, isLast = true }) => {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = depth * 14;

  const keyLabel =
    keyName !== undefined ? (
      <span>
        <span style={{ color: COLORS.key }}>
          {typeof keyName === 'string' ? `"${keyName}"` : keyName}
        </span>
        <span style={{ color: COLORS.colon }}>: </span>
      </span>
    ) : null;

  const comma = !isLast ? <span style={{ color: COLORS.comma }}>,</span> : null;

  if (value === null || value === undefined || typeof value !== 'object') {
    return (
      <div style={{ paddingLeft: `${indent}px`, lineHeight: '20px' }}>
        {keyLabel}
        <EditableValue value={value} onEdit={(v) => onEdit(path, v)} />
        {comma}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((v: any, i: number) => [i, v] as const)
    : Object.entries(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (collapsed) {
    return (
      <div style={{ paddingLeft: `${indent}px`, lineHeight: '20px' }}>
        <span
          onClick={() => setCollapsed(false)}
          style={{ cursor: 'pointer', userSelect: 'none', marginRight: '4px' }}
        >
          <span style={{ color: T.text2, fontSize: '9px' }}>▶</span>
        </span>
        {keyLabel}
        <span style={{ color: COLORS.bracket }}>{openBracket}</span>
        <span style={{ color: T.text2, fontSize: '11px' }}>
          {' '}
          {entries.length} {entries.length === 1 ? 'item' : 'items'}{' '}
        </span>
        <span style={{ color: COLORS.bracket }}>{closeBracket}</span>
        {comma}
      </div>
    );
  }

  return (
    <div>
      <div style={{ paddingLeft: `${indent}px`, lineHeight: '20px' }}>
        <span
          onClick={() => setCollapsed(true)}
          style={{ cursor: 'pointer', userSelect: 'none', marginRight: '4px' }}
        >
          <span style={{ color: T.text2, fontSize: '9px' }}>▼</span>
        </span>
        {keyLabel}
        <span style={{ color: COLORS.bracket }}>{openBracket}</span>
      </div>
      {entries.map(([k, v], i) => (
        <JsonNode
          key={String(k)}
          value={v}
          path={[...path, k]}
          onEdit={onEdit}
          depth={depth + 1}
          keyName={k}
          isLast={i === entries.length - 1}
        />
      ))}
      <div style={{ paddingLeft: `${indent}px`, lineHeight: '20px' }}>
        <span style={{ color: COLORS.bracket }}>{closeBracket}</span>
        {comma}
      </div>
    </div>
  );
};

interface EditableJsonTreeProps {
  value: any;
  onChange: (newValue: any) => void;
}

export const EditableJsonTree: FC<EditableJsonTreeProps> = React.memo(
  ({ value, onChange }) => {
    const handleEdit = useCallback(
      (path: (string | number)[], newValue: any) => {
        const updated = setAtPath(value, path, newValue);
        onChange(updated);
      },
      [value, onChange],
    );

    const safeValue = value ?? null;

    if (typeof safeValue !== 'object' || safeValue === null) {
      return (
        <div
          style={{
            fontSize: '12px',
            fontFamily: T.fontMono,
            lineHeight: '20px',
          }}
        >
          <EditableValue value={safeValue} onEdit={(v) => onChange(v)} />
        </div>
      );
    }

    return (
      <div
        style={{
          fontSize: '12px',
          fontFamily: T.fontMono,
        }}
      >
        <JsonNode value={safeValue} path={[]} onEdit={handleEdit} depth={0} />
      </div>
    );
  },
);

EditableJsonTree.displayName = 'EditableJsonTree';
