import Link from "next/link";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","700"] });
const space = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

export default function Home() {
  return (
    <div className={`${jakarta.className} relative min-h-screen overflow-hidden`}>
      {/* Fond animé (conserve tes .bg-blob, .noise, .vignette depuis globals.css) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blob blob-amber" />
        <div className="bg-blob blob-rose" />
        <div className="noise" />
        <div className="vignette" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* Badge zap */}
        <div className="badge mb-6">
          {/* Zap jaune sur fond noir */}
          <svg className="icon" viewBox="0 0 24 24" fill="#FEDC29" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
          </svg>
        </div>

        {/* Titre & baseline */}
        <h1
          className={`${space.className} text-6xl sm:text-7xl md:text-8xl font-bold leading-[0.95] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 to-neutral-700 [text-shadow:0_1px_0_rgba(255,255,255,.3)]`}
        >
          Impulsion
        </h1>
        <h2 className="mt-3 text-xl sm:text-2xl font-medium text-neutral-700">
          Studio d’innovation
        </h2>

        {/* Subtexte (Version 1 – manifeste percutant) */}
        <div className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-neutral-600">
          <p>Ni cabinet de conseil.</p>
          <p>Ni formation théorique.</p>
          <p className="mt-1 text-neutral-800 font-medium">
            Un studio d’action où l’on apprend en construisant,<br className="hidden sm:inline" />
            et où chaque défi devient un moteur d’innovation.
          </p>
        </div>

          {/* CTA : deux portes (Studio / Lab) */}
<div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
  {/* Le Studio */}
  <div className="flex flex-col items-center text-center">
    <Link href="/studio" className="btn btn-primary flex items-center gap-2">
      <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10 4h4a2 2 0 012 2v1h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a2 2 0 012-2zm4 3V6h-4v1h4z" />
      </svg>
      Le Studio
    </Link>
    <p className="mt-2 text-sm text-neutral-500">
      Équipes & campus
    </p>
  </div>

  {/* Le Lab */}
  <div className="flex flex-col items-center text-center">
    <Link href="/lab" className="btn btn-primary flex items-center gap-2">
      <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 3h6v2l-2 3v7a3 3 0 11-6 0V8L9 5V3zm1 9v3a1 1 0 102 0v-3h-2z" />
      </svg>
      Le Lab
    </Link>
    <p className="mt-2 text-sm text-neutral-500">
      Entrepreneurs
    </p>
  </div>
</div>

        {/* CTA secondaire : accès protégé (inchangé) */}
        <div className="mt-6">
          <Link href="/gate?next=/" className="btn btn-accent" title="Accès aux espaces protégés">
            <svg className="icon" viewBox="0 0 24 24" fill="#111" aria-hidden="true">
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z" />
            </svg>
            Accès protégé
          </Link>
        </div>
      </main>
    </div>
  );
}