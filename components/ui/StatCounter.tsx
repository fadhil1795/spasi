'use client';

import React, { useEffect, useState } from 'react';

interface StatCounterProps {
  value: number;
  label: string;
  suffix?: string;
}

export const StatCounter: React.FC<StatCounterProps> = ({ value, label, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const duration = 1200; // ms
    const incrementTime = 30;
    const steps = duration / incrementTime;
    const increment = (end - start) / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.ceil(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem' }}>
      <div
        style={{
          fontSize: '2.2rem',
          fontWeight: 800,
          background: 'var(--grad-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}
      >
        {count.toLocaleString('id-ID')}{suffix}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 500, marginTop: '0.2rem' }}>
        {label}
      </div>
    </div>
  );
};
