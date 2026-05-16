'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const prefs = JSON.parse(sessionStorage.getItem('ren_preferences') || '{}');
      if (prefs.theme) setThemeState(prefs.theme);
    } catch {}
  }, []);

  const toggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    var mt = document.querySelector('meta[name="theme-color"]'); if(mt) mt.setAttribute('content', newTheme === 'dark' ? '#0a0a0c' : '#f8fafc');
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try {
      const prefs = JSON.parse(sessionStorage.getItem('ren_preferences') || '{}');
      prefs.theme = newTheme;
      sessionStorage.setItem('ren_preferences', JSON.stringify(prefs));
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-xl transition-all hover:bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/50 ${className}`}
      title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-[var(--ren-text-secondary)]" />
      ) : (
        <Moon size={18} className="text-[var(--ren-text-secondary)]" />
      )}
    </button>
  );
}
