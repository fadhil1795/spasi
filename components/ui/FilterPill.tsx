'use client';

import React from 'react';

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  active,
  onClick,
  count,
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.45rem 1.1rem',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.85rem',
        fontWeight: 600,
        border: '1px solid',
        borderColor: active ? 'transparent' : 'var(--color-border)',
        background: active ? 'var(--grad-primary)' : 'var(--color-surface2)',
        color: active ? '#FFFFFF' : 'var(--color-text)',
        boxShadow: active ? 'var(--shadow-glow)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.1rem 0.45rem',
            borderRadius: 'var(--radius-pill)',
            background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-surface)',
            color: active ? '#FFFFFF' : 'var(--color-muted)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
};
