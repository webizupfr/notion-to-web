import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { getPageBundle } from "@/lib/content-store";
import { applyCohortOverlay, getCohortBySlug } from "@/lib/cohorts";
import type { NotionBlock } from "@/lib/notion";
import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { LearningHeader } from "@/components/learning/LearningHeader";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { Blocks } from "@/components/notion/Blocks";
import StartToday from "@/components/learning/StartToday";

export const revalidate = 0;

export default async function CohortHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; cohort: string }> | { slug: string; cohort: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug, cohort: cohortSlug } = await (params as Promise<{ slug: string; cohort: string }>);
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
  const unitLabelSingular = cohort.unitLabelSingular ?? learningPath?.unitLabelSingular;

  const effectiveVisibility = cohort.visibility ?? bundle.meta.visibility;
  const effectivePassword = (cohort.password ?? bundle.meta.password ?? "").trim();

  if ((effectiveVisibility ?? "public") === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    if (!key) redirect(`/gate?next=/hubs/${slug}/c/${cohortSlug}`);
    if (effectivePassword && key !== effectivePassword) redirect(`/gate?next=/hubs/${slug}/c/${cohortSlug}&e=1`);
  }

  const navigation = (bundle.meta.navigation ?? []) as NonNullable<typeof bundle.meta.navigation>;
  const days = (learningPath?.days ?? []) as import("@/lib/types").DayEntry[];

  const basePath = `hubs/${slug}/c/${cohortSlug}`;
  const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "");
  const ensureCohortScopedSlug = (value: string | undefined | null) => {
    const raw = stripLeadingSlash(value ?? "");
    if (!raw) return "";
    if (raw.startsWith("hubs/")) return raw.replace(/\/+/g, "/");
    if (raw === slug || raw === `${slug}/c/${cohortSlug}`) return basePath;
    if (raw.startsWith(`${slug}/c/${cohortSlug}/`)) {
      const suffix = raw.slice(`${slug}/c/${cohortSlug}`.length + 1);
      return suffix ? `${basePath}/${suffix}`.replace(/\/+/g, "/") : basePath;
    }
    if (raw.startsWith(`${slug}/`)) {
      const suffix = raw.slice(slug.length + 1);
      return `${basePath}/${suffix}`.replace(/\/+/g, "/");
    }
    if (!raw.includes("/")) {
      return `${basePath}/${raw}`.replace(/\/+/g, "/");
    }
    return raw.replace(/\/+/g, "/");
  };
  const withPrefix = (s: string | undefined | null) => {
    const scoped = ensureCohortScopedSlug(s);
    return scoped ? scoped : "";
  };

  const sections = splitBlocksIntoSections((bundle.blocks ?? []) as NotionBlock[]);
  const renderSections = () => {
    if (!sections.length) return null;
    if (sections.length === 1) {
      return (
        <PageSection variant="content" size="wide">
          <div className="content-panel section-band w-full">
            <Blocks blocks={sections[0].blocks} currentSlug={`${basePath}`} />
          </div>
        </PageSection>
      );
    }
    return sections.map((section, idx) => {
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
            <Blocks blocks={section.blocks} currentSlug={`${basePath}`} />
          </div>
        </PageSection>
      );
    });
  };

  const navItems = navigation.map((item) => {
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

  const daysWithPrefix = days.map((day) => ({
    ...day,
    slug: withPrefix(day.slug),
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={basePath}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={basePath}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <section className="flex-1 min-w-0 space-y-8">
        <PageSection variant="content" size="wide">
          <LearningHeader
            unitLabel={learningPath?.unitLabelSingular ?? "Programme"}
            unitNumber={null}
            title={bundle.meta.title}
            summary={bundle.meta.description ?? null}
          />
        </PageSection>

        {renderSections()}

        {days.length ? (
          <PageSection variant="content" size="wide">
            <div className="content-panel w-full">
              <StartToday days={daysWithPrefix} unitLabelSingular={unitLabelSingular} />
            </div>
          </PageSection>
        ) : null}
      </section>
    </div>
  );
}
