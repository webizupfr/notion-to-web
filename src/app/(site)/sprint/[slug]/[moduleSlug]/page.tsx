import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { getSprintBundle } from "@/lib/content-store";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { StepTimeline } from "@/components/learning/StepTimeline";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { HubFlag } from "@/components/layout/HubFlag";
import type { NavItem } from "@/lib/types";

export const revalidate = 0;

function formatUnlock(dateIso: string | null | undefined, timezone: string) {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const moduleNumberEmoji = (value: number): string => {
  const map = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  if (value >= 0 && value < map.length) return map[value];
  return '📘';
};

export default async function SprintModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; moduleSlug: string }> | { slug: string; moduleSlug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug, moduleSlug } = await (params as Promise<{ slug: string; moduleSlug: string }>);

  const bundle = await unstable_cache(
    async () => await getSprintBundle(slug),
    ["sprint-bundle:" + slug],
    { tags: ["page:sprint:" + slug], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if (bundle.visibility === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = bundle.password?.trim() ?? "";
    if (!key) redirect(`/gate?next=/sprint/${slug}/${moduleSlug}`);
    if (password && key !== password) redirect(`/gate?next=/sprint/${slug}/${moduleSlug}&e=1`);
  }

  const moduleIndex = bundle.modules.findIndex((item) => item.slug === moduleSlug);
  const currentModule = moduleIndex >= 0 ? bundle.modules[moduleIndex] : undefined;
  if (!currentModule) return notFound();

  const timezone = bundle.timezone || "Europe/Paris";
  const unlockLabel = formatUnlock(currentModule.unlockAtISO, timezone);

  const activities = (currentModule.activities ?? []).map((activity, idx) => ({
    ...activity,
    order: activity.order ?? idx + 1,
  })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
  const stepParam = Number(sp?.step ?? '1');
  const activeIndex = Number.isFinite(stepParam) && stepParam >= 1 && stepParam <= activities.length ? stepParam - 1 : 0;
  const activeActivity = activities[activeIndex];

  const steps = activities.map((activity, idx) => ({
    id: activity.notionId,
    order: activity.order ?? idx + 1,
    title: activity.title,
    type: activity.type ?? undefined,
    duration: activity.duration ? `${activity.duration} min` : null,
    url: undefined,
    instructions: activity.summary ?? null,
  }));

  if (currentModule.isLocked) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 sm:px-12">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">{currentModule.title}</h1>
          <p className="text-sm text-amber-700">
            Ce module est verrouillé pour le moment.
            {unlockLabel ? ` Déverrouillage prévu le ${unlockLabel}.` : ''}
          </p>
        </header>
        <Link href={`/sprint/${slug}`} className="btn btn-primary self-center">
          Revenir au sprint
        </Link>
      </section>
    );
  }

  const basePath = `/sprint/${slug}/${moduleSlug}`;

  // Build synthetic navigation + groups (same as sprint page)
  // Navigation = Accès rapide (contextNavigation) + section Modules
  const modulesSection: NavItem = {
    type: "section",
    title: "Modules",
    children: bundle.modules.map((m, idx) => ({
      id: m.slug,
      title: m.title,
      slug: `sprint/${slug}/${m.slug}`,
      icon: moduleNumberEmoji(m.order > 0 ? m.order : idx + 1),
    })),
  };
  const navigation: NavItem[] = [
    ...(Array.isArray(bundle.contextNavigation) && bundle.contextNavigation.length
      ? bundle.contextNavigation
      : []),
    modulesSection,
  ];
  const dayGroups = (() => {
    const map = new Map<number, Array<{ id: string; title: string; slug: string; order: number }>>();
    for (let i = 0; i < bundle.modules.length; i++) {
      const m = bundle.modules[i];
      const dayIndex = (typeof m.dayIndex === 'number' && !Number.isNaN(m.dayIndex)) ? m.dayIndex : 0;
      const dayNumber = (dayIndex ?? 0) + 1;
      const arr = map.get(dayNumber) ?? [];
      arr.push({ id: m.slug, title: m.title, slug: `sprint/${slug}/${m.slug}`, order: m.order > 0 ? m.order : i + 1 });
      map.set(dayNumber, arr);
    }
    const groups = Array.from(map.entries()).sort((a,b) => a[0]-b[0]).map(([day, items]) => ({ label: `Jour ${day}`, items: items.sort((a,b) => a.order-b.order) }));
    return groups;
  })();

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub={1}>
      <HubFlag value={true} />
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={bundle.title}
          parentSlug={`sprint/${slug}`}
          navigation={navigation}
          isHub={true}
          hubDescription={bundle.description ?? null}
          releasedDays={[]}
          learningKind={"modules"}
          unitLabelSingular="Module"
          unitLabelPlural="Modules"
          moduleQuickGroups={dayGroups}
        />
      </div>
      <div className="lg:hidden">
        <PageSidebar
          parentTitle={bundle.title}
          parentSlug={`sprint/${slug}`}
          navigation={navigation}
          isHub={true}
          hubDescription={bundle.description ?? null}
          releasedDays={[]}
          learningKind={"modules"}
          unitLabelSingular="Module"
          unitLabelPlural="Modules"
          moduleQuickGroups={dayGroups}
        />
      </div>

      <section className="flex-1 min-w-0 space-y-6 px-6 py-12 sm:px-12">
        <header className="space-y-3">
          <Link href={`/sprint/${slug}`} className="text-sm text-teal-600 underline">
            ← Retour au sprint
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900">{currentModule.title}</h1>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Module {currentModule.order > 0 ? currentModule.order : moduleIndex + 1}
          </p>
          {currentModule.description ? (
            <p className="text-base text-slate-600">{currentModule.description}</p>
          ) : null}
          {currentModule.duration ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">
              Durée estimée : {currentModule.duration} min
            </span>
          ) : null}
        </header>

        {activities.length > 0 ? (
          <div className="space-y-6" id="steps">
            <div className="grid grid-cols-[1fr_auto] gap-6">
              <div>
                {activeActivity ? (
                  <ActivityContent
                    activityId={activeActivity.notionId}
                    baseSlug={basePath}
                    className="prose-activity"
                    fallbackWidgetYaml={activeActivity.widgetYaml ?? null}
                  />
                ) : null}
              </div>
              <div className="justify-self-end -mr-6 sm:-mr-12">
                <StepTimeline
                  steps={steps}
                  basePath={basePath}
                  activeIndex={activeIndex}
                  allowManualToggle={false}
                  showCountLabel={false}
                  mode="numbers"
                />
              </div>
            </div>

            {/* Contrôles de navigation en bas (sticky bar en client) */}
            <div className="h-16" />
            <StepNavBar basePath={basePath} currentIndex={activeIndex} total={activities.length} currentStepId={activeActivity?.notionId ?? ''} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/60 px-8 py-12 text-center text-sm text-slate-500">
            Aucune activité configurée pour ce module.
          </div>
        )}
      </section>
    </div>
  );
}
