import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme-context';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover border border-border/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle light/dark theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-text-muted hover:text-text transition-colors" />
      ) : (
        <Sun size={18} className="text-warning transition-colors" />
      )}
    </button>
  );
};
