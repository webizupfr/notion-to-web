import { Blocks } from "@/components/notion/Blocks";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { getPageBundle, getDbBundleFromCache } from "@/lib/content-store";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { StepWizard } from "@/components/learning/StepWizard";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { NextLink } from "@/components/learning/NextLink";
import StartToday from "@/components/learning/StartToday";
import { cookies } from "next/headers";
import type { DayEntry } from "@/lib/types";
import { applyCohortOverlay, getCohortBySlug, nowInTimezone } from "@/lib/cohorts";
import { HubFlag } from "@/components/layout/HubFlag";

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
  const slug = slugSegments.join("/");

  let cohortSlug: string | null = null;
  const dataSegments = [...slugSegments];
  if (dataSegments.length >= 3 && dataSegments[1] === "c") {
    cohortSlug = dataSegments[2] ?? null;
    dataSegments.splice(1, 2);
  }

  const contentSlug = dataSegments.join("/");

  const bundle = await unstable_cache(
    async () => await getPageBundle(contentSlug),
    [`page-bundle:${contentSlug}`],
    { tags: [`page:${contentSlug}`], revalidate: 60 }
  )();
  
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
  const universAttr: "studio" | "lab" | undefined =
    (meta.univers as "studio" | "lab" | undefined) ||
    (slug.startsWith("lab") ? "lab" : slug.startsWith("studio") ? "studio" : undefined);

  const effectiveVisibility = cohort?.visibility ?? meta.visibility;
  const effectivePassword = (cohort?.password ?? meta.password) || null;
  const isPrivate = effectiveVisibility === "private";
  const isHub = Boolean(meta.isHub);
  const hubDescription = meta.description ?? null;

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
    return notFound();
  }

  // Déterminer si on affiche avec sidebar
  // Cas 1: Page parent avec navigation
  const hasNavigation = meta.navigation && meta.navigation.length > 0;
  const isParentWithNav = meta.fullWidth && hasNavigation;
  
  // Cas 2: Child page avec info du parent
  const isChildWithParent = meta.parentSlug && meta.parentNavigation;
  
  const showSidebar = isParentWithNav || isChildWithParent;

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

  if (showSidebar) {
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

        const parentBlocks = parentBundle?.blocks ?? [];

        // Collect candidate database ids from parent blocks (linked_db, child_database, link_to_page:database_id)
        const dbIds = new Set<string>();
        const add = (v?: string | null) => { if (v && v.trim()) dbIds.add(v.trim()); };
        const visit = (nodes: any[]) => {
          for (const b of nodes) {
            // child_database block: use block id as fallback
            if (b?.type === 'child_database') add(typeof b?.id === 'string' ? b.id : undefined);
            // link_to_page to database
            const ltp = (b as any)?.link_to_page;
            if (ltp && typeof ltp === 'object' && ltp.type === 'database_id') add(ltp.database_id as string);
            // linked_db shape
            const ldb = (b as any)?.linked_db;
            if (ldb && typeof ldb === 'object') add((ldb as any).database_id as string);
            // collection pointer in format
            const fmt = (b as any)?.format;
            const ptr = fmt && typeof fmt === 'object' ? (fmt as any).collection_pointer : null;
            if (ptr && typeof ptr === 'object') add((ptr as any).id as string);

            const children = (b as any)?.__children;
            if (Array.isArray(children) && children.length) visit(children);
          }
        };
        visit(parentBlocks as any[]);

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
          <Blocks blocks={blocks} currentSlug={slug} />
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
  const wrapperClass = meta.fullWidth
    ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12"
    : "mx-auto flex w-full max-w-4xl flex-col gap-12";

  return (
    <section className={wrapperClass} data-univers={universAttr} data-hub={isHub ? '1' : undefined}>
      <HubFlag value={Boolean(isHub)} />
      {/* Hub root: show content then AUJOURD’HUI card */}
      <Blocks blocks={blocks} currentSlug={slug} />
      {isHub && !isChildWithParent && learningPath?.days?.length ? (
        <StartToday days={learningPath.days as DayEntry[]} unitLabelSingular={unitLabelSingular} />
      ) : null}
    </section>
  );
}
