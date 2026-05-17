'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Toast de succès générique. Détecte 2 query params :
 *
 *   ?done=1     → "✓ Étape validée — bien joué !"     (retour d'une unit complétée)
 *   ?success=1  → "✓ Paiement validé — bienvenue !"   (retour Stripe Checkout)
 *
 * Auto-dismiss après 5s + nettoie l'URL au mount.
 */
export function CompletionToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const done = searchParams.get('done') === '1';
  const success = searchParams.get('success') === '1';
  const trigger = done || success;

  const [visible, setVisible] = useState(trigger);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!trigger) return;
    setMessage(success ? '✓ Paiement validé — bienvenue !' : '✓ Étape validée — bien joué !');
    setVisible(true);

    // Clean l'URL (remove ?done=1 / ?success=1 + ?session_id=...)
    const params = new URLSearchParams(searchParams.toString());
    params.delete('done');
    params.delete('completed');
    params.delete('success');
    params.delete('session_id');
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });

    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [trigger, success, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[var(--space-lg)] z-[var(--z-sticky)] -translate-x-1/2 rounded-full border border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg,rgba(34,197,94,0.12))] px-[var(--space-md)] py-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--signal-success)] shadow-sm backdrop-blur-sm"
    >
      {message}
    </div>
  );
}
