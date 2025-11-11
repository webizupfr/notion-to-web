import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { getWorkshopBundle } from "@/lib/content-store";

export const revalidate = 0;

export default async function WorkshopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug } = await (params as Promise<{ slug: string }>);

  const bundle = await unstable_cache(
    async () => await getWorkshopBundle(slug),
    ["workshop-bundle:" + slug],
    { tags: ["page:workshop:" + slug], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if (bundle.visibility === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = bundle.password?.trim() ?? "";
    if (!key) redirect(`/gate?next=/atelier/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/atelier/${slug}&e=1`);
  }

  const layout = bundle.settings?.layout ?? "list";

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Atelier
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.3rem]">
              {bundle.title}
            </h1>
          </div>
          <Link
            href={`/${bundle.derivedHub.slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-amber-700"
          >
            Issu de {bundle.derivedHub.title}
          </Link>
        </div>
        {bundle.description ? (
          <p className="text-base leading-7 text-slate-600">{bundle.description}</p>
        ) : null}
      </header>

      <div
        className={
          layout === "grid"
            ? "grid gap-6 md:grid-cols-2"
            : "flex flex-col gap-4"
        }
      >
        {bundle.days.map((day) => (
          <article
            key={day.id}
            className="rounded-2xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {day.title || `Jour ${day.order}`}
              </h2>
              <span className="text-sm font-medium text-slate-500">Jour {day.order}</span>
            </div>
            {day.summary ? (
              <p className="mt-2 text-sm text-slate-600">{day.summary}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/${day.slug}`}
                className="btn btn-primary text-sm"
              >
                Ouvrir la journée
              </Link>
              <span className="text-xs uppercase tracking-wide text-slate-500">
                {bundle.derivedHub.title}
              </span>
            </div>
          </article>
        ))}
      </div>

      {bundle.days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/60 px-8 py-12 text-center text-sm text-slate-500">
          Aucun jour sélectionné pour cet atelier.
        </div>
      ) : null}
    </section>
  );
}
