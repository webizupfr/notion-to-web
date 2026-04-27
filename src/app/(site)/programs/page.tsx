import Link from "next/link";
import { unstable_cache } from "next/cache";
import { listPrograms } from "@/lib/programs";
import { auth } from "@/auth";
import type { ProgramMeta } from "@/lib/types";
import { IconLock, IconArrowRight } from "@/components/ui/icons";
import { ProgramCardThumb } from "@/components/lms/ProgramCardThumb";

export const revalidate = 0;

type Filter = 'all' | 'free' | 'paid';

async function loadPrograms() {
  return unstable_cache(
    async () => listPrograms(),
    ["programs-all"],
    { tags: ["programs:all"], revalidate: 60 },
  )();
}

function isVisible(p: ProgramMeta): boolean {
  if (p.publishingStatus === 'draft') return false;
  return true;
}

function isPaid(p: ProgramMeta): boolean {
  return typeof p.price === 'number' && p.price > 0;
}

function formatPrice(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default async function ProgramsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const sp = (await searchParams?.catch(() => undefined)) || {};
  const filterRaw = sp.filter;
  const filter: Filter = filterRaw === 'paid' || filterRaw === 'free' ? filterRaw : 'all';

  const all = await loadPrograms();
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const visible = isAdmin ? all : all.filter(isVisible);
  const draftCount = all.length - visible.length;

  const filtered =
    filter === 'paid'
      ? visible.filter(isPaid)
      : filter === 'free'
        ? visible.filter((p) => !isPaid(p))
        : visible;

  const counts = {
    all: visible.length,
    free: visible.filter((p) => !isPaid(p)).length,
    paid: visible.filter(isPaid).length,
  };

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      {/* Hero raccourci */}
      <section className="border-b border-[color:var(--border-subtle)] py-[clamp(48px,6vw,80px)]">
        <div className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)]">
          <span className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            Programmes
          </span>
          <h1 className="mt-4 max-w-[20ch] font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,2.8rem)] leading-[1.05] tracking-[-0.035em] font-bold text-[color:var(--text-primary)]">
            Choisis ton point de départ.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[1rem] leading-[1.55] text-[color:var(--text-secondary)]">
            {visible.length === 0
              ? 'De nouveaux programmes arrivent bientôt.'
              : `${visible.length} programme${visible.length > 1 ? 's' : ''} disponible${visible.length > 1 ? 's' : ''} — du gratuit au premium.`}
          </p>
          {isAdmin && draftCount > 0 ? (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--accent-edge)]">
              [admin] · {draftCount} en draft (visibles uniquement par toi)
            </p>
          ) : null}
        </div>
      </section>

      {visible.length > 0 ? (
        <section className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)] py-[clamp(40px,5vw,64px)]">
          {/* Filtres */}
          <FilterTabs current={filter} counts={counts} />

          {/* Grille */}
          {filtered.length === 0 ? (
            <div className="mt-[var(--space-xl)] rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-xl)] text-center">
              <p className="text-[color:var(--text-secondary)]">
                Aucun programme dans cette catégorie pour l&apos;instant.
              </p>
            </div>
          ) : (
            <div className="mt-[var(--space-xl)] grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, idx) => (
                <ProgramCard key={p.slug} p={p} showDraft={isAdmin} priority={idx < 3} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)] py-20">
          <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-xl)] text-center">
            <div className="mx-auto mb-[var(--space-md)] flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-bg)] text-2xl" aria-hidden>
              ✨
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.3rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
              De nouveaux programmes arrivent bientôt
            </h2>
            <p className="mx-auto mt-2 max-w-[44ch] text-[0.95rem] text-[color:var(--text-secondary)]">
              En attendant, retourne à l&apos;accueil pour découvrir l&apos;univers Impulsion.
            </p>
            <Link href="/" className="btn btn-primary mt-[var(--space-md)] inline-flex" style={{ height: 40 }}>
              Retour à l&apos;accueil
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Filtres ───

function FilterTabs({ current, counts }: { current: Filter; counts: { all: number; free: number; paid: number } }) {
  const tabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'free', label: 'Gratuits', count: counts.free },
    { key: 'paid', label: 'Premium', count: counts.paid },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--border-subtle)] pb-2">
      {tabs.map((t) => {
        const href = t.key === 'all' ? '/programs' : `/programs?filter=${t.key}`;
        const isActive = current === t.key;
        return (
          <Link
            key={t.key}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
              isActive
                ? 'bg-[color:var(--accent-bg)] text-[color:var(--accent-edge)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {t.key === 'paid' ? <IconLock size={11} aria-hidden /> : null}
            {t.label}
            <span
              className={`font-normal ${
                isActive ? 'text-[color:var(--accent-edge)]' : 'text-[color:var(--text-tertiary)]'
              }`}
            >
              ({t.count})
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Card programme ───

function ProgramCard({ p, showDraft, priority = false }: { p: ProgramMeta; showDraft: boolean; priority?: boolean }) {
  const thumb = p.thumbnailUrl ?? p.coverImageUrl;
  const paid = isPaid(p);
  const priceLabel = paid ? formatPrice(p.price ?? 0, p.currency ?? 'EUR') : null;

  return (
    <Link
      href={`/programs/${p.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-[var(--r-l)] border bg-[color:var(--surface-0)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-m)] ${
        paid ? 'border-[color:var(--accent-edge)]' : 'border-[color:var(--border-subtle)]'
      }`}
    >
      {/* Badges paywall : cadenas en haut-gauche + prix en haut-droit */}
      {paid ? (
        <>
          <span
            className="absolute left-3 top-3 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--accent-edge)] shadow-sm"
            style={{ background: 'var(--accent)' }}
            aria-hidden
          >
            <IconLock size={13} className="text-[color:var(--accent-ink)]" strokeWidth={2.5} />
          </span>
          <span
            className="absolute right-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-edge)] px-2.5 py-1 font-mono text-[11px] font-semibold tracking-tight text-[color:var(--accent-ink)] shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            {priceLabel}
          </span>
        </>
      ) : null}

      <ProgramCardThumb src={thumb} title={p.title} priority={priority} />

      <div className="flex flex-1 flex-col gap-[var(--space-2xs)] p-[var(--space-md)]">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${paid ? 'text-[color:var(--accent-edge)]' : 'text-[color:var(--text-tertiary)]'}`}>
            {paid ? 'Premium' : p.visibility === 'private' ? 'Privé' : p.type === 'event' ? 'Événement' : p.type === 'sync' ? 'Sprint' : 'Programme'}
          </span>
          {showDraft && p.publishingStatus === 'draft' ? (
            <span className="rounded-full bg-[color:var(--accent-bg)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--accent-edge)]">
              draft
            </span>
          ) : null}
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] font-semibold leading-[1.25] tracking-tight text-[color:var(--text-primary)]">
          {p.title}
        </h3>
        {p.description ? (
          <p className="line-clamp-2 text-[0.9rem] leading-[1.5] text-[color:var(--text-secondary)]">
            {p.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center pt-[var(--space-sm)]">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--accent-edge)]">
            Découvrir
            <IconArrowRight size={12} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
