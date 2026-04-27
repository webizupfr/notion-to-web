'use client';

import { useState } from 'react';

/**
 * Bouton "Copier" intégré au coin haut-droit d'un bloc de code.
 *
 * État visuel :
 *   idle    → "Copier"
 *   copied  → "✓ Copié" (2s)
 *   error   → "Échec" (2s)
 */
export function CopyCodeButton({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2000);
  }

  const label =
    status === 'copied' ? '✓ Copié' : status === 'error' ? 'Échec' : 'Copier';

  return (
    <button
      type="button"
      onClick={handleClick}
      className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-[6px] border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/70 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
      aria-label="Copier le code"
    >
      {label}
    </button>
  );
}
