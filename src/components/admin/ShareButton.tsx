'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Bouton "Partager" pour un programme dans l'admin.
 *
 * Au clic → ouvre une modal avec :
 *   - URL magique pré-remplie (avec ?key=PASSWORD si programme private+password)
 *   - QR code (généré via api.qrserver.com — pas de lib à installer)
 *   - Bouton "Copier le lien"
 *   - Texte de partage à copier (ex: "Voici l'accès à l'atelier...")
 *
 * Idéal pour partager un lien de séminaire en chat/email/QR code projeté.
 */
type Props = {
  programSlug: string;
  programTitle: string;
  visibility: 'public' | 'unlisted' | 'private';
  /** Mot de passe Notion. Si présent → embarqué dans l'URL en ?key=...  */
  password?: string | null;
};

export function ShareButton({ programSlug, programTitle, visibility, password }: Props) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [copyTextState, setCopyTextState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Build URL avec key embarqué si private+password
  const url = useMemo(() => {
    if (!origin) return '';
    const base = `${origin}/programs/${programSlug}`;
    if (visibility === 'private' && password) {
      return `${base}?key=${encodeURIComponent(password)}`;
    }
    return base;
  }, [origin, programSlug, visibility, password]);

  const shareText = useMemo(() => {
    return `Accède à "${programTitle}" ici :\n${url}`;
  }, [programTitle, url]);

  // QR code via service public (pas de lib à installer)
  const qrUrl = useMemo(() => {
    if (!url) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=svg&data=${encodeURIComponent(url)}`;
  }, [url]);

  // ESC ferme la modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyTextState('copied');
    } catch {
      setCopyTextState('error');
    }
    setTimeout(() => setCopyTextState('idle'), 2000);
  }

  const visibilityLabel =
    visibility === 'private'
      ? 'Privé · password embarqué'
      : visibility === 'unlisted'
        ? 'Non listé · accessible avec le lien'
        : 'Public';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Partager ${programTitle}`}
        className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
      >
        🔗 Partager
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Partager ${programTitle}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[var(--z-modal,1000)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] shadow-[var(--shadow-l)]"
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-4 border-b border-[color:var(--border-subtle)] px-[var(--space-lg)] py-[var(--space-md)]">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
                  Partager &laquo; {programTitle} &raquo;
                </h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                  {visibilityLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer (Échap)"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
              >
                ✕
              </button>
            </header>

            {/* Body : QR + URL */}
            <div className="grid gap-[var(--space-lg)] p-[var(--space-lg)] sm:grid-cols-[auto_1fr]">
              {/* QR code */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-white p-[var(--space-sm)]">
                  {qrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={qrUrl} alt="QR code" width={200} height={200} className="block" />
                  ) : null}
                </div>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                  Scan pour ouvrir
                </p>
              </div>

              {/* URL + boutons */}
              <div className="flex flex-col gap-[var(--space-md)]">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                    Lien magique
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      readOnly
                      onFocus={(e) => e.target.select()}
                      className="min-w-0 flex-1 rounded-[var(--r-s)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-2 py-1.5 font-mono text-[12px] text-[color:var(--text-primary)] focus:border-[color:var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="btn btn-primary shrink-0"
                      style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                    >
                      {copyState === 'copied' ? '✓ Copié' : copyState === 'error' ? 'Échec' : 'Copier'}
                    </button>
                  </div>
                  {visibility === 'private' && password ? (
                    <p className="mt-1.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                      Le password est embarqué dans le lien — l&apos;apprenant n&apos;a rien à saisir.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                    Texte prêt à l&apos;emploi
                  </label>
                  <textarea
                    value={shareText}
                    readOnly
                    rows={3}
                    onFocus={(e) => e.target.select()}
                    className="w-full resize-none rounded-[var(--r-s)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-2 py-1.5 text-[13px] leading-[1.5] text-[color:var(--text-primary)] focus:border-[color:var(--accent)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyShareText}
                    className="btn btn-secondary mt-1.5"
                    style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                  >
                    {copyTextState === 'copied' ? '✓ Copié' : copyTextState === 'error' ? 'Échec' : 'Copier le texte'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer hint */}
            <footer className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-[var(--space-lg)] py-[var(--space-sm)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                💡 Idéal pour séminaires : projette le QR code, tout le monde scanne.
              </p>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
