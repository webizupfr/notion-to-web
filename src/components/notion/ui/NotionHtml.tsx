'use client';

import { useEffect, useRef } from 'react';

/**
 * Rend du HTML brut isolé dans un Shadow DOM.
 *
 * Pourquoi le Shadow DOM : les <style> injectés via dangerouslySetInnerHTML
 * sont GLOBAUX. Un sélecteur `*` ou `.card` dans le HTML d'un widget contamine
 * toute la page. Shadow DOM scope automatiquement les styles à la racine.
 *
 * Les variables CSS (--color-text-primary, etc.) traversent le shadow boundary
 * par défaut, donc le HTML s'intègre toujours au design system parent.
 */
export function NotionHtml({
  html,
  caption,
}: {
  html: string;
  caption?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = html;
  }, [html]);

  return (
    <figure className="notion-html my-[var(--space-lg)] space-y-2">
      <div ref={hostRef} />
      {caption ? (
        <figcaption className="text-center text-[12px] text-[var(--color-text-secondary)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
