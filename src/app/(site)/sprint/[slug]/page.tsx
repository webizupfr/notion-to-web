import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import "@/styles/sprint.css";

import { getSprintBundle } from "@/lib/content-store";
import type { NotionBlock } from "@/lib/notion";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { Blocks } from "@/components/notion/Blocks";
import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

export const revalidate = 0;

function formatDurationMinutes(mins: number | null | undefined): string | null {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
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
  const sprintTitle = bundle.title;
  const sprintSubtitle = bundle.description ?? null;
  const contextLabel =
    ((bundle.settings as { context?: string | null } | null | undefined)?.context ?? "").trim() || null;
  const navSlug = `sprint/${slug}`;
  const modules = bundle.modules.map((mod, index) => {
    const number = mod.order > 0 ? mod.order : index + 1;
    const dayLabel =
      typeof mod.dayIndex === "number" && !Number.isNaN(mod.dayIndex)
        ? `Jour ${mod.dayIndex + 1}`
        : `Module ${number}`;
    return {
      ...mod,
      number,
      dayLabel,
      href: `/sprint/${slug}/${mod.slug}`,
    };
  });

  const totalDurationMinutes = modules.reduce((acc, mod) => acc + (mod.duration ?? 0), 0);
  const totalDurationLabel = formatDurationMinutes(totalDurationMinutes);
  const metaItems = [
    totalDurationLabel,
    `${bundle.modules.length} module${bundle.modules.length > 1 ? "s" : ""}`,
    contextLabel,
  ].filter(Boolean);

  const removePinnedCallouts = (blocksList: NotionBlock[]): NotionBlock[] => {
    return blocksList.filter((block) => {
      if ((block as { type?: string }).type !== "callout") return true;
      const callout = (block as Extract<NotionBlock, { type: "callout" }>).callout;
      const text = (callout.rich_text ?? [])
        .map((r) => r.plain_text ?? "")
        .join("")
        .trim();
      const icon = callout.icon;
      const hasPinIcon = icon?.type === "emoji" && (icon.emoji ?? "").includes("📌");
      const hasPinText = text.startsWith("📌");
      return !(hasPinIcon || hasPinText);
    });
  };
  const contextSections = splitBlocksIntoSections(
    removePinnedCallouts(contextBlocks as NotionBlock[])
  );
  const renderContextSections = () => {
    if (!contextSections.length) return null;
    if (contextSections.length <= 1) {
      return (
        <PageSection variant="content" size="wide" paddingY="tight">
          <div className="content-panel section-band w-full">
            <Blocks blocks={contextSections[0].blocks} currentSlug={navSlug} navigation={navigationForBlocks} />
          </div>
        </PageSection>
      );
    }
    return (
      <>
        {contextSections.map((section, idx) => {
          const tone = idx % 2 === 0 ? "default" : "alt";
          return (
            <PageSection
              key={section.id}
              variant="content"
              tone={tone}
              size="wide"
              paddingY="tight"
            >
              <div className="content-panel section-band w-full">
                <Blocks blocks={section.blocks} currentSlug={navSlug} navigation={navigationForBlocks} />
              </div>
            </PageSection>
          );
        })}
      </>
    );
  };

  const contextNavigation = bundle.contextNavigation ?? [];
  const navigationForBlocks: typeof contextNavigation = bundle.contextNotionId
    ? [
        {
          type: "page" as const,
          id: bundle.contextNotionId,
          title: sprintTitle,
          slug: navSlug,
          icon: null,
        },
        ...contextNavigation,
      ]
    : contextNavigation;
  const moduleQuickGroups = (() => {
    const unlockedModules = modules.filter((mod) => !mod.isLocked);
    if (!unlockedModules.length) return [];
    const groups = new Map<string, Array<{ id: string; title: string; slug: string; order: number }>>();
    for (const mod of unlockedModules) {
      const label =
        typeof mod.dayIndex === "number" && !Number.isNaN(mod.dayIndex)
          ? `Jour ${mod.dayIndex + 1}`
          : "Modules";
      const items = groups.get(label) ?? [];
      const order = mod.order > 0 ? mod.order : mod.number;
      items.push({
        id: mod.slug,
        title: mod.title,
        slug: `sprint/${slug}/${mod.slug}`,
        order,
      });
      groups.set(label, items);
    }
    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items: items.sort((a, b) => a.order - b.order),
    }));
  })();

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={sprintTitle}
          parentSlug={navSlug}
          navigation={contextNavigation}
          learningKind="modules"
          moduleQuickGroups={moduleQuickGroups}
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={sprintTitle}
          parentSlug={navSlug}
          navigation={contextNavigation}
          learningKind="modules"
          moduleQuickGroups={moduleQuickGroups}
        />
      </div>

      <section className="flex-1 min-w-0 sprint-content">
        <PageSection variant="content" size="wide" paddingY="tight">
          <div className="surface-card space-y-[var(--space-m)]">
            <header className="flex flex-col gap-[var(--space-s)] sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-[var(--space-xs)]">
                <div className="flex items-center gap-[var(--space-s)]">
                  <span className="pill">Sprint / Hackathon</span>
                  {timezone ? (
                    <span className="rounded-full border border-[color:var(--border)] px-[var(--space-3)] py-[var(--space-1)] text-[0.95rem] text-[color:var(--muted)]">
                      {timezone}
                    </span>
                  ) : null}
                </div>
                <Heading level={1}>{sprintTitle}</Heading>
                {sprintSubtitle ? (
                  <Text variant="lead" className="max-w-[72ch]">
                    {sprintSubtitle}
                  </Text>
                ) : null}
                {metaItems.length ? (
                  <Text variant="small" className="text-[color:var(--muted)]">
                    {metaItems.join(" · ")}
                  </Text>
                ) : null}
              </div>
              <div className="flex items-center gap-[var(--space-s)]">
                <div className="rounded-full border border-[color:var(--border)] bg-[color-mix(in_srgb,var(--bg)_96%,white_4%)] px-[var(--space-4)] py-[var(--space-2)] text-[0.95rem] font-semibold text-[color:var(--fg)] shadow-[var(--shadow-subtle)]">
                  {bundle.modules.length} module{bundle.modules.length > 1 ? "s" : ""}
                </div>
              </div>
            </header>
          </div>
        </PageSection>

        {renderContextSections()}

        <PageSection variant="content" id="modules" size="wide" paddingY="tight">
          <div className="space-y-[var(--space-m)]">
            <Heading level={2}>Modules du sprint</Heading>
            <div className="grid gap-[var(--space-m)] sm:grid-cols-2">
              {modules.map((mod) => {
                const countdown = timeUntil(mod.unlockAtISO);
                const locked = mod.isLocked;
                const moduleSubtitle = (mod as { subtitle?: string | null }).subtitle ?? mod.description ?? null;
                const moduleDuration = formatDurationMinutes(mod.duration);
                const moduleLevel = mod.tags?.[0] ?? null;
                const stateLabel = locked ? (countdown ? `Verrouillé (${countdown})` : "Verrouillé") : "Accessible";
                return (
                  <Link
                    key={mod.slug}
                    href={mod.href}
                    className={`surface-card block transition-transform hover:-translate-y-[1px] ${locked ? "opacity-75" : ""}`}
                    data-state={locked ? "locked" : "unlocked"}
                  >
                    <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--muted)]">
                      {mod.dayLabel}
                    </Text>
                    <Heading level={3} className="mt-[var(--space-xs)]">
                      {mod.title}
                    </Heading>
                    {moduleSubtitle ? (
                      <Text className="mt-[var(--space-xs)] text-[color:var(--muted)]">{moduleSubtitle}</Text>
                    ) : null}
                    <Text
                      variant="small"
                      className="mt-[var(--space-s)] text-[color:var(--muted)]"
                    >
                      {stateLabel}
                      {moduleDuration ? ` · ${moduleDuration}` : ""}
                      {moduleLevel ? ` · ${moduleLevel}` : ""}
                    </Text>
                  </Link>
                );
              })}
            </div>
          </div>
        </PageSection>
      </section>
    </div>
  );
}
