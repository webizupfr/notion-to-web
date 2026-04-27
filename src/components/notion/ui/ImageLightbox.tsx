'use client';

import { useEffect, useState } from 'react';

/**
 * Wrapper image avec lightbox au clic.
 *
 * Comportement :
 *   - Clic sur l'image → modal plein écran avec image agrandie
 *   - ESC ou clic en dehors → ferme la modal
 *   - Body scroll lock pendant que la modal est ouverte
 *
 * Usage : entoure une <img>, sans changer le rendu de l'image elle-même.
 */
export function ImageLightbox({
  src,
  alt,
  caption,
  children,
}: {
  src: string;
  alt: string;
  caption?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in border-0 bg-transparent p-0 transition-opacity hover:opacity-95"
        aria-label="Agrandir l'image"
      >
        {children}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Image agrandie'}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[var(--z-modal,1000)] flex flex-col items-center justify-center gap-4 bg-black/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 font-mono text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/15 hover:text-white"
            aria-label="Fermer (Échap)"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[88vh] max-w-[92vw] cursor-zoom-out object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {caption ? (
            <p className="max-w-[80ch] text-center font-mono text-[12px] text-white/70">{caption}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
