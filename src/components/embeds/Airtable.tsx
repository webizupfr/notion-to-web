"use client";

import { useMemo } from "react";

function buildEmbedUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (!/airtable\.com$/i.test(parsed.hostname) && !/\.airtable\.com$/i.test(parsed.hostname)) {
      return rawUrl;
    }

    // Si l'URL est déjà une URL d'embed Airtable, la respecter pour éviter les blocages X-Frame
    if (/\/embed\//i.test(parsed.pathname)) {
      return rawUrl;
    }

    // Cherche un shareId type "shrXXXX" même si l'URL contient un appId intermédiaire
    const match = parsed.pathname.match(/\/(shr[a-z0-9]+)/i);
    if (!match) return rawUrl;
    const shareId = match[1];

    const embed = new URL(`https://airtable.com/embed/${shareId}`);
    parsed.searchParams.forEach((value, key) => {
      if (value && key) embed.searchParams.set(key, value);
    });
    if (!embed.searchParams.has("backgroundColor")) embed.searchParams.set("backgroundColor", "white");
    if (!embed.searchParams.has("viewControls")) embed.searchParams.set("viewControls", "on");

    return embed.toString();
  } catch {
    return rawUrl;
  }
}

export function AirtableEmbed({ url, caption }: { url: string; caption?: string | null }) {
  const embedUrl = useMemo(() => buildEmbedUrl(url), [url]);

  return (
    <figure className="mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--border)]">
      <iframe
        src={embedUrl}
        title={caption ?? "Airtable form"}
        className="h-[750px] w-full border-0"
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
