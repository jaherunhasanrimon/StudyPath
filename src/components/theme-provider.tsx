'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('dishari-theme') as Theme) || 'system';
}

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemDark() ? 'dark' : 'light';
  return theme;
}

function applyToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously to avoid flash
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const resolved = resolveTheme(theme);

  // Apply to DOM whenever theme changes
  useEffect(() => {
    applyToDOM(theme);
  }, [theme]);

  // Listen for OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Force re-render when system preference changes
      if (theme === 'system') {
        // We need to trigger a re-render; we do this by toggling a dummy state
        setThemeState('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('dishari-theme', t);
    applyToDOM(t);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
