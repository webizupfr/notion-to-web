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

        {/* Subtexte */}
        <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-neutral-600">
          On passe des idées aux preuves&nbsp;: sprints innovation &amp; défis IA pour
          prototyper, tester et décider vite. Formats courts, concrets, actionnables.
        </p>

                {/* CTA ligne 1 : tout noir */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/sprint" className="btn btn-primary">
            {/* Éclair */}
            <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
            </svg>
            Sprint Innovation
          </Link>

          <Link href="/challenge" className="btn btn-primary">
            {/* Icône build/proto = engrenage */}
            <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.43 12.98l1.77-1.03a.75.75 0 00.28-.97l-1.7-2.94a.75.75 0 00-.95-.3l-2.08.87a6.48 6.48 0 00-1.5-.87l-.31-2.21a.75.75 0 00-.74-.64h-3.4a.75.75 0 00-.74.64l-.31 2.21a6.48 6.48 0 00-1.5.87l-2.08-.87a.75.75 0 00-.95.3l-1.7 2.94a.75.75 0 00.28.97l1.77 1.03a6.62 6.62 0 000 1.74l-1.77 1.03a.75.75 0 00-.28.97l1.7 2.94c.2.35.62.49.95.3l2.08-.87c.45.36.96.65 1.5.87l.31 2.21c.06.36.37.64.74.64h3.4c.37 0 .68-.28.74-.64l.31-2.21c.54-.22 1.05-.51 1.5-.87l2.08.87c.34.19.75.05.95-.3l1.7-2.94a.75.75 0 00-.28-.97l-1.77-1.03c.07-.57.07-1.16 0-1.74zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z"/>
            </svg>
            Challenge IA
          </Link>
        </div>


        {/* CTA ligne 2 : accès protégé, style accent + cadenas */}
        <div className="mt-3">
          <Link href="/gate?next=/" className="btn btn-accent" title="Accès aux espaces protégés">
            <svg className="icon" viewBox="0 0 24 24" fill="#111" aria-hidden="true">
              <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z"/>
            </svg>
            Accès protégé
          </Link>
        </div>
      </main>
    </div>
  );
}
