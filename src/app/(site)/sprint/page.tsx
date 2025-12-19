import { unstable_cache } from "next/cache";
import "@/styles/sprint.css";

import { LearningHubCard } from "@/components/learning";
import { getSprintsIndex } from "@/lib/content-store";

export const revalidate = 0;

async function loadSprintIndex() {
  return await unstable_cache(
    async () => await getSprintsIndex(),
    ["sprint-index"],
    { tags: ["page:sprint:index"], revalidate: 120 }
  )();
}

export default async function SprintIndexPage() {
  const index = await loadSprintIndex();
  const items = index?.items ?? [];

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
        {/* Intro */}
        <header className="mx-auto max-w-[44rem] text-center">
          <p className="text-[0.78rem] font-medium tracking-[0.14em] uppercase text-[color:var(--ink-soft)]">
            Sprints pédagogiques
          </p>

          <h1 className="mt-4 text-[2rem] leading-[1.05] sm:text-[2.6rem] font-semibold tracking-[-0.035em] text-[color:var(--ink)]">
            Sprints & Bootcamps
          </h1>

          <p className="mt-4 text-[1rem] sm:text-[1.05rem] leading-[1.7] font-light text-[color:var(--ink-soft)]">
            Des espaces pédagogiques conçus pour accompagner des séminaires,
            hackathons et formats intensifs, sur des situations réelles.
          </p>
        </header>

        {/* Séparateur */}
        <div className="my-14 h-px w-full bg-black/[0.06]" />

        {/* Contenu */}
        {items.length ? (
          <section className="mx-auto max-w-[64rem]">
            <div className="grid gap-8 sm:grid-cols-2">
              {items.map((item) => {
                const meta = [
                  { label: "Format", value: item.visibility === "private" ? "Privé" : "Ouvert" },
                  { label: "Fuseau", value: item.timezone },
                ];

                return (
                  <LearningHubCard
                    key={item.slug}
                    mode="sprint"
                    title={item.title}
                    href={`/sprint/${item.slug}`}
                    meta={meta}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <div className="mx-auto max-w-[36rem] text-center">
            <p className="text-[0.95rem] leading-[1.6] font-light text-[color:var(--ink-soft)]">
              Aucun sprint n’est disponible pour le moment.
            </p>
          </div>
        )}

        {/* Silence bas */}
        <div className="h-24" />
      </main>
    </div>
  );
}
