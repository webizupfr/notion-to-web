"use client";

import { useMemo, useState } from "react";
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
    <section className="space-y-4 widget-surface p-5">
      {config.title ? (
        <h3 className="text-lg font-semibold">{config.title}</h3>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {config.cards.map((card, i) => {
          const choice = card.suggestions[indices[i]];
          return (
            <article key={`${storageKey}-${i}`} className="rounded-3xl border bg-white/70 backdrop-blur p-5 relative">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-[1.05rem]">{card.title}</h4>
                <button
                  type="button"
                  aria-label="Rafraîchir la suggestion"
                  className="ml-2 rounded-full border px-2 text-sm leading-none text-slate-600 hover:bg-white"
                  onClick={() => reroll(i)}
                >
                  ↻
                </button>
              </div>
              <ul className="mt-3 list-disc pl-5 text-[0.98rem] leading-[1.65]">
                <li>{choice}</li>
              </ul>
            </article>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={rerollAll} className="btn btn-ghost text-xs">Changer tout</button>
      </div>
    </section>
  );
}
