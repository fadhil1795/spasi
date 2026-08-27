'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';

interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

import { CartProvider } from '@/components/public/CartContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('spasi-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('spasi-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  return (
    <SessionProvider>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <CartProvider>
          {children}
        </CartProvider>
      </ThemeContext.Provider>
    </SessionProvider>
  );
}
