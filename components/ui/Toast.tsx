'use client';

import React, { createContext, useContext, useState } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        {toasts.map((toast) => {
          let bg = 'var(--color-surface)';
          let border = 'var(--color-success)';
          if (toast.type === 'error') border = 'var(--color-danger)';
          if (toast.type === 'warning') border = 'var(--color-warning)';
          if (toast.type === 'info') border = 'var(--color-info)';

          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                borderLeft: `4px solid ${border}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.2rem',
                boxShadow: 'var(--shadow-card)',
                color: 'var(--color-text)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              <div>
                {toast.title && <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{toast.title}</div>}
                <div style={{ fontSize: '0.85rem' }}>{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  marginLeft: '0.75rem',
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
