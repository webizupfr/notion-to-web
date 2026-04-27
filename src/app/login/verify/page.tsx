import Link from 'next/link';
import { brand } from '@/config/brand';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <header className="border-b border-[color:var(--border-subtle)]">
        <div className="learning-shell flex items-center justify-between py-4">
          <Link href="/" className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            {brand.privateArea.title} · {brand.privateArea.appName}
          </Link>
        </div>
      </header>

      <main className="learning-shell flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center py-16">
        <section className="w-full max-w-[28rem] text-center">
          <div
            className="mx-auto mb-[var(--space-lg)] flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-bg)] text-3xl"
            aria-hidden
          >
            ✉️
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2rem)] leading-[1.1] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
            Check ton email
          </h1>
          <p className="mt-3 text-[0.98rem] leading-[1.6] text-[color:var(--text-secondary)]">
            Un lien magique est en route. Clique sur le bouton dans le mail
            et tu seras connecté.e automatiquement.
          </p>

          <div className="mt-[var(--space-xl)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-md)] text-left">
            <p className="text-[0.85rem] font-semibold text-[color:var(--text-primary)]">
              Tu ne vois rien ?
            </p>
            <ul className="mt-2 space-y-1 text-[0.85rem] text-[color:var(--text-secondary)]">
              <li>• Check le dossier spam / promotions</li>
              <li>• L&apos;email peut prendre 1-2 min à arriver</li>
              <li>
                •{' '}
                <Link href="/login" className="underline hover:text-[color:var(--accent-edge)]">
                  Renvoyer un lien
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
