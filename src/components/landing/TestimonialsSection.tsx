import { IconStar, IconQuote } from '@/components/ui/icons';
import { testimonials } from '@/config/testimonials';

/**
 * Section témoignages — affichée sur la landing.
 *
 * Layout : grille 1 col mobile, 2 col tablet, 3 col desktop.
 * Chaque card : étoiles, citation, auteur, date, badge source.
 */
export function TestimonialsSection() {
  if (!testimonials.length) return null;
  const total = testimonials.length;
  const avg = testimonials.reduce((s, t) => s + t.rating, 0) / total;

  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)]">
        <div className="mb-[var(--space-xl)] flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              Ce qu&apos;en disent les premiers
            </span>
            <h2 className="mt-3 max-w-[20ch] font-[family-name:var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.1] tracking-[-0.025em] font-bold text-[color:var(--text-primary)]">
              {total} avis · {avg.toFixed(1)}/5 sur Google
            </h2>
          </div>
        </div>

        <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
              className="relative flex flex-col gap-[var(--space-sm)] rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] transition-colors hover:border-[color:var(--border-strong)]"
            >
              <IconQuote
                size={28}
                className="absolute right-[var(--space-md)] top-[var(--space-md)] text-[color:var(--accent)] opacity-30"
                aria-hidden
                strokeWidth={1.5}
              />

              <div className="flex items-center gap-1" aria-label={`${t.rating} sur 5`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <IconStar
                    key={idx}
                    size={14}
                    className={
                      idx < Math.round(t.rating)
                        ? 'fill-[color:var(--accent)] text-[color:var(--accent)]'
                        : 'text-[color:var(--border-strong)]'
                    }
                    aria-hidden
                  />
                ))}
              </div>

              <p className="text-[0.95rem] leading-[1.55] text-[color:var(--text-primary)]">
                {t.body}
              </p>

              <footer className="mt-auto flex items-center gap-[var(--space-xs)] pt-[var(--space-xs)]">
                <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
                  {t.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                  · {t.date}
                </span>
                {t.source ? (
                  <span className="ml-auto rounded-full border border-[color:var(--border-subtle)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">
                    {t.source}
                  </span>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
