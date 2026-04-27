import Link from "next/link";
import { GateForm } from "./GateForm";
import { brand } from "@/config/brand";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Gate({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const nextRaw = (sp.next as string | undefined) || "/";
  const error = (sp.e as string | undefined) || null;
  const hasError = Boolean(error);

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <header className="border-b border-[color:var(--border-subtle)]">
        <div className="learning-shell flex items-center justify-between py-4">
          <Link href="/" className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            {brand.privateArea.title} · {brand.privateArea.appName}
          </Link>
          <Link
            href="/"
            className="btn btn-ghost"
            style={{ height: 36, padding: "0 14px", fontSize: 14 }}
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="learning-shell flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center py-16">
        <section className="w-full max-w-[28rem]">
          <div className="mb-[var(--space-lg)] text-center">
            <span className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              Accès protégé
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2rem)] leading-[1.1] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
              Saisissez votre clé d&apos;accès
            </h1>
            <p className="mt-3 text-[0.98rem] leading-[1.6] text-[color:var(--text-secondary)]">
              Pour déverrouiller ce contenu, collez la clé partagée par votre
              interlocuteur {brand.name}.
            </p>
          </div>

          {hasError ? (
            <div
              className="mb-[var(--space-md)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--signal-danger-bg)] px-4 py-3"
              role="alert"
            >
              <p className="m-0 text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)]">
                Clé invalide. Réessayez ou contactez votre interlocuteur.
              </p>
            </div>
          ) : null}

          <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]">
            <GateForm next={nextRaw} />
          </div>

          <p className="mt-[var(--space-md)] text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            Besoin d&apos;aide ?{" "}
            <a
              href="mailto:arthur@impulsion-ia.fr"
              className="underline underline-offset-4 decoration-[color:var(--border-strong)] hover:decoration-[color:var(--accent-edge)]"
            >
              arthur@impulsion-ia.fr
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
