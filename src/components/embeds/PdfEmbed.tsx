"use client";

type PdfEmbedProps = {
  url: string;
  caption?: string | null;
};

/**
 * Embed d'un PDF Notion (fichier ou external).
 * On utilise un <iframe> simple pour maximiser la compatibilité.
 */
export function PdfEmbed({ url, caption }: PdfEmbedProps) {
  return (
    <figure className="mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--border)]">
      <iframe
        src={url}
        title={caption ?? "Document PDF"}
        className="h-[820px] w-full border-0"
        loading="lazy"
        allow="fullscreen"
      />
      {caption ? (
        <figcaption className="px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-3)] text-center text-sm text-[0.95rem] text-[color:var(--muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
