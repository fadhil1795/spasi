'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div style={{ width: '100%', marginBottom: '1rem' }}>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <div style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={`input-field ${className}`}
            style={{ paddingLeft: icon ? '2.5rem' : '1rem', ...props.style }}
          />
        </div>
        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
