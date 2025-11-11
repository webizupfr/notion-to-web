"use client";

import { useMemo, useRef, useState } from "react";
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
      className="relative h-48 w-full cursor-pointer rounded-[22px] border border-slate-200/80 p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300"
      style={{ perspective: 1000 }}
      aria-label={`Voir une suggestion pour ${title}`}
    >
      <div
        className="absolute inset-0 rounded-[22px]"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* front */}
        <div
          className="absolute inset-0 rounded-[22px] flip-card-surface px-6 py-5"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-[0.9rem] font-semibold text-slate-500">{title}</div>
              <div className="mt-2 text-[1.15rem] font-medium leading-[1.5] text-slate-800">Clique pour révéler</div>
            </div>
          </div>
          <div className="absolute right-3 top-3 rounded-full border bg-white/70 px-2 text-xs text-slate-600 shadow">🎲</div>
        </div>

        {/* back */}
        <div
          className="absolute inset-0 rounded-[22px] flip-card-surface px-6 py-5"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-[0.9rem] font-semibold text-slate-500">{title}</div>
              <div className="mt-2 text-[1.15rem] leading-[1.6] text-slate-800 text-balance">{backText || "…"}</div>
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
    <section className="space-y-4 widget-surface p-5">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <FlipCard key={`${storageKey}-${i}`} title={c.title} suggestions={c.suggestions} />
        ))}
      </div>
      <p className="text-xs text-slate-500">Astuce: cliquez sur une carte pour révéler une suggestion, puis recliquez pour en voir une autre (la carte repasse brièvement par le titre).</p>
    </section>
  );
}
