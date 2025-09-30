import Link from "next/link";

const pillars = [
  {
    title: "Stratégie augmentée",
    description:
      "Aligner vision produit, feuille de route et objectifs business pour créer un différentiel durable.",
  },
  {
    title: "Design expérientiel",
    description:
      "Concevoir des parcours limpides, accessibles et désirables sur tous les points de contact.",
  },
  {
    title: "Accélération produit",
    description:
      "Prototyper, tester et livrer vite grâce à une stack outillée et une culture du feedback continu.",
  },
];

const stats = [
  { value: "+40", label: "projets pilotés" },
  { value: "3x", label: "time-to-market réduit" },
  { value: "92%", label: "satisfaction client" },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="surface-card overflow-hidden rounded-4xl px-8 py-12 sm:px-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end">
          <div className="space-y-6 lg:max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm font-medium text-emerald-300">
              Impulsion · Innovation augmentée
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Donner corps aux produits qui transforment votre organisation.
              </h1>
              <p className="text-lg leading-relaxed text-slate-200">
                Nous combinons l’intelligence des données, le design systémique et l’exécution pragmatique pour
                imaginer, tester et déployer les expériences qui comptent vraiment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/blog"
                className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Explorer le journal
              </Link>
              <Link
                href="mailto:hello@impulsion.studio"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/60"
              >
                Nous contacter
              </Link>
            </div>
          </div>
          <div className="grid flex-1 gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center">
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
                <p className="mt-1 text-sm uppercase tracking-wider text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/70 hover:bg-white/10"
          >
            <h2 className="text-lg font-semibold text-white">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="surface-card rounded-4xl px-8 py-12 sm:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-white">Une méthode articulée autour du test-and-learn</h2>
            <p className="text-lg leading-relaxed text-slate-200">
              Diagnostic rapide, cadrage data-driven, prototypage low-code, puis livraison incrémentale. Chaque
              étape est documentée dans votre espace Notion pour aligner toutes les équipes et capitaliser sur les
              apprentissages.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <ul className="space-y-4 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Kick-off immersif pour comprendre vos enjeux métier et aligner les objectifs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Design sprints pour prototyper et confronter rapidement les idées au terrain.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Industrialisation avec une stack moderne et des workflows automatisés.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Pilotage continu grâce à des tableaux de bord et des boucles de feedback.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
