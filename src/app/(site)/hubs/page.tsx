import { unstable_cache } from "next/cache";
import { getHubsIndex } from "@/lib/content-store";
import { LearningHubCard } from "@/components/learning";

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
    <div
      className="relative min-h-dvh font-sans"
      style={{
        ["--paper" as any]: "#fbfaf6",
        ["--paper-2" as any]: "#f4efe3",
        ["--ink" as any]: "#1c1c1c",
        ["--ink-soft" as any]: "rgba(28,28,28,0.62)",
      }}
    >
      <main className="mx-auto w-full max-w-[72rem] px-6 py-16 sm:px-10">
        {/* Intro calme */}
        <header className="mx-auto max-w-[44rem] text-center">
          <p className="text-[0.78rem] font-medium tracking-[0.14em] uppercase text-[color:var(--ink-soft)]">
            Hubs pédagogiques
          </p>

          <h1 className="mt-4 text-[2rem] leading-[1.05] sm:text-[2.6rem] font-semibold tracking-[-0.035em] text-[color:var(--ink)]">
            Impulsion Hubs
          </h1>

          <p className="mt-4 text-[1rem] sm:text-[1.05rem] leading-[1.7] font-light text-[color:var(--ink-soft)]">
            Des parcours pour pratiquer l’IA et l’innovation au quotidien, à votre rythme,
            à partir de situations réelles.
          </p>
        </header>

        {/* Séparateur silencieux */}
        <div className="my-14 h-px w-full bg-black/[0.06]" />

        {/* Contenu */}
        {hubs.length ? (
          <section className="mx-auto max-w-[64rem]">
            <div className="grid gap-8 sm:grid-cols-2">
              {hubs.map((hub) => {
                const meta = [
                  { label: "Format", value: hub.visibility === "private" ? "Privé" : "Ouvert" },
                ];

                return (
                  <LearningHubCard
                    key={hub.slug}
                    mode="hub"
                    title={hub.title}
                    description={hub.description ?? undefined}
                    href={`/hubs/${hub.slug}`}
                    meta={meta}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <div className="mx-auto max-w-[36rem] text-center">
            <p className="text-[0.95rem] leading-[1.6] font-light text-[color:var(--ink-soft)]">
              Aucun hub n’est disponible pour le moment.
            </p>
          </div>
        )}

        {/* Silence bas de page */}
        <div className="h-24" />
      </main>
    </div>
  );
}
