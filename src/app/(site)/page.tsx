import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero clair et focalisé sur les 2 portes d’entrée */}
      <section className="surface-card overflow-hidden rounded-4xl px-8 py-12 sm:px-12">
        <div className="space-y-6 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm font-medium text-amber-300">
            Impulsion · Innovation augmentée
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Le studio d’innovation augmentée.
            </h1>
            <p className="text-lg leading-relaxed text-slate-200">
              Deux univers complémentaires pour passer de l’idée à l’action —
              le <strong>Studio</strong> pour propulser vos équipes, et le <strong>Lab</strong> pour équiper les entrepreneurs.
            </p>
          </div>
        </div>

        {/* Deux grandes portes d’entrée */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link
            href="/studio"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-amber-400/70 hover:bg-white/10"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Le Studio</h2>
              <p className="text-sm leading-6 text-slate-300">Collectif, innovation, transformation</p>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900">
              Découvrir le Studio
            </div>
          </Link>

          <Link
            href="/lab"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-amber-400/70 hover:bg-white/10"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Le Lab</h2>
              <p className="text-sm leading-6 text-slate-300">IA, autonomie, apprentissage</p>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900">
              Découvrir le Lab
            </div>
          </Link>
        </div>
      </section>

      {/* Liens transverses */}
      <section className="surface-card rounded-4xl px-8 py-10 sm:px-12">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/contact" className="btn btn-primary">Planifier un échange</Link>
          <Link href="/ressources" className="btn btn-ghost">Ressources</Link>
          <Link href="/blog" className="btn btn-ghost">Journal</Link>
        </div>
      </section>
    </div>
  );
}
