"use client";

import { useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { SuggestionCardsWidgetConfig } from "@/lib/widget-parser";

export function SuggestionCardsWidget({ config, storageKey }: { config: SuggestionCardsWidgetConfig; storageKey: string }) {
  // one random index per card
  const initial = useMemo(() => config.cards.map((c) => Math.floor(Math.random() * c.suggestions.length)), [config.cards]);
  const [indices, setIndices] = useState<number[]>(initial);

  const reroll = (i: number) => {
    setIndices((prev) => {
      const next = [...prev];
      const max = config.cards[i].suggestions.length;
      // avoid same index consecutively if possible
      let r = Math.floor(Math.random() * max);
      if (max > 1 && r === prev[i]) r = (r + 1) % max;
      next[i] = r;
      return next;
    });
  };

  const rerollAll = () => {
    setIndices(config.cards.map((c, i) => {
      const max = c.suggestions.length;
      let r = Math.floor(Math.random() * max);
      if (max > 1 && r === indices[i]) r = (r + 1) % max;
      return r;
    }));
  };

  if (!config.cards.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune carte configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      {config.title ? (
        <div className="widget-header">
          <h3 className="widget-header__title">{config.title}</h3>
        </div>
      ) : null}

      <div
        className="grid gap-[var(--space-md)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        aria-live="polite"
      >
        {config.cards.map((card, i) => {
          const choice = card.suggestions[indices[i]];
          return (
            <article
              key={`${storageKey}-${i}`}
              className="relative rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] space-y-[var(--space-xs)] min-w-0"
            >
              <div className="flex items-start justify-between gap-[var(--space-sm)]">
                <Heading level={3} className="text-[1rem]">{card.title}</Heading>
                <button
                  type="button"
                  aria-label={`Changer la suggestion pour ${card.title}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-s)] border border-[color:var(--border-subtle)] text-sm text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                  onClick={() => reroll(i)}
                >
                  ↻
                </button>
              </div>
              <p className="m-0 leading-[1.55] text-[color:var(--text-primary)]">{choice}</p>
            </article>
          );
        })}
      </div>

      <div className="widget-actions">
        <button type="button" onClick={rerollAll} className="btn btn-ghost text-xs">
          Changer tout
        </button>
      </div>
    </section>
  );
}
