import { Fragment } from "react";
import Link from "next/link";
import { Blocks } from "@/components/notion/Blocks";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { PageSection } from "@/components/layout/PageSection";
import { getPageBundle, getDbBundleFromCache } from "@/lib/content-store";
import type { NotionBlock } from "@/lib/notion";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { NextLink } from "@/components/learning/NextLink";
import StartToday from "@/components/learning/StartToday";
import { cookies } from "next/headers";
import type { DayEntry } from "@/lib/types";
import { applyCohortOverlay, getCohortBySlug, nowInTimezone } from "@/lib/cohorts";
import { HubFlag } from "@/components/layout/HubFlag";
import { StepWizard } from "@/components/learning/StepWizard";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { ChallengeShell } from "@/components/learning/ChallengeShell";
import { LearningHeader } from "@/components/learning/LearningHeader";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { extractSectionHeader } from "@/components/marketing/sectionUtils";
import type { NavItem } from "@/lib/types";
import { DefaultMarketingSection, HeroSplitSection, LogosBandSection, MarketingShell } from "@/components/marketing";
import type { MarketingSectionProps } from "@/components/marketing/sections/types";

export const revalidate = 0;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }> | { slug: string[] };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const resolvedParams = await (params as Promise<{ slug: string[] }>);
  const slugSegments = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [resolvedParams.slug];
  let cohortSlug: string | null = null;
  let hubSlugFromPath: string | null = null;
  let daySlugFromPath: string | null = null;
  let contentSlug = slugSegments.join("/");

  if (slugSegments.length >= 3 && slugSegments[1] === "c") {
    // Pattern: /<hub>/c/<cohort>/[day?]
    hubSlugFromPath = slugSegments[0] ?? null;
    cohortSlug = slugSegments[2] ?? null;
    daySlugFromPath = slugSegments[3] ?? null;
    contentSlug = hubSlugFromPath ?? "";
  } else {
    hubSlugFromPath = slugSegments[0] ?? null;
    daySlugFromPath = slugSegments[1] ?? null;
  }

  const slug = [contentSlug, cohortSlug, daySlugFromPath].filter(Boolean).join("/");

  let isVirtualDay = false;

  let bundle = await unstable_cache(
    async () => await getPageBundle(contentSlug),
    [`page-bundle:${contentSlug}`],
    { tags: [`page:${contentSlug}`], revalidate: 60 }
  )();

  // Si aucune page n'existe pour ce slug, mais que le pattern ressemble à un jour (ex: hub/j01),
  // on essaie de construire une "page virtuelle" basée sur le hub et le learning path.
  if (!bundle && hubSlugFromPath && daySlugFromPath) {
    const hubBundle = await unstable_cache(
      async () => await getPageBundle(hubSlugFromPath),
      [`page-bundle:${hubSlugFromPath}`],
      { tags: [`page:${hubSlugFromPath}`], revalidate: 60 }
    )();
    if (hubBundle && hubBundle.meta?.isHub) {
      bundle = hubBundle;
      isVirtualDay = true;
    }
  }

  if (!bundle) return notFound();

  const { blocks } = bundle;
  let meta = bundle.meta;

  const cohort = cohortSlug ? await getCohortBySlug(cohortSlug) : null;
  const sameId = (a: string | null | undefined, b: string | null | undefined) => {
    if (!a || !b) return false;
    return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
  };
  if (cohort && !sameId(cohort.hubNotionId, meta.notionId)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[cohort-mismatch]', {
        cohortSlug,
        cohortHubId: cohort.hubNotionId,
        pageNotionId: meta.notionId,
      });
    }
  }

  const overlayLearningPath = applyCohortOverlay(meta.learningPath ?? null, cohort);
  if (overlayLearningPath) {
    meta = { ...meta, learningPath: overlayLearningPath };
  }
  
  // Déterminer l'univers (Notion prioritaire, sinon préfixe du slug)
  type UniversKind = "studio" | "lab" | "campus";
  const slugUnivers: UniversKind | undefined = slug.startsWith("lab")
    ? "lab"
    : slug.startsWith("studio")
      ? "studio"
      : slug.startsWith("campus")
        ? "campus"
        : undefined;
  const universAttr: UniversKind | undefined = (meta.univers as UniversKind | undefined) || slugUnivers;

  const effectiveVisibility = cohort?.visibility ?? meta.visibility;
  const effectivePassword = (cohort?.password ?? meta.password) || null;
  const isPrivate = effectiveVisibility === "private";
  const isHub = Boolean(meta.isHub);
  const hubDescription = meta.description ?? null;

  // Route dédiée aux hubs (nouveau handler /hubs/[slug])
  if (isHub) {
    const target =
      cohortSlug && daySlugFromPath
        ? `/hubs/${contentSlug}/c/${cohortSlug}/${daySlugFromPath}`
        : cohortSlug
          ? `/hubs/${contentSlug}/c/${cohortSlug}`
          : `/hubs/${contentSlug}`;
    if (!slug.startsWith("hubs/")) {
      redirect(target);
    }
  }

  if (isPrivate) {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get('gate_key')?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? '';
    const normalizedPassword = effectivePassword?.trim() ?? '';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[gate-check]', {
        slug,
        cohortSlug,
        key,
        effectivePassword: normalizedPassword,
        hasCohort: Boolean(cohort),
        from: cohort ? 'cohort' : 'hub',
      });
    }
    if (!key) redirect(`/gate?next=/${slug}`);
    if (normalizedPassword && key !== normalizedPassword) redirect(`/gate?next=/${slug}&e=1`);
  }

  if (!blocks?.length) {
    // Pour une page virtuelle de jour, on autorise l'absence de blocks (tout vient du learning path)
    if (!isVirtualDay) {
      return notFound();
    }
  }

  // Déterminer si on affiche avec sidebar
  // Cas 1: Page parent avec navigation
  const hasNavigation = meta.navigation && meta.navigation.length > 0;
  const isParentWithNav = meta.fullWidth && hasNavigation;
  
  // Cas 2: Child page avec info du parent
  const isChildWithParent = meta.parentSlug && meta.parentNavigation;
  
  const showSidebar = isParentWithNav || isChildWithParent;

  const pageType =
    (meta as { pageType?: string; template?: string }).pageType ??
    (meta as { template?: string }).template;
  const isChallenge = pageType === "challenge";
  const isMarketingPage = !isHub && !isChallenge;
  const isMarketingChild = isChildWithParent && isMarketingPage;
  const flattenNavigation = (items?: NavItem[]): Array<{ title: string; slug: string }> => {
    if (!items?.length) return [];
    const result: Array<{ title: string; slug: string }> = [];
    for (const item of items) {
      if (item.type === "page" && item.slug) {
        result.push({ title: item.title, slug: item.slug });
      } else if (item.type === "section" && item.children?.length) {
        for (const child of item.children) {
          if (child.slug) {
            result.push({ title: child.title, slug: child.slug });
          }
        }
      }
    }
    return result;
  };
  let marketingChildLinks: Array<{ title: string; slug: string }> = [];
  if (isMarketingChild && meta.parentSlug) {
    const parentForMarketing = await unstable_cache(
      async () => await getPageBundle(meta.parentSlug!),
      ["page-bundle:" + meta.parentSlug!],
      { tags: ["page:" + meta.parentSlug!], revalidate: 60 }
    )();
    marketingChildLinks =
      (parentForMarketing?.meta?.childPages ?? [])
        .map((child) => ({ title: child.title, slug: child.slug }))
        .filter((child) => child.slug && child.slug !== slug);
    if (!marketingChildLinks.length) {
      marketingChildLinks = flattenNavigation(parentForMarketing?.meta?.navigation ?? meta.parentNavigation ?? meta.navigation).filter(
        (link) => link.slug && link.slug !== slug
      );
    }
    if (!marketingChildLinks.length) {
      const parentBlocks: NotionBlock[] = (parentForMarketing?.blocks ?? []) as NotionBlock[];
      const dbIds = new Set<string>();
      const add = (v?: string | null) => {
        if (v && v.trim()) dbIds.add(v.trim());
      };
      const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
      const visit = (nodes: ReadonlyArray<unknown>) => {
        for (const n of nodes) {
          if (!isRecord(n)) continue;
          const type = (n as { type?: string }).type;
          if (type === "child_database") {
            const idVal = (n as { id?: unknown }).id;
            add(typeof idVal === "string" ? idVal : undefined);
          }
          const ltp = (n as { link_to_page?: unknown }).link_to_page;
          if (isRecord(ltp) && (ltp as { type?: string }).type === "database_id") {
            const dbid = (ltp as { database_id?: unknown }).database_id;
            add(typeof dbid === "string" ? dbid : undefined);
          }
          const ldb = (n as { linked_db?: unknown }).linked_db;
          if (isRecord(ldb)) {
            const dbid = (ldb as { database_id?: unknown }).database_id;
            add(typeof dbid === "string" ? dbid : undefined);
          }
          const fmt = (n as { format?: unknown }).format;
          const ptr = isRecord(fmt) ? (fmt as { collection_pointer?: unknown }).collection_pointer : null;
          if (isRecord(ptr)) {
            const pid = (ptr as { id?: unknown }).id;
            add(typeof pid === "string" ? pid : undefined);
          }
          const children = (n as { __children?: unknown }).__children;
          if (Array.isArray(children) && children.length) visit(children as unknown[]);
        }
      };
      visit(parentBlocks as unknown[]);
      const canonical = (s: string | null | undefined) => (s ? s.replace(/-/g, "").toLowerCase() : "");
      const currentId = canonical(bundle.meta.notionId);
      for (const id of dbIds) {
        const entry = await getDbBundleFromCache(id, "_");
        const items = entry?.bundle?.items ?? [];
        if (!items.length) continue;
        const hasCurrent = items.some((it) => canonical(it.id) === currentId);
        if (!hasCurrent) continue;
        marketingChildLinks = items
          .filter((it) => it.slug && canonical(it.id) !== currentId)
          .map((it) => ({ title: it.title, slug: `${meta.parentSlug}/${it.slug}` }));
        if (marketingChildLinks.length) break;
      }
    }
  }

  const learningPath = meta.learningPath ?? null;
  const learningKind = learningPath?.kind;
  const unitLabelSingular = cohort?.unitLabelSingular ?? learningPath?.unitLabelSingular;
  const unitLabelPlural = cohort?.unitLabelPlural ?? learningPath?.unitLabelPlural;

  const toCohortSlug = (base: string | null | undefined): string | null => {
    if (!base) return base ?? null;
    if (!cohortSlug) return base;
    const parts = base.split('/');
    if (!parts[0]) return base;
    return [parts[0], 'c', cohortSlug, ...parts.slice(1)].join('/');
  };

  // Page virtuelle de "Jour" basée sur le learning path du hub (ex: /hub/j01, /hub/c/cohort/j01)
  if (isVirtualDay && isHub && learningPath?.days?.length) {
    const navTitle = meta.title;
    const baseNavigation = meta.navigation ?? [];

    const navigation = baseNavigation.map((item) => {
      if (item.type === 'section' && item.children) {
        return {
          ...item,
          children: item.children.map((child) => ({
            ...child,
            slug: toCohortSlug(child.slug) ?? child.slug,
          })),
        };
      }
      if (item.type === 'page') {
        return { ...item, slug: toCohortSlug(item.slug) ?? item.slug };
      }
      return item;
    });

    const navSlug = slug;
    const navIcon = meta.icon ?? null;
    const sidebarIsHub = true;
    const sidebarDescription = hubDescription;

    const sidebarDaysSource = (learningPath.days ?? []) as DayEntry[];

    const timezone = cohort?.timezone ?? 'Europe/Paris';
    const { key: todayKey } = nowInTimezone(timezone);
    const dateKeyFromIso = (iso: string | null | undefined) => (iso ? iso.split('T')[0] : null);
    const releasedDaysRaw = sidebarDaysSource.filter((d) => {
      const locked = d.state ? /verrou/i.test(d.state) : false;
      if (locked) return false;
      const unlockKey = dateKeyFromIso(d.unlockDate ?? null);
      if (!unlockKey) return true;
      return unlockKey <= todayKey;
    });
    const releasedDaysForRender = releasedDaysRaw.map((day) => {
      if (!cohortSlug) return day;
      return { ...day, slug: toCohortSlug(day.slug) ?? day.slug };
    });

    // Trouver le jour courant et ses steps
    const currentDay = (learningPath.days as DayEntry[]).find((d) => d.slug === contentSlug) ?? null;
    const stepsForDay = currentDay?.steps ?? [];

    const spAll =
      (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) ||
      (searchParams as Record<string, string> | undefined);
    const stepIndexRaw = Number(spAll?.step ?? '1');
    const stepIdx = Number.isFinite(stepIndexRaw) && stepIndexRaw >= 1 ? stepIndexRaw - 1 : 0;
    const selectedActivityId = (spAll?.activity as string | undefined) || undefined;
    const currentStepId =
      selectedActivityId ||
      (stepsForDay && stepsForDay.length
        ? stepsForDay[stepIdx]?.id ?? stepsForDay[0]?.id
        : undefined);

    return (
      <div
        className="mx-auto flex w-full max-w-[1800px] gap-10"
        data-univers={universAttr}
        data-hub={sidebarIsHub ? '1' : undefined}
      >
        <HubFlag value={sidebarIsHub} />
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            parentIcon={navIcon}
            navigation={navigation}
            isHub={sidebarIsHub}
            hubDescription={sidebarDescription}
            releasedDays={releasedDaysForRender}
            learningKind={learningKind}
            unitLabelSingular={unitLabelSingular}
            unitLabelPlural={unitLabelPlural}
          />
        </div>

        <div className="lg:hidden">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            parentIcon={navIcon}
            navigation={navigation}
            isHub={sidebarIsHub}
            hubDescription={sidebarDescription}
            releasedDays={releasedDaysForRender}
            learningKind={learningKind}
            unitLabelSingular={unitLabelSingular}
            unitLabelPlural={unitLabelPlural}
          />
        </div>

        <section className="flex-1 min-w-0 lg:ml-0 space-y-8">
          {/* En-tête du jour dans une carte, inspirée des modules de sprint */}
          {currentDay ? (
            <PageSection variant="content" size="wide">
              <LearningHeader
                unitLabel={unitLabelSingular ?? 'Jour'}
                unitNumber={currentDay.order}
                title={currentDay.title}
                summary={currentDay.summary}
                currentStep={null}
                totalSteps={null}
              />
            </PageSection>
          ) : null}

          {stepsForDay && stepsForDay.length > 0 ? (
            <div className="space-y-6" id="steps">
              {currentStepId ? (
                <ActivityContent
                  activityId={currentStepId}
                  baseSlug={`/${slug}`}
                  className="prose-activity"
                  renderMode="day"
                />
              ) : null}

              {/* Barre de navigation bas de page, comme sur les modules de sprint */}
              <div className="h-16" />
              <StepNavBar
                basePath={`/${slug}`}
                currentIndex={stepIdx}
                total={stepsForDay.length}
                currentStepId={currentStepId ?? ''}
              />
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  if (showSidebar && !isMarketingChild) {
    const navTitle = isChildWithParent ? meta.parentTitle! : meta.title;
    const baseNavigation = isChildWithParent ? meta.parentNavigation! : meta.navigation!;

    // Attempt custom mini-nav for inline DB child pages
    let customNavigation: typeof baseNavigation | null = null;
    if (isChildWithParent) {
      try {
        // Load parent bundle blocks to detect linked databases
        const parentBundle = await unstable_cache(
          async () => await getPageBundle(meta.parentSlug!),
          ["page-bundle:" + meta.parentSlug!],
          { tags: ["page:" + meta.parentSlug!], revalidate: 60 }
        )();

        const parentBlocks: NotionBlock[] = (parentBundle?.blocks ?? []) as NotionBlock[];

        // Collect candidate database ids from parent blocks (linked_db, child_database, link_to_page:database_id)
        const dbIds = new Set<string>();
        const add = (v?: string | null) => { if (v && v.trim()) dbIds.add(v.trim()); };
        const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
        const visit = (nodes: ReadonlyArray<unknown>) => {
          for (const n of nodes) {
            if (!isRecord(n)) continue;
            const type = (n as { type?: string }).type;
            // child_database block: use block id as fallback
            if (type === 'child_database') {
              const idVal = (n as { id?: unknown }).id;
              add(typeof idVal === 'string' ? idVal : undefined);
            }
            // link_to_page to database
            const ltp = (n as { link_to_page?: unknown }).link_to_page;
            if (isRecord(ltp) && (ltp as { type?: string }).type === 'database_id') {
              const dbid = (ltp as { database_id?: unknown }).database_id;
              add(typeof dbid === 'string' ? dbid : undefined);
            }
            // linked_db shape
            const ldb = (n as { linked_db?: unknown }).linked_db;
            if (isRecord(ldb)) {
              const dbid = (ldb as { database_id?: unknown }).database_id;
              add(typeof dbid === 'string' ? dbid : undefined);
            }
            // collection pointer in format
            const fmt = (n as { format?: unknown }).format;
            const ptr = isRecord(fmt) ? (fmt as { collection_pointer?: unknown }).collection_pointer : null;
            if (isRecord(ptr)) {
              const pid = (ptr as { id?: unknown }).id;
              add(typeof pid === 'string' ? pid : undefined);
            }

            const children = (n as { __children?: unknown }).__children;
            if (Array.isArray(children) && children.length) visit(children as unknown[]);
          }
        };
        visit(parentBlocks as unknown[]);

        // Find the database bundle that contains the current page notionId
        const canonical = (s: string | null | undefined) => (s ? s.replace(/-/g, '').toLowerCase() : '');
        const currentId = canonical(bundle.meta.notionId);

        let matchedItems: Array<{ id: string; title: string; slug: string | null }> | null = null;
        for (const id of dbIds) {
          const entry = await getDbBundleFromCache(id, '_');
          const items = entry?.bundle?.items ?? [];
          if (!items.length) continue;
          const hasCurrent = items.some((it) => canonical(it.id) === currentId);
          if (hasCurrent) {
            matchedItems = items.map((it) => ({ id: it.id, title: it.title, slug: it.slug ?? null }));
            break;
          }
        }

        if (matchedItems && matchedItems.length) {
          const parent = meta.parentSlug!;
          const siblings = matchedItems
            .filter((it) => it.slug && canonical(it.id) !== currentId)
            .map((it) => ({ id: it.id, title: it.title, slug: `${parent}/${it.slug!}` }));

          customNavigation = [
            {
              type: 'page',
              title: `← ${meta.parentTitle ?? 'Retour'}`,
              slug: parent,
              icon: null,
            },
            {
              type: 'section',
              title: 'Autres contenus',
              children: siblings,
            },
          ] as typeof baseNavigation;
        }
      } catch {}
    }

    const navigation = (customNavigation ?? baseNavigation).map((item) => {
      if (item.type === 'section' && item.children) {
        return {
          ...item,
          children: item.children.map((child) => ({
            ...child,
            slug: toCohortSlug(child.slug) ?? child.slug,
          })),
        };
      }
      if (item.type === 'page') {
        return { ...item, slug: toCohortSlug(item.slug) ?? item.slug };
      }
      return item;
    });
    const navSlug = slug;
    const navIcon = isChildWithParent ? meta.parentIcon ?? null : meta.icon ?? null;
    const sidebarIsHub = Boolean(isChildWithParent ? meta.isHub : isHub);
    const sidebarDescription = hubDescription;

    let stepsForDay: import("@/lib/types").ActivityStep[] | null = null;
    if (isChildWithParent && meta.parentSlug) {
      const parentBundle = await unstable_cache(
        async () => await getPageBundle(meta.parentSlug!),
        ["page-bundle:" + meta.parentSlug!],
        { tags: ["page:" + meta.parentSlug!], revalidate: 60 }
      )();
      const parentLearningPath = parentBundle?.meta?.learningPath ?? null;
      const parentOverlay = applyCohortOverlay(parentLearningPath, cohort);
      const lp = parentOverlay ?? parentLearningPath;
      const match = lp?.days?.find((d) => d.slug === contentSlug);
      stepsForDay = match?.steps ?? null;
    }

    let sidebarDaysSource: DayEntry[] = [];
    if (sidebarIsHub) {
      if (isChildWithParent && meta.parentSlug) {
        const parent = await unstable_cache(
          async () => await getPageBundle(meta.parentSlug!),
          ["page-bundle:" + meta.parentSlug!],
          { tags: ["page:" + meta.parentSlug!], revalidate: 60 }
        )();
        const parentLearningPath = parent?.meta?.learningPath ?? null;
        const parentOverlay = applyCohortOverlay(parentLearningPath, cohort);
        sidebarDaysSource = (parentOverlay?.days ?? parentLearningPath?.days ?? []) as DayEntry[];
      } else {
        sidebarDaysSource = (learningPath?.days ?? []) as DayEntry[];
      }
    }

    const timezone = cohort?.timezone ?? 'Europe/Paris';
    const { key: todayKey } = nowInTimezone(timezone);
    const dateKeyFromIso = (iso: string | null | undefined) => (iso ? iso.split('T')[0] : null);
    const releasedDaysRaw = (sidebarDaysSource as DayEntry[]).filter((d) => {
      const locked = d.state ? /verrou/i.test(d.state) : false;
      if (locked) return false;
      const unlockKey = dateKeyFromIso(d.unlockDate ?? null);
      if (!unlockKey) return true;
      return unlockKey <= todayKey;
    });
    const releasedDaysForRender = releasedDaysRaw.map((day) => {
      if (!cohortSlug) return day;
      return { ...day, slug: toCohortSlug(day.slug) ?? day.slug };
    });

    const spAll = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const stepIndexRaw = Number(spAll?.step ?? '1');
    const stepIdx = Number.isFinite(stepIndexRaw) && stepIndexRaw >= 1 ? stepIndexRaw - 1 : 0;
    const selectedActivityId = (spAll?.activity as string | undefined) || undefined;
    const currentStepId = selectedActivityId
      || (stepsForDay && stepsForDay.length ? (stepsForDay[stepIdx]?.id ?? stepsForDay[0]?.id) : undefined);

    return (
      <div
        className="mx-auto flex w-full max-w-[1800px] gap-10"
        data-univers={universAttr}
        data-hub={sidebarIsHub ? '1' : undefined}
      >
        <HubFlag value={sidebarIsHub} />
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            parentIcon={navIcon}
            navigation={navigation}
            isHub={sidebarIsHub}
            hubDescription={sidebarDescription}
            releasedDays={releasedDaysForRender}
            learningKind={learningKind}
            unitLabelSingular={unitLabelSingular}
            unitLabelPlural={unitLabelPlural}
          />
        </div>

        <div className="lg:hidden">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            parentIcon={navIcon}
            navigation={navigation}
            isHub={sidebarIsHub}
            hubDescription={sidebarDescription}
            releasedDays={releasedDaysForRender}
            learningKind={learningKind}
            unitLabelSingular={unitLabelSingular}
            unitLabelPlural={unitLabelPlural}
          />
        </div>

        <section className="flex-1 min-w-0 lg:ml-0 space-y-8">
          <PageSection variant="content">
            <Blocks blocks={blocks} currentSlug={slug} />
          </PageSection>
          {sidebarIsHub && !isChildWithParent && learningPath?.days?.length ? (
            <StartToday days={learningPath.days as DayEntry[]} unitLabelSingular={unitLabelSingular} />
          ) : null}
          {isChildWithParent && sidebarIsHub ? (
            <div className="space-y-4" id="steps">
              {stepsForDay && stepsForDay.length > 0 ? (
                <>
                  <StepWizard steps={stepsForDay} basePath={`/${slug}`} />
                  {currentStepId ? (
                    <ActivityContent activityId={currentStepId} baseSlug={`/${slug}`} />
                  ) : null}
                  {(() => {
                    const total = stepsForDay.length;
                    const nextIdx = stepIdx + 1;
                    const hasMore = nextIdx < total;
                    let nextStepHref = hasMore ? `/${slug}?step=${nextIdx + 1}#steps` : null;
                    if (selectedActivityId) {
                      const conclusionIdx = stepsForDay.findIndex((s) => (s.type ?? '').toLowerCase().startsWith('conclusion'));
                      const targetIdx = conclusionIdx >= 0 ? conclusionIdx : total - 1;
                      nextStepHref = `/${slug}?step=${Math.max(1, targetIdx + 1)}#steps`;
                    }
                    let nextDaySlug: string | null = null;
                    const source = sidebarDaysSource as DayEntry[];
                    if (Array.isArray(source) && source.length) {
                      const idx = source.findIndex((d) => d.slug === contentSlug);
                      if (idx >= 0 && idx + 1 < source.length) {
                        nextDaySlug = toCohortSlug(source[idx + 1].slug);
                      }
                    }
                    return (
                      <NextLink
                        baseSlug={slug}
                        hasMoreSteps={hasMore}
                        nextStepHref={nextStepHref}
                        nextDaySlug={nextDaySlug ?? undefined}
                        fromActivity={Boolean(selectedActivityId)}
                      />
                    );
                  })()}
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  // Layout classique (avec ou sans full-width)
  const wrapperClass = isHub ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12" : isChallenge ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12" : "flex w-full flex-col gap-12";

  const KNOWN_TONES = ["flat", "accent", "highlight", "dark"] as const;
  type SectionTone = (typeof KNOWN_TONES)[number];
  const isTone = (value: unknown): SectionTone | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.toLowerCase() as SectionTone;
    return KNOWN_TONES.includes(normalized) ? normalized : undefined;
  };
  const parseBodyVariant = (value: unknown): MarketingSectionProps["bodyVariant"] | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!normalized) return undefined;
    return normalized as MarketingSectionProps["bodyVariant"];
  };

  const parsePreset = (blocksArr: NotionBlock[]) => {
    if (!blocksArr?.length)
      return { preset: null as string | null, blocks: blocksArr, tone: undefined as SectionTone | undefined, bodyVariant: undefined as MarketingSectionProps["bodyVariant"] };
    const [first, ...rest] = blocksArr;
    if (first.type === "code" && first.code?.rich_text?.length) {
      const txt = first.code.rich_text.map((r) => r.plain_text ?? "").join("").trim();
      let preset: string | null = null;
      let tone: SectionTone | undefined;
      let bodyVariant: MarketingSectionProps["bodyVariant"] | undefined;
      let parsedObject: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(txt);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedObject = parsed as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("[marketing] preset code block JSON invalid", { blockId: first.id, error });
      }
      if (parsedObject) {
        if (typeof parsedObject.preset === "string") {
          preset = parsedObject.preset.toLowerCase();
        }
        tone = isTone(parsedObject.tone ?? parsedObject.theme);
        bodyVariant = parseBodyVariant(parsedObject.bodyVariant ?? parsedObject.body);
      }
      if (!preset) {
        const match = /preset\s*:\s*([a-z0-9_-]+)/i.exec(txt);
        if (match) preset = match[1].toLowerCase();
      }
      const hasMetadata = Boolean(preset || tone || bodyVariant);
      if (hasMetadata) {
        return { preset, blocks: rest, tone, bodyVariant };
      }
    }
    return { preset: null as string | null, blocks: blocksArr, tone: undefined as SectionTone | undefined, bodyVariant: undefined as MarketingSectionProps["bodyVariant"] };
  };

  const splitBlocksByDivider = (blocksArr: NotionBlock[]) => {
    const sections: { id: string; index: number; blocks: NotionBlock[] }[] = [];
    let current: NotionBlock[] = [];
    const pushCurrent = () => {
      if (!current.length) return;
      const id = (current[0] as { id?: string }).id ?? `section-${sections.length}`;
      sections.push({ id, index: sections.length, blocks: current });
      current = [];
    };
    blocksArr.forEach((block) => {
      const type = (block as { type?: string }).type?.toLowerCase();
      if (type === "divider" || type === "hr" || type === "horizontal_rule") {
        pushCurrent();
        return;
      }
      current.push(block);
    });
    pushCurrent();
    if (!sections.length) {
      return [{ id: "section-0", index: 0, blocks: [] as NotionBlock[] }];
    }
    return sections;
  };

  const mapSectionsWithPreset = (
    rawSections: { id: string; index: number; blocks: NotionBlock[] }[]
  ) =>
    rawSections.map((section) => {
      const { preset, blocks: cleaned, tone, bodyVariant } = parsePreset(section.blocks as NotionBlock[]);
      const needsHeader = preset === "hero" || preset === "hero-split" || preset === "logos-band";
      if (needsHeader) {
        const { header, blocks: withoutHeader } = extractSectionHeader(cleaned as NotionBlock[]);
        return { ...section, preset, blocks: withoutHeader, header, tone, bodyVariant };
      }
      return {
        ...section,
        preset,
        blocks: cleaned,
        header: null,
        tone,
        bodyVariant,
      };
    });

  const renderSplitBlocks = (
    blocksArr: NotionBlock[],
    slugForBlocks: string,
    size: "narrow" | "balanced" | "wide" | "fluid" = "balanced",
    alternate = true,
    usePanels = true
  ) => {
    const SectionDivider = () => (
      <div className="section-divider" aria-hidden="true">
   
      </div>
    );
    const sections = mapSectionsWithPreset(
      usePanels ? splitBlocksIntoSections(blocksArr) : splitBlocksByDivider(blocksArr)
    );

    if (!usePanels) {
      const heroIndex = sections.findIndex((section) => {
        const preset = section.preset ?? "";
        return preset === "hero" || preset === "hero-split";
      });
      const heroSection = heroIndex >= 0 ? sections[heroIndex] : null;
      const logosSection =
        heroSection && sections[heroIndex + 1]?.preset === "logos-band"
          ? sections[heroIndex + 1]
          : null;

      const consumedIds = new Set<string>();
      if (heroSection) consumedIds.add(heroSection.id);
      if (logosSection) consumedIds.add(logosSection.id);

      const classicSections = sections.filter(
        (section) => !consumedIds.has(section.id) && (section.blocks as NotionBlock[])?.length
      );

      const toneCycle: SectionTone[] = ["flat", "accent", "highlight"];
      const renderClassicSections = classicSections.length ? (
        <div className="marketing-sections">
          {classicSections.map((section, idx) => {
            if (section.preset === "logos-band") {
              const logosInline = renderMarketingSection({
                preset: section.preset,
                blocks: section.blocks as NotionBlock[],
                title: section.header?.title ?? undefined,
                lead: section.header?.lead ?? undefined,
                eyebrow: section.header?.eyebrow ?? undefined,
                baseSlug: slugForBlocks,
              });
              return <Fragment key={section.id}>{logosInline}</Fragment>;
            }
            const tone = section.tone ?? (alternate ? toneCycle[idx % toneCycle.length] : "flat");
            return (
              <Fragment key={section.id}>
                {idx > 0}
                <section className="marketing-section" data-tone={tone}>
                  <DefaultMarketingSection
                    blocks={section.blocks as NotionBlock[]}
                    baseSlug={slugForBlocks}
                    bodyVariant={section.bodyVariant}
                  />
                </section>
              </Fragment>
            );
          })}
        </div>
      ) : null;

      const heroContent = heroSection
        ? renderMarketingSection({
            preset: heroSection.preset,
            blocks: heroSection.blocks as NotionBlock[],
            title: heroSection.header?.title ?? undefined,
            lead: heroSection.header?.lead ?? undefined,
            eyebrow: heroSection.header?.eyebrow ?? undefined,
            baseSlug: slugForBlocks,
          })
        : null;

      const logosContent = logosSection
        ? renderMarketingSection({
            preset: logosSection.preset,
            blocks: logosSection.blocks as NotionBlock[],
            title: logosSection.header?.title ?? undefined,
            lead: logosSection.header?.lead ?? undefined,
            eyebrow: logosSection.header?.eyebrow ?? undefined,
            baseSlug: slugForBlocks,
          })
        : null;

      return (
        <div className="marketing-stack">
          {(heroContent || logosContent) && (
            <div className="marketing-top">
              {heroContent ? (
                <div data-preset={heroSection?.preset ?? undefined}>{heroContent}</div>
              ) : null}
              {logosContent ? (
                <div data-preset="logos-band">{logosContent}</div>
              ) : null}
            </div>
          )}
          {renderClassicSections}
        </div>
      );
    }

    if (sections.length <= 1) {
      const singlePreset = sections[0]?.preset ?? null;
      const singleBlocks = (sections[0]?.blocks as NotionBlock[]) ?? blocksArr;
      if (!usePanels) {
        const presetClass = singlePreset ? `marketing-section--${singlePreset}` : "marketing-section--default";
        const bgClass = `marketing-section ${presetClass} marketing-section--tone-base`;
        return (
          <div className="marketing-sections">
            <section className={bgClass} data-preset={singlePreset ?? undefined} data-tone={sections[0]?.tone ?? undefined}>
              <DefaultMarketingSection
                blocks={singleBlocks}
                baseSlug={slugForBlocks}
                bodyVariant={sections[0]?.bodyVariant}
              />
            </section>
          </div>
        );
      }
      return (
        <PageSection variant="content" size={usePanels ? size : "fluid"} innerPadding={usePanels}>
          {usePanels ? (
            <div className="content-panel section-band w-full">
              <Blocks blocks={singleBlocks} currentSlug={slugForBlocks} />
            </div>
          ) : (
            <div
              className="marketing-section marketing-section--default marketing-section--tone-base"
              data-tone={sections[0]?.tone ?? undefined}
            >
              <DefaultMarketingSection
                blocks={singleBlocks}
                baseSlug={slugForBlocks}
                bodyVariant={sections[0]?.bodyVariant}
              />
            </div>
          )}
        </PageSection>
      );
    }
    return (
      <>
        {sections.map((section, idx) => {
          const tone = alternate ? (idx % 2 === 0 ? "default" : "alt") : "default";
          return (
            <Fragment key={section.id}>
              {idx > 0 && <SectionDivider />}
              <PageSection
                variant="content"
                tone={tone}
                size={usePanels ? size : "fluid"}
                innerPadding={usePanels}
                className={usePanels ? "py-[var(--space-5)] sm:py-[var(--space-6)]" : undefined}
              >
                <div className="content-panel section-band w-full">
                  <Blocks blocks={section.blocks} currentSlug={slugForBlocks} />
                </div>
              </PageSection>
            </Fragment>
          );
        })}
      </>
    );
  };

  const renderMarketingSection = ({
    preset,
    blocks,
    title,
    lead,
    eyebrow,
    baseSlug,
  }: {
    preset: string | null;
    blocks: NotionBlock[];
    title?: string | null;
    lead?: string | null;
    eyebrow?: string | null;
    baseSlug: string;
  }) => {
    switch (preset) {
      case "hero":
      case "hero-split":
        return (
          <HeroSplitSection
            preset={preset}
            blocks={blocks}
            title={title}
            lead={lead}
            eyebrow={eyebrow}
            baseSlug={baseSlug}
          />
        );
      case "logos-band":
        return (
          <LogosBandSection
            preset={preset}
            blocks={blocks}
            title={title}
            lead={lead}
            eyebrow={eyebrow}
            baseSlug={baseSlug}
          />
        );
      default:
        return null;
    }
  };

  if (isChallenge) {
    const subtitle = meta.description ?? null;
    const eyebrow = meta.parentTitle ?? null;
    return (
      <section className={wrapperClass} data-univers={universAttr} data-hub={isHub ? '1' : undefined}>
        <HubFlag value={Boolean(isHub)} />
        <ChallengeShell title={meta.title} subtitle={subtitle} eyebrow={eyebrow} size="wide">
          <div className="content-panel section-band w-full">
            <Blocks blocks={blocks} currentSlug={slug} />
          </div>
        </ChallengeShell>
      </section>
    );
  }

  const pageContent = (
    <section className={wrapperClass} data-univers={universAttr} data-hub={isHub ? '1' : undefined}>
      <HubFlag value={Boolean(isHub)} />
      {isHub && !isChildWithParent && !isVirtualDay ? (
        <>
          <PageSection variant="content" size="wide">
            <LearningHeader
              unitLabel="Programme"
              unitNumber={null}
              title={meta.title}
              summary={meta.description ?? null}
              currentStep={null}
              totalSteps={null}
            />
          </PageSection>
          {renderSplitBlocks(blocks as NotionBlock[], slug, "wide")}
          {learningPath?.days?.length ? (
            <PageSection variant="content" size="wide">
              <div className="content-panel w-full">
                <StartToday days={learningPath.days as DayEntry[]} unitLabelSingular={unitLabelSingular} />
              </div>
            </PageSection>
          ) : null}
        </>
      ) : (
        <>
          {isMarketingChild && meta.parentSlug ? (
            <div className="marketing-section__container marketing-child-nav__container">
              <div className="marketing-child-nav" role="navigation" aria-label="Navigation vers la page parente">
                <Link href={`/${meta.parentSlug}`} className="marketing-child-nav__link">
                  <span className="marketing-child-nav__icon" aria-hidden>
                    ←
                  </span>
                  <div className="marketing-child-nav__text">
                    <span className="marketing-child-nav__eyebrow">Retour</span>
                    <span className="marketing-child-nav__title">
                      {meta.parentTitle ?? "Page précédente"}
                    </span>
                  </div>
                </Link>
              </div>
              {marketingChildLinks.length ? (
                <div className="marketing-child-siblings" role="navigation" aria-label="Autres cas clients">
                  <span className="marketing-child-siblings__label">Autres cas clients</span>
                  <div className="marketing-child-siblings__list">
                    {marketingChildLinks.map((link) => {
                      const href = link.slug.startsWith("/") ? link.slug : `/${link.slug}`;
                      return (
                        <Link key={link.slug} href={href} className="marketing-child-siblings__pill">
                          {link.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {renderSplitBlocks(blocks as NotionBlock[], slug, "balanced", true, false)}
        </>
      )}
    </section>
  );

  return isMarketingPage ? <MarketingShell>{pageContent}</MarketingShell> : pageContent;
}
