import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { getSprintBundle } from "@/lib/content-store";
import type { NavItem } from "@/lib/types";
import { Blocks } from "@/components/notion/Blocks";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { HubFlag } from "@/components/layout/HubFlag";
import { nowInTimezone } from "@/lib/cohorts";
import { EmptyState } from "@/components/states/EmptyState";

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

function timeUntil(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const target = new Date(dateIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `dans ${h} h ${m} min`;
  if (h > 0) return `dans ${h} h`;
  return `dans ${m} min`;
}

const moduleNumberEmoji = (value: number): string => {
  const map = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  if (value >= 0 && value < map.length) return map[value];
  return '📘';
};

function dateKeyInTimezone(dateIso: string, timezone: string): string {
  const date = new Date(dateIso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default async function SprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug } = await (params as Promise<{ slug: string }>);

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
    if (!key) redirect(`/gate?next=/sprint/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/sprint/${slug}&e=1`);
  }

  const timezone = bundle.timezone || "Europe/Paris";

  const contextBlocks = bundle.contextBlocks ?? [];
  const baseNavigation = (bundle.contextNavigation ?? []) as NavItem[];
  const fallbackNav: NavItem[] = [
    {
      type: "section",
      title: "Modules",
      children: bundle.modules.map((m, idx) => ({
        id: m.slug,
        title: m.title,
        slug: `sprint/${slug}/${m.slug}`,
        icon: moduleNumberEmoji(m.order > 0 ? m.order : idx + 1),
      })),
    },
  ];
  const navigation: NavItem[] = baseNavigation.length ? baseNavigation : fallbackNav;
  const showSidebar = navigation.length > 0;
  const navTitle = bundle.title;
  const navSlug = `sprint/${slug}`;

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

  const todaysModules = (() => {
    const { key: todayKey } = nowInTimezone(timezone);
    const list = bundle.modules.filter((m) => {
      if (!m.unlockAtISO) return false;
      const key = dateKeyInTimezone(m.unlockAtISO, timezone);
      return key === todayKey;
    });
    return list.sort((a, b) => (a.order - b.order));
  })();

  const ModulesSection = (
    <div className="grid gap-6 md:grid-cols-2">
      {bundle.modules.map((module, index) => {
        const unlockLabel = formatUnlock(module.unlockAtISO, timezone);
        const countdown = timeUntil(module.unlockAtISO);
        const number = module.order > 0 ? module.order : index + 1;
        const dayBadge = typeof module.dayIndex === 'number' ? `Jour ${(module.dayIndex ?? 0) + 1}` : null;
        const locked = module.isLocked;
        return (
          <Link
            key={module.slug}
            href={`/sprint/${slug}/${module.slug}`}
            className={`group relative flex flex-col justify-between gap-3 ui-card p-5 ${
              locked ? 'border-amber-200/70' : 'border-teal-200/70'
            }`}
            data-state={locked ? 'locked' : 'unlocked'}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  Module {number}
                </span>
                {dayBadge ? (
                  <span className="rounded-full border border-white/40 bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {dayBadge}
                  </span>
                ) : null}
              </div>
              <h2 className={`text-base font-semibold tracking-tight ${locked ? 'text-slate-800' : 'text-slate-900 group-hover:text-teal-700'}`}>
                {module.title}
              </h2>
              {module.description ? (
                <p className="line-clamp-3 text-sm text-slate-600">{module.description}</p>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {module.duration ? (
                  <span className="rounded-full border border-white/50 bg-white/70 px-2.5 py-0.5 text-[11px] text-slate-600">
                    {module.duration} min
                  </span>
                ) : null}
                {module.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/50 bg-white/70 px-2.5 py-0.5 text-[11px] text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                locked ? 'border border-amber-300/70 bg-amber-50 text-amber-700' : 'border border-teal-300/70 bg-teal-50 text-teal-700'
              }`}>
                {locked ? (countdown ? `Déverrouillé ${countdown}` : 'Verrouillé') : 'Accessible'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  // Si sidebar active: layout "Hub-like" avec Notion Blocks + Modules
  if (showSidebar) {
    // Map modules en liste pour l'accès rapide (mode modules)
    const releasedModules = bundle.modules.map((m, idx) => ({
      id: m.slug,
      order: m.order > 0 ? m.order : idx + 1,
      slug: `sprint/${slug}/${m.slug}`,
      title: m.title,
      summary: m.description ?? null,
      steps: [],
    }));
    return (
      <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub={1}>
        <HubFlag value={true} />
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar
            parentTitle={navTitle ?? bundle.title}
            parentSlug={navSlug}
            navigation={navigation}
            isHub={true}
            hubDescription={bundle.description ?? null}
            releasedDays={releasedModules as any}
            learningKind={"modules"}
            unitLabelSingular="Module"
            unitLabelPlural="Modules"
            moduleQuickGroups={dayGroups}
          />
        </div>
        <div className="lg:hidden">
          <PageSidebar
            parentTitle={navTitle ?? bundle.title}
            parentSlug={navSlug}
            navigation={navigation}
            isHub={true}
            hubDescription={bundle.description ?? null}
            releasedDays={releasedModules as any}
            learningKind={"modules"}
            unitLabelSingular="Module"
            unitLabelPlural="Modules"
            moduleQuickGroups={dayGroups}
          />
        </div>
        <section className="flex-1 min-w-0 lg:ml-0 space-y-8">
          <header className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Sprint</span>
            <span className="rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Fuseau horaire&nbsp;: {timezone}</span>
          </header>
          {todaysModules.length > 0 ? (
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-800">Aujourd’hui</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{todaysModules.length} module{todaysModules.length>1?'s':''}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {todaysModules.map((m, idx) => {
                  const number = m.order > 0 ? m.order : idx + 1;
                  const countdown = timeUntil(m.unlockAtISO);
                  return (
                    <a key={m.slug} href={`/sprint/${slug}/${m.slug}`} className="group flex items-center justify-between rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 shadow-sm transition hover:-translate-y-0.5">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wide text-emerald-700">Module {number}</div>
                        <div className="truncate text-sm font-medium text-emerald-900 group-hover:text-emerald-800">{m.title}</div>
                      </div>
                      <span className={`ml-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.isLocked ? 'border border-amber-300/70 bg-amber-50 text-amber-700' : 'border border-teal-300/70 bg-teal-50 text-teal-700'}`}>
                        {m.isLocked ? (countdown ? `dans ${countdown.replace('dans ', '')}` : 'aujourd’hui') : 'disponible'}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
          {contextBlocks?.length ? <Blocks blocks={contextBlocks} currentSlug={navSlug} /> : null}
          {bundle.modules.length ? (
            ModulesSection
          ) : (
            <EmptyState title="Aucun module disponible" description="Ajoutez des modules dans Notion pour ce sprint." />
          )}
        </section>
      </div>
    );
  }

  // Sinon, layout simple: Notion Blocks en haut + Modules
  const wrapperClass = showSidebar
    ? "mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-6 py-12 sm:px-12"
    : "mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-12";

  return (
    <section className={wrapperClass}>
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Sprint</span>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.3rem]">{bundle.title}</h1>
          </div>
          <span className="rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Fuseau horaire&nbsp;: {timezone}</span>
        </div>
        {bundle.description ? (
          <p className="text-base leading-7 text-slate-600">{bundle.description}</p>
        ) : null}
      </header>
      {todaysModules.length > 0 ? (
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-800">Aujourd’hui</h3>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{todaysModules.length} module{todaysModules.length>1?'s':''}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {todaysModules.map((m, idx) => {
              const number = m.order > 0 ? m.order : idx + 1;
              const countdown = timeUntil(m.unlockAtISO);
              return (
                <a key={m.slug} href={`/sprint/${slug}/${m.slug}`} className="group flex items-center justify-between rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 shadow-sm transition hover:-translate-y-0.5">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Module {number}</div>
                    <div className="truncate text-sm font-medium text-emerald-900 group-hover:text-emerald-800">{m.title}</div>
                  </div>
                  <span className={`ml-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.isLocked ? 'border border-amber-300/70 bg-amber-50 text-amber-700' : 'border border-teal-300/70 bg-teal-50 text-teal-700'}`}>
                    {m.isLocked ? (countdown ? `dans ${countdown.replace('dans ', '')}` : 'aujourd’hui') : 'disponible'}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
      {contextBlocks?.length ? <Blocks blocks={contextBlocks} currentSlug={navSlug} /> : null}
      {bundle.modules.length ? (
        ModulesSection
      ) : (
        <EmptyState title="Aucun module disponible" description="Ajoutez des modules dans Notion pour ce sprint." />
      )}
    </section>
  );
}
