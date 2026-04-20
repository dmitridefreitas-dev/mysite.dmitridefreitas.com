import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

const THEMES = ['light', 'dark', 'brown'];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    // light is archived — fall back to dark
    return saved === 'light' || !saved ? 'dark' : saved;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...THEMES);
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle dark ↔ dark (no-op for 'd' key, kept for compat)
  const toggleTheme = () => {
    setTheme(prev => (prev === 'brown' ? 'dark' : prev));
  };

  // Toggle brown mode on/off (Ctrl+B)
  const toggleBrownMode = () => {
    setTheme(prev => (prev === 'brown' ? 'dark' : 'brown'));
  };

  // Cycle: dark → brown → dark
  const cycleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'brown' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, toggleBrownMode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};