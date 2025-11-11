import Link from "next/link";
import { unstable_cache } from "next/cache";

import { getSprintsIndex } from "@/lib/content-store";

export const revalidate = 0;

export default async function SprintIndexPage() {
  const index = await unstable_cache(
    async () => await getSprintsIndex(),
    ["sprint-index"],
    { tags: ["page:sprint:index"], revalidate: 120 }
  )();

  if (!index || index.items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 sm:px-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">Sprints & hackathons</h1>
          <p className="text-base text-slate-600">Aucun sprint n’est disponible pour le moment.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:px-12">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          Sprints
        </span>
        <h1 className="text-3xl font-semibold text-slate-900">Sprints & hackathons actifs</h1>
        <p className="text-base text-slate-600">Choisissez un sprint pour consulter les modules et leur calendrier de déverrouillage.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {index.items.map((item) => (
          <Link
            key={item.slug}
            href={`/sprint/${item.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-teal-300"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-teal-600">
                {item.title}
              </h2>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Fuseau horaire: {item.timezone}
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-600">
              Voir les modules →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
