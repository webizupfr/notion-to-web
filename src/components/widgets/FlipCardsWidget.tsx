"use client";

import { useMemo, useRef, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { FlipCardsWidgetConfig } from "@/lib/widget-parser";

function nextIndex(max: number, avoid?: number): number {
  if (max <= 1) return 0;
  let r = Math.floor(Math.random() * max);
  if (avoid !== undefined && r === avoid) r = (r + 1) % max;
  return r;
}

function FlipCard({ title, suggestions }: { title: string; suggestions: string[] }) {
  const [showBack, setShowBack] = useState(false);
  const [backText, setBackText] = useState<string>("");
  const [lastIdx, setLastIdx] = useState<number>(-1);
  const halfFlipMs = 280; // temps pour montrer le recto avant la nouvelle proposition
  const animRef = useRef<number | null>(null);

  const onClick = () => {
    // Cas 1: on est côté recto (titre) → choisir une suggestion et flip vers verso
    if (!showBack) {
      const idx = nextIndex(suggestions.length, lastIdx >= 0 ? lastIdx : undefined);
      setBackText(suggestions[idx]);
      setLastIdx(idx);
      setShowBack(true);
      return;
    }
    // Cas 2: on est déjà côté verso → repasser brièvement par le recto, puis révéler une nouvelle suggestion
    setShowBack(false);
    window.clearTimeout(animRef.current ?? undefined);
    animRef.current = window.setTimeout(() => {
      const idx = nextIndex(suggestions.length, lastIdx >= 0 ? lastIdx : undefined);
      setBackText(suggestions[idx]);
      setLastIdx(idx);
      setShowBack(true);
    }, halfFlipMs);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-48 w-full cursor-pointer rounded-[var(--r-xl)] border border-[color:var(--border)] p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
      style={{ perspective: 1000 }}
      aria-label={`Voir une suggestion pour ${title}`}
    >
      <div
        className="absolute inset-0 rounded-[var(--r-xl)]"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* front */}
        <div
          className="absolute inset-0 rounded-[var(--r-xl)] flip-card-surface px-[var(--space-6)] py-[var(--space-5)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-[0.9rem] font-semibold text-[color:var(--muted)]">{title}</div>
              <div className="mt-2 text-[1.15rem] font-medium leading-[1.5] text-[color:var(--fg)]">Clique pour révéler</div>
            </div>
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-2 text-xs text-[color:var(--muted)] shadow">🎲</div>
        </div>

        {/* back */}
        <div
          className="absolute inset-0 rounded-[var(--r-xl)] flip-card-surface px-[var(--space-6)] py-[var(--space-5)]"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-[0.9rem] font-semibold text-[color:var(--muted)]">{title}</div>
              <div className="mt-2 text-[1.15rem] leading-[1.6] text-[color:var(--fg)] text-balance">{backText || "…"}</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function FlipCardsWidget({ config, storageKey }: { config: FlipCardsWidgetConfig; storageKey: string }) {
  const cards = useMemo(() => config.cards.slice(0, 3), [config.cards]);

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? <Heading level={3} className="text-[1.12rem] leading-[1.35] text-[color:var(--fg)]">{config.title}</Heading> : null}
      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        {cards.map((c, i) => (
          <FlipCard key={`${storageKey}-${i}`} title={c.title} suggestions={c.suggestions} />
        ))}
      </div>
      <Text variant="small" className="text-[color:var(--muted)]">
        Astuce: cliquez sur une carte pour révéler une suggestion, puis recliquez pour en voir une autre (la carte repasse brièvement par le titre).
      </Text>
    </section>
  );
}
