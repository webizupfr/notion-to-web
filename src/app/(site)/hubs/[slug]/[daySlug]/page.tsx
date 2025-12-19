import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import "@/styles/hub.css";

import { getPageBundle } from "@/lib/content-store";
import type { DayEntry } from "@/lib/types";
import type { NotionBlock } from "@/lib/notion";
import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { LearningHeader } from "@/components/learning/LearningHeader";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { HubFlag } from "@/components/layout/HubFlag";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { Blocks } from "@/components/notion/Blocks";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";

export const revalidate = 0;

export default async function HubDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; daySlug: string }> | { slug: string; daySlug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug, daySlug } = await (params as Promise<{ slug: string; daySlug: string }>);
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`hub-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if ((bundle.meta.visibility ?? "public") === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = (bundle.meta.password ?? "").trim();
    if (!key) redirect(`/gate?next=/hubs/${slug}/${daySlug}`);
    if (password && key !== password) redirect(`/gate?next=/hubs/${slug}/${daySlug}&e=1`);
  }

  const learningPath = bundle.meta.learningPath ?? null;
  const days = (learningPath?.days ?? []) as DayEntry[];
  const basePrefix = `hubs/${slug}`;
  const absoluteDaySlug = `${basePrefix}/${daySlug}`.replace(/\/+/g, "/");

  const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "");
  const relativeToHub = (value: string | null | undefined) => {
    const trimmed = stripLeadingSlash(value ?? "");
    if (!trimmed) return "";
    if (trimmed.startsWith("hubs/")) {
      const withoutHub = trimmed.replace(/^hubs\//, "");
      if (withoutHub === slug) return "";
      if (withoutHub.startsWith(`${slug}/`)) {
        return withoutHub.slice(slug.length + 1);
      }
      return withoutHub;
    }
    if (trimmed === slug) return "";
    if (trimmed.startsWith(`${slug}/`)) {
      return trimmed.slice(slug.length + 1);
    }
    return trimmed;
  };
  const ensureHubScopedSlug = (value: string | undefined | null) => {
    const raw = stripLeadingSlash(value ?? "");
    if (!raw) return "";
    if (raw.startsWith("hubs/")) return raw.replace(/\/+/g, "/");
    if (raw === slug) return basePrefix;
    if (raw.startsWith(`${slug}/`)) {
      const suffix = raw.slice(slug.length + 1);
      return `${basePrefix}/${suffix}`.replace(/\/+/g, "/");
    }
    if (!raw.includes("/")) {
      return `${basePrefix}/${raw}`.replace(/\/+/g, "/");
    }
    return raw.replace(/\/+/g, "/");
  };

  const canonicalDayKey = relativeToHub(`${slug}/${daySlug}`);
  const findDay = () => {
    return days.find((d) => {
      const rel = relativeToHub(d.slug ?? "");
      if (!rel) return false;
      if (canonicalDayKey && rel === canonicalDayKey) return true;
      return rel.endsWith(`/${daySlug}`) || rel === daySlug;
    });
  };

  const currentDay = findDay();

  const stepsForDay = currentDay?.steps ?? [];
  const spAll =
    (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) ||
    (searchParams as Record<string, string> | undefined);
  const stepIndexRaw = Number(spAll?.step ?? "1");
  const stepIdx = Number.isFinite(stepIndexRaw) && stepIndexRaw >= 1 ? stepIndexRaw - 1 : 0;
  const currentStep = stepsForDay[stepIdx] ?? stepsForDay[0] ?? null;
  const basePath = `/hubs/${slug}/${daySlug}`;

  const withPrefix = (s: string | undefined | null) => {
    const scoped = ensureHubScopedSlug(s);
    return scoped ? scoped : "";
  };
  const daysWithPrefix = days.map((day) => ({
    ...day,
    slug: withPrefix(day.slug),
  }));
  const navItems = (bundle.meta.navigation ?? []).map((item) => {
    if (item.type === "section" && item.children) {
      return {
        ...item,
        children: item.children.map((child) => ({ ...child, slug: withPrefix(child.slug) })),
      };
    }
    if (item.type === "page") {
      return { ...item, slug: withPrefix((item as { slug?: string }).slug) };
    }
    return item;
  });

  const sidebarProps = {
    parentTitle: bundle.meta.title,
    parentSlug: basePrefix,
    parentIcon: bundle.meta.icon ?? null,
    navigation: navItems,
    isHub: true,
    hubDescription: bundle.meta.description ?? null,
    releasedDays: daysWithPrefix,
    learningKind: learningPath?.kind,
    unitLabelSingular: learningPath?.unitLabelSingular,
    unitLabelPlural: learningPath?.unitLabelPlural,
  };

  if (!currentDay) {
    const fallbackCandidates = [absoluteDaySlug, `${slug}/${daySlug}`.replace(/\/+/g, "/")];
    let fallbackBundle: Awaited<ReturnType<typeof getPageBundle>> | null = null;
    let resolvedSlug: string | null = null;
    for (const candidate of fallbackCandidates) {
      fallbackBundle = await getPageBundle(candidate);
      if (fallbackBundle) {
        resolvedSlug = candidate;
        break;
      }
    }
    if (!fallbackBundle || !resolvedSlug) {
      return notFound();
    }
    const fallbackBlocks = (fallbackBundle.blocks ?? []) as NotionBlock[];
    const fallbackSlug = ensureHubScopedSlug(resolvedSlug);
    const fallbackSections = splitBlocksIntoSections(fallbackBlocks);

    return (
      <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
        <HubFlag value />
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar {...sidebarProps} />
        </div>

        <div className="lg:hidden">
          <PageSidebar {...sidebarProps} />
        </div>

        <section className="flex-1 min-w-0 hub-content">
          {fallbackSections.length
            ? fallbackSections.map((section, idx) => {
                const tone = idx % 2 === 0 ? "default" : "alt";
                return (
                  <PageSection
                    key={section.id}
                    variant="content"
                    tone={tone}
                    size="wide"
                    className="py-[var(--space-5)] sm:py-[var(--space-6)]"
                  >
                    <div className="content-panel section-band w-full">
                      <Blocks blocks={section.blocks} currentSlug={fallbackSlug || basePrefix} />
                    </div>
                  </PageSection>
                );
              })
            : (
              <PageSection variant="content" size="wide">
                <div className="content-panel section-band w-full">
                  <Blocks blocks={fallbackBlocks} currentSlug={fallbackSlug || basePrefix} />
                </div>
              </PageSection>
            )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
      <HubFlag value />
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar {...sidebarProps} />
      </div>

      <div className="lg:hidden">
        <PageSidebar {...sidebarProps} />
      </div>

      <section className="flex-1 min-w-0 hub-content">
        <PageSection variant="content" size="wide">
          <LearningHeader
            unitLabel="Jour"
            unitNumber={currentDay.order}
            title={currentDay.title}
            summary={currentDay.summary ?? null}
            currentStep={stepsForDay.length ? stepIdx + 1 : null}
            totalSteps={stepsForDay.length || null}
          />
        </PageSection>

        {stepsForDay.length ? (
          <div className="space-y-[var(--space-m)]" id="steps">
            {currentStep ? (
              <ActivityContent
                activityId={currentStep.id}
                baseSlug={basePath}
                renderMode="day"
              />
            ) : null}
            <StepNavBar
              basePath={basePath}
              currentIndex={stepIdx}
              total={stepsForDay.length}
              currentStepId={currentStep?.id ?? ""}
              completionCTA={{
                progressKey: `hub:${slug}:${daySlug}`,
                returnTo: `/hubs/${slug}`,
                label: "Terminer ce module",
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
