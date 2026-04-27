import Link from "next/link";
import { brand } from "@/config/brand";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-[color:var(--surface-0)]">
      <header className="border-b border-[color:var(--border-subtle)]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-[clamp(16px,2vw,28px)] py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-[color:var(--text-primary)]">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)]" />
            <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight">
              {brand.name}
            </span>
          </Link>
          <Link
            href="/"
            className="btn btn-ghost"
            style={{ height: 32, padding: "0 12px", fontSize: 13 }}
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-56px)] max-w-[1200px] flex-col items-center justify-center gap-[var(--space-md)] px-[clamp(20px,3vw,48px)] py-16 text-center">
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot" aria-hidden />
          Erreur 404
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3rem)] leading-[1.04] tracking-[-0.035em] font-bold text-[color:var(--text-primary)] max-w-[22ch]">
          Cette page n&apos;existe pas (ou plus).
        </h1>
        <p className="max-w-[48ch] text-[1.02rem] leading-[1.6] text-[color:var(--text-secondary)]">
          Vérifie l&apos;URL, ou reprends depuis un point connu.
        </p>

        <div className="mt-[var(--space-md)] flex flex-wrap items-center justify-center gap-[var(--space-sm)]">
          <Link href="/programs" className="btn btn-primary">
            Voir les programmes
          </Link>
          <Link href="/" className="btn btn-secondary">
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
