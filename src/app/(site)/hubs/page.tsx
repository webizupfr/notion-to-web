import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";

import { Container } from "@/components/layout/Container";
import { getHubsIndex } from "@/lib/content-store";

export const revalidate = 0;

async function loadHubsIndex() {
  return await unstable_cache(
    async () => await getHubsIndex(),
    ["hubs-index"],
    { tags: ["hubs:index"], revalidate: 60 }
  )();
}

export default async function HubsIndex() {
  const hubsIndex = await loadHubsIndex();
  const hubs = hubsIndex?.items ?? [];

  return (
    <Container className="space-y-12 py-12">
      <section className="space-y-5 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/50 backdrop-blur px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          Pédagogie
        </span>
        <div className="space-y-3">
          <h1 className="text-[2.3rem] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-900">
            Hubs de formation
          </h1>
          <p className="max-w-2xl text-[1.05rem] leading-[1.7] text-slate-600">
            Explorez nos formations, ateliers et modules d’apprentissage structurés pour faire monter vos équipes en compétence.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hubs.map((hub) => (
          <Link
            key={hub.slug}
            href={`/${hub.slug}`}
            className="group rounded-2xl border border-slate-200/60 bg-white/40 p-6 backdrop-blur transition hover:border-emerald-400/60 hover:bg-white/60"
          >
            <div className="space-y-4">
              {hub.visibility === 'private' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  <span aria-hidden>🔒</span> Privé
                </span>
              ) : null}
              {hub.icon ? (
                /^https?:\/\//.test(hub.icon) ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg border bg-white/70">
                    <Image
                      src={hub.icon}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-contain p-1"
                      priority={false}
                    />
                  </div>
                ) : (
                  <div className="text-3xl" aria-hidden="true">
                    {hub.icon}
                  </div>
                )
              ) : null}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 transition group-hover:text-emerald-600">
                  {hub.title}
                </h2>
                {hub.description && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {hub.description}
                  </p>
                )}
              </div>
              <div className="flex items-center text-sm font-medium text-emerald-600">
                Explorer →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {hubs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/40 px-8 py-12 text-center text-sm text-slate-500 backdrop-blur">
          Aucun hub pédagogique pour le moment.<br />
          Synchronisez vos contenus Notion pour les voir apparaître ici.
        </div>
      )}
    </Container>
  );
}
