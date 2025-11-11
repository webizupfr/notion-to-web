import Link from "next/link";

function Content({ next, error }: { next: string; error?: string | null }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Fond animé cohérent (blobs + noise + vignette) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blob blob-amber" />
        <div className="bg-blob blob-rose" />
        <div className="noise" />
        <div className="vignette" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-16">
        {/* Carte glass */}
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/45 bg-white/45 p-8 backdrop-blur-md shadow-[0_30px_80px_-40px_rgba(0,0,0,.25)]">
          {/* En-tête : badge + titres */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="badge">
              <svg className="icon" viewBox="0 0 24 24" fill="#FEDC29" aria-hidden="true">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Espace protégé</h1>
            <p className="text-sm leading-6 text-slate-700">
              Saisissez la <strong>clé d’accès</strong> partagée pour déverrouiller le contenu.
            </p>
          </div>

          {/* Message d'erreur (optionnel) */}
          {error ? (
            <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-700">
              Clé invalide. Réessayez ou contactez votre interlocuteur.
            </p>
          ) : null}

          <GateForm next={next} />

          {/* Aide */}
          <div className="text-xs text-slate-600 text-center">
            Besoin d’aide ?{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:opacity-80">
              Contact
            </Link>{" "}
            ·{" "}
            <a
              href="mailto:hello@impulsion.studio"
              className="underline underline-offset-2 hover:opacity-80"
            >
              hello@impulsion.studio
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

import { GateForm } from "./GateForm";

// Server page (no suspense, stable SSR)
export default function Gate({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const nextRaw = (searchParams?.next as string | undefined) || "/";
  const error = (searchParams?.e as string | undefined) || null;
  return <Content next={nextRaw} error={error} />;
}
