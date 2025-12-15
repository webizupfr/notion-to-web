import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { getSprintBundle, getPageBundle } from "@/lib/content-store";
import { Blocks } from "@/components/notion/Blocks";
import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { LearningHeader } from "@/components/learning/LearningHeader";

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

export default async function SprintModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; moduleSlug: string }> | { slug: string; moduleSlug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug, moduleSlug } = await (params as Promise<{ slug: string; moduleSlug: string }>);
  const resolvedSearchParams =
    (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) ||
    (searchParams as Record<string, string> | undefined);

  const bundle = await unstable_cache(
    async () => await getSprintBundle(slug),
    ["sprint-bundle:" + slug],
    { tags: ["page:sprint:" + slug], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if (bundle.visibility === "private") {
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((resolvedSearchParams?.key ?? resolvedSearchParams?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = bundle.password?.trim() ?? "";
    if (!key) redirect(`/gate?next=/sprint/${slug}/${moduleSlug}`);
    if (password && key !== password) redirect(`/gate?next=/sprint/${slug}/${moduleSlug}&e=1`);
  }

  const moduleIndex = bundle.modules.findIndex((item) => item.slug === moduleSlug);
  const currentModule = moduleIndex >= 0 ? bundle.modules[moduleIndex] : undefined;

  // Fallback: if no module matches, try rendering a synced child page under this sprint
  if (!currentModule) {
    const childSlug = `sprint/${slug}/${moduleSlug}`;
    const childBundle = await unstable_cache(
      async () => await getPageBundle(childSlug),
      ["sprint-child:" + childSlug],
      { tags: ["page:" + childSlug], revalidate: 60 }
    )();

    if (!childBundle) return notFound();

    // Gate if the child page is private
    if ((childBundle.meta.visibility ?? 'public') === 'private') {
      const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
      const cookieKey = cookieStore.get('gate_key')?.value;
      const rawKey = ((resolvedSearchParams?.key ?? resolvedSearchParams?.token) as string | undefined) || cookieKey;
      const key = rawKey?.trim() ?? '';
      const password = childBundle.meta.password?.trim() ?? '';
      if (!key) redirect(`/gate?next=/${childSlug}`);
      if (password && key !== password) redirect(`/gate?next=/${childSlug}&e=1`);
    }

    const parentTitle = childBundle.meta.parentTitle ?? bundle.title;
    const parentSlug = childBundle.meta.parentSlug ?? `sprint/${slug}`;

    return (
      <>
        <PageSection variant="content">
          <div className="space-y-[var(--space-s)]">
            <Text variant="small" className="uppercase tracking-[0.14em] text-[color:var(--muted)]">
              {parentTitle}
            </Text>
            <Heading level={1}>{childBundle.meta.title}</Heading>
            <Link href={`/${parentSlug}`} className="btn btn-secondary w-fit">
              ← Retour au sprint
            </Link>
          </div>
        </PageSection>
        <PageSection variant="content">
          <Blocks blocks={childBundle.blocks} currentSlug={childSlug} />
        </PageSection>
      </>
    );
  }

  const timezone = bundle.timezone || "Europe/Paris";
  const unlockLabel = formatUnlock(currentModule.unlockAtISO, timezone);

  if (currentModule.isLocked) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 sm:px-12">
        <header className="space-y-3 text-center">
          <Heading level={1} className="text-[1.9rem] leading-[1.2] text-slate-900">{currentModule.title}</Heading>
          <Text variant="small" className="text-amber-700">
            Ce module est verrouillé pour le moment.
            {unlockLabel ? ` Déverrouillage prévu le ${unlockLabel}.` : ''}
          </Text>
        </header>
        <Link href={`/sprint/${slug}`} className="btn btn-primary self-center">
          Revenir au sprint
        </Link>
      </section>
    );
  }

  const moduleDayLabel =
    typeof currentModule.dayIndex === "number" && !Number.isNaN(currentModule.dayIndex)
      ? `Jour ${currentModule.dayIndex + 1}`
      : `Module ${currentModule.order > 0 ? currentModule.order : moduleIndex + 1}`;

  const parentSlug = `sprint/${slug}`;
  const modulesNavigation =
    bundle.modules.map((mod) => ({
      type: "page" as const,
      title: `${typeof mod.dayIndex === "number" ? `Jour ${mod.dayIndex + 1}` : `Module ${mod.order > 0 ? mod.order : 1}`} · ${mod.title}`,
      slug: `sprint/${slug}/${mod.slug}`,
    })) ?? [];

  const modulePage = await unstable_cache(
    async () => await getPageBundle(`sprint/${slug}/${moduleSlug}`),
    [`sprint-module:${slug}:${moduleSlug}`],
    { tags: [`page:sprint:${slug}:${moduleSlug}`], revalidate: 60 }
  )();

  const activities = currentModule.activities ?? [];
  const steps = activities.map((activity, idx) => ({
    id: activity.notionId,
    order: activity.order ?? idx + 1,
    title: activity.title,
    type: activity.type ?? "activité",
    duration: activity.duration ?? null,
  }));
  const basePath = `/sprint/${slug}/${moduleSlug}`;
  const stepParam = Number(resolvedSearchParams?.step ?? "1");
  const stepIdx = Number.isFinite(stepParam) && stepParam >= 1 && stepParam <= steps.length ? stepParam - 1 : 0;
  const currentStep = steps[stepIdx] ?? steps[0];

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={bundle.title}
          parentSlug={parentSlug}
          navigation={modulesNavigation}
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={bundle.title}
          parentSlug={parentSlug}
          navigation={modulesNavigation}
        />
      </div>

      <section className="flex-1 min-w-0 space-y-8">
        <PageSection variant="content" size="wide">
          <LearningHeader
            unitLabel={moduleDayLabel.startsWith("Jour") ? "Jour" : "Module"}
            unitNumber={currentModule.dayIndex !== null && currentModule.dayIndex !== undefined ? currentModule.dayIndex + 1 : currentModule.order}
            title={currentModule.title}
            summary={
              currentModule.description
                ? currentModule.description
                : modulePage?.meta?.description ?? null
            }
            currentStep={steps.length ? stepIdx + 1 : null}
            totalSteps={steps.length || null}
          />
        </PageSection>

        {modulePage?.blocks?.length ? (
          <PageSection variant="content">
            <div className="surface-panel">
              <Blocks blocks={modulePage.blocks} currentSlug={`sprint/${slug}/${moduleSlug}`} />
            </div>
          </PageSection>
        ) : null}

        {activities.length ? (
          <>
            {currentStep ? (
              <div id="steps" className="space-y-[var(--space-m)]">
                <ActivityContent
                  activityId={currentStep.id}
                  baseSlug={basePath}
                  renderMode="day"
                  withSurface
                />
              </div>
            ) : null}
            <StepNavBar
              basePath={basePath}
              currentIndex={stepIdx}
              total={steps.length}
              currentStepId={currentStep?.id ?? ""}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
