'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  slug: string;
  lastSyncAt: string | null;
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return '—';
  const diff = Date.now() - then;
  if (diff < 60_000) return 'à l’instant';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`;
  return `${Math.floor(diff / 86_400_000)} j`;
}

export function SyncProgramButton({ slug, lastSyncAt }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    setStatus('loading');
    try {
      const r = await fetch(`/api/sync/programs/${encodeURIComponent(slug)}`, {
        method: 'POST',
      });
      const data = (await r.json()) as { ok: boolean };
      if (r.ok && data.ok) {
        setStatus('success');
        startTransition(() => router.refresh());
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const isBusy = status === 'loading' || pending;
  const label =
    status === 'loading' || pending
      ? '⟳'
      : status === 'success'
        ? '✓'
        : status === 'error'
          ? '✕'
          : '🔄';
  const tone =
    status === 'success'
      ? 'text-[color:var(--signal-success)]'
      : status === 'error'
        ? 'text-[color:var(--signal-danger)]'
        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]';

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className={`transition-colors ${tone}`}
        title={`Resync ${slug}`}
        aria-label={`Resync ${slug}`}
      >
        {label}
      </button>
      <span className="text-[10px] text-[color:var(--text-tertiary)]">
        {formatRelative(lastSyncAt)}
      </span>
    </span>
  );
}
