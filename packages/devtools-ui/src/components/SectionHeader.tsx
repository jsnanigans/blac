import React, { FC } from 'react';
import { T } from '../theme';

export const SectionHeader: FC<{
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string | number;
  trailing?: React.ReactNode;
}> = ({ label, isExpanded, onToggle, badge, trailing }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 0',
      cursor: 'pointer',
      userSelect: 'none',
      color: T.text1,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = T.text0;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = T.text1;
    }}
  >
    <span
      style={{
        display: 'inline-block',
        transition: 'transform 0.15s',
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        fontSize: '10px',
        color: T.text2,
      }}
    >
      ▶
    </span>
    <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
    {badge !== undefined && (
      <span
        style={{
          fontSize: '10px',
          color: T.text2,
          fontWeight: 400,
          background: T.bg3,
          padding: '1px 6px',
          borderRadius: T.radiusSm,
          border: `1px solid ${T.border1}`,
        }}
      >
        {badge}
      </span>
    )}
    {trailing && (
      <div
        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
      >
        {trailing}
      </div>
    )}
  </div>
);
