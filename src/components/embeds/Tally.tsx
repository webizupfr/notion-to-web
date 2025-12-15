"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    Tally?: { loadEmbeds?: () => void };
  }
}

function normalizeTallyUrl(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "tally.so") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // Accept /r/<id>, /embed/<id>, /forms/<id>, etc.
    const id = parts.length >= 2 ? parts[1] : parts[0];
    if (!id) return null;
    const qs = new URLSearchParams(u.search);
    if (!qs.has("transparentBackground")) qs.set("transparentBackground", "1");
    if (!qs.has("hideTitle")) qs.set("hideTitle", "1");
    if (!qs.has("dynamicHeight")) qs.set("dynamicHeight", "1");
    // Use /embed/ path per Tally official docs to enable dynamicHeight
    return `https://tally.so/embed/${id}?${qs.toString()}`;
  } catch {
    return null;
  }
}

export function TallyEmbed({ url, className }: { url: string; className?: string }) {
  const tallySrc = useMemo(() => normalizeTallyUrl(url) ?? url, [url]);

  useEffect(() => {
    // Load Tally embed script once and (re)apply to iframes
    const apply = () => window.Tally?.loadEmbeds?.();
    const existing = document.querySelector('script[src="https://tally.so/widgets/embed.js"]') as HTMLScriptElement | null;
    if (existing) {
      // already present, trigger apply on next tick
      setTimeout(apply, 0);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://tally.so/widgets/embed.js';
    s.async = true;
    s.onload = apply;
    document.body.appendChild(s);
    return () => {
      // keep script for future embeds; no cleanup
    };
  }, [tallySrc]);

  return (
    <iframe
      data-tally-src={tallySrc}
      title="Tally form"
      className={className}
      style={{ width: "100%", height:  "820px", border: 0, borderRadius: "var(--r-xl)" }}
      scrolling="yes"
      frameBorder={0}
      allow="clipboard-write; fullscreen"
    />
  );
}
