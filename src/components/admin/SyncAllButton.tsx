'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  lastSyncAt: string | null;
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'jamais';
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return 'jamais';
  const diff = Date.now() - then;
  if (diff < 60_000) return 'à l’instant';
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return `il y a ${Math.floor(diff / 86_400_000)} j`;
}

export function SyncAllButton({ lastSyncAt }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    setStatus('loading');
    setFeedback(null);
    try {
      // Sync les 3 sources en parallèle :
      //   - /api/sync/programs   → DB Programs v3 (programmes + units + steps)
      //   - /api/sync            → DB Pages (statiques) + DB Posts (blog)
      const [programsRes, pagesRes] = await Promise.all([
        fetch('/api/sync/programs', { method: 'POST' }),
        fetch('/api/sync', { method: 'POST' }),
      ]);

      const programsData = (await programsRes.json()) as {
        ok: boolean;
        programsSynced?: number;
        programsTotal?: number;
        durationMs?: number;
        errors?: Array<{ slug: string; error: string }>;
      };

      const pagesData = (await pagesRes.json()) as {
        ok?: boolean;
        synced?: number;
        posts?: number;
        metrics?: { durationMs?: number };
        message?: string;
      };

      const programsOk = programsRes.ok && programsData.ok;
      const pagesOk = pagesRes.ok && pagesData.ok;

      if (programsOk && pagesOk) {
        setStatus('success');
        const durationMs = Math.max(
          programsData.durationMs ?? 0,
          pagesData.metrics?.durationMs ?? 0,
        );
        setFeedback(
          `${programsData.programsSynced}/${programsData.programsTotal} programmes · ${pagesData.synced} pages · ${pagesData.posts} posts · ${Math.round(durationMs / 1000)}s`,
        );
        startTransition(() => router.refresh());
      } else {
        setStatus('error');
        const programsErr = programsData.errors?.[0];
        const parts: string[] = [];
        if (!programsOk) {
          parts.push(programsErr ? `programmes: ${programsErr.slug} (${programsErr.error})` : 'programmes: erreur');
        }
        if (!pagesOk) {
          parts.push(`pages/posts: ${pagesData.message ?? 'erreur'}`);
        }
        setFeedback(parts.join(' · ') || 'Erreur inconnue');
      }
    } catch (e) {
      setStatus('error');
      setFeedback(e instanceof Error ? e.message : String(e));
    }
  }

  const isBusy = status === 'loading' || pending;

  return (
    <div className="flex items-center gap-[var(--space-md)]">
      <button
        type="button"
        onClick={handleClick}
        disabled={isBusy}
        className="btn btn-primary"
        style={{ height: 36, padding: '0 16px', fontSize: 13 }}
      >
        {isBusy ? '⟳ Synchronisation…' : '🔄 Synchroniser Notion'}
      </button>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
        Dernière sync : {formatRelative(lastSyncAt)}
      </span>
      {feedback ? (
        <span
          className={`text-[0.85rem] ${
            status === 'error'
              ? 'text-[color:var(--signal-danger)]'
              : 'text-[color:var(--signal-success)]'
          }`}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
