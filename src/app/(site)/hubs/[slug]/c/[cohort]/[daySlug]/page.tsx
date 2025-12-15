import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getPageBundle } from "@/lib/content-store";
import type { DayEntry } from "@/lib/types";
import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { LearningHeader } from "@/components/learning/LearningHeader";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { HubFlag } from "@/components/layout/HubFlag";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { applyCohortOverlay, getCohortBySlug } from "@/lib/cohorts";

export const revalidate = 0;

export default async function CohortHubDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; cohort: string; daySlug: string }> | { slug: string; cohort: string; daySlug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug, cohort: cohortSlug, daySlug } = await (params as Promise<{ slug: string; cohort: string; daySlug: string }>);
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`hub-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  const cohort = await getCohortBySlug(cohortSlug);
  if (!cohort) return notFound();
  const normalizeId = (v: string | null | undefined) => (v ?? "").replace(/-/g, "").toLowerCase();
  const cohortHub = normalizeId(cohort.hubNotionId);
  const cohortHubs = (cohort.hubNotionIds ?? []).map(normalizeId).filter(Boolean);
  const bundleHub = normalizeId(bundle.meta.notionId);
  const belongs =
    !cohortHub ||
    !bundleHub ||
    cohortHub === bundleHub ||
    (cohortHubs.length > 0 && cohortHubs.includes(bundleHub));
  if (!belongs) return notFound();

  const learningPathOverlay = applyCohortOverlay(bundle.meta.learningPath ?? null, cohort);
  const learningPath = learningPathOverlay ?? bundle.meta.learningPath ?? null;

  const effectiveVisibility = cohort.visibility ?? bundle.meta.visibility;
  const effectivePassword = (cohort.password ?? bundle.meta.password ?? "").trim();
  const gateNext = `/hubs/${slug}/c/${cohortSlug}/${daySlug}`;

  if ((effectiveVisibility ?? "public") === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    if (!key) redirect(`/gate?next=${gateNext}`);
    if (effectivePassword && key !== effectivePassword) redirect(`/gate?next=${gateNext}&e=1`);
  }

  const days = (learningPath?.days ?? []) as DayEntry[];

  const findDay = () => {
    const fullSlug = `${slug}/${daySlug}`;
    return days.find((d) => d.slug === fullSlug || d.slug.endsWith(`/${daySlug}`));
  };

  const currentDay = findDay();
  if (!currentDay) return notFound();

  const stepsForDay = currentDay.steps ?? [];
  const spAll =
    (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) ||
    (searchParams as Record<string, string> | undefined);
  const stepIndexRaw = Number(spAll?.step ?? "1");
  const stepIdx = Number.isFinite(stepIndexRaw) && stepIndexRaw >= 1 ? stepIndexRaw - 1 : 0;
  const currentStep = stepsForDay[stepIdx] ?? stepsForDay[0] ?? null;
  const basePath = `/hubs/${slug}/c/${cohortSlug}/${daySlug}`;

  const basePrefix = `hubs/${slug}/c/${cohortSlug}`;
  const normalizeSlug = (s: string | undefined | null) => {
    let cleaned = (s ?? "").replace(/^\/+/, "").replace(/^hubs\//, "");
    if (cleaned.startsWith(`${slug}/`)) {
      cleaned = cleaned.slice(slug.length + 1);
    }
    return cleaned;
  };
  const withPrefix = (s: string | undefined | null) => {
    const cleaned = normalizeSlug(s);
    if (!cleaned) return "";
    return `${basePrefix}/${cleaned}`.replace(/\/+/g, "/");
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

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
      <HubFlag value />
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={`${basePrefix}`}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={learningPath?.unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={`${basePrefix}`}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={learningPath?.unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <section className="flex-1 min-w-0 space-y-8">
        <PageSection variant="content" size="wide">
          <LearningHeader
            unitLabel={learningPath?.unitLabelSingular ?? "Jour"}
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
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
