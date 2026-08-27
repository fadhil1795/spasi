'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F0F1A',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            textAlign: 'center',
            background: '#1A1A2E',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#EF4444' }}>
            System Error Occurred
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            A global error prevented the page from rendering.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: '#FFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh System
          </button>
        </div>
      </body>
    </html>
  );
}
