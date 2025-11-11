import Link from "next/link";
import { unstable_cache } from "next/cache";

import { getWorkshopsIndex } from "@/lib/content-store";

export const revalidate = 0;

export default async function WorkshopsIndexPage() {
  const index = await unstable_cache(
    async () => await getWorkshopsIndex(),
    ["workshop-index"],
    { tags: ["page:workshop:index"], revalidate: 120 }
  )();

  if (!index || index.items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 sm:px-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">Ateliers</h1>
          <p className="text-base text-slate-600">Aucun atelier n’est disponible pour le moment.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:px-12">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          Ateliers
        </span>
        <h1 className="text-3xl font-semibold text-slate-900">Sélection de workshops</h1>
        <p className="text-base text-slate-600">Sélectionnez un atelier dérivé de nos hubs pédagogiques.</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {index.items.map((item) => (
          <Link
            key={item.slug}
            href={`/atelier/${item.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-amber-300"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-amber-600">
                {item.title}
              </h2>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Hub: {item.hubSlug}
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-600">
              Découvrir →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
