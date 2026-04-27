'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'auto';
}

function resolveActualTheme(pref: Theme): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(pref: Theme) {
  const root = document.documentElement;
  if (pref === 'auto') {
    root.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  } else {
    root.setAttribute('data-theme', pref);
    localStorage.setItem('theme', pref);
  }
}

/**
 * Toggle light / dark (cycle : auto → light → dark → auto).
 *
 * L'état initial est null jusqu'à ce que le composant soit monté, pour éviter
 * l'hydration mismatch (le serveur ne connaît pas la préférence localStorage).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<Theme | null>(null);

  useEffect(() => {
    setPref(readStoredTheme());
  }, []);

  const actual = pref ? resolveActualTheme(pref) : 'light';

  const cycle = () => {
    if (!pref) return;
    // auto → dark → light → auto
    const next: Theme = pref === 'auto' ? 'dark' : pref === 'dark' ? 'light' : 'auto';
    applyTheme(next);
    setPref(next);
  };

  // Render vide côté serveur + hydration initiale pour éviter le mismatch
  if (!pref) {
    return (
      <button
        type="button"
        aria-label="Changer de thème"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-subtle)] ${className}`}
        disabled
      >
        <span aria-hidden>○</span>
      </button>
    );
  }

  const icon = pref === 'auto' ? '◐' : actual === 'dark' ? '☾' : '☀';
  const label =
    pref === 'auto'
      ? 'Thème : auto (système)'
      : actual === 'dark'
        ? 'Thème : sombre'
        : 'Thème : clair';

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] text-[14px] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] ${className}`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
