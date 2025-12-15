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

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? <Heading level={3}>{config.title}</Heading> : null}

      <div className="grid gap-[var(--space-m)] md:grid-cols-3">
        {config.cards.map((card, i) => {
          const choice = card.suggestions[indices[i]];
          return (
            <article key={`${storageKey}-${i}`} className="surface-panel relative space-y-[var(--space-xs)]">
              <div className="flex items-start justify-between gap-[var(--space-s)]">
                <Heading level={3}>{card.title}</Heading>
                <button
                  type="button"
                  aria-label="Rafraîchir la suggestion"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] text-sm text-[color:var(--fg)] hover:bg-[color-mix(in_srgb,var(--bg-soft)_94%,white_6%)]"
                  onClick={() => reroll(i)}
                >
                  ↻
                </button>
              </div>
              <ul className="mt-[var(--space-xs)] list-disc space-y-[var(--space-xs)] pl-[var(--space-m)] leading-[1.6] text-[color:var(--fg)]">
                <li>{choice}</li>
              </ul>
            </article>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={rerollAll} className="btn btn-ghost text-xs">
          Changer tout
        </button>
      </div>
    </section>
  );
}
