import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import "@/styles/hub.css";

import { getProgramTree } from "@/lib/programs";
import { auth } from "@/auth";
import { isEnrolled, getEnrollment, getProgramProgress } from "@/lib/db/progress";
import { hasActivePurchase } from "@/lib/db/purchases";
import type { NotionBlock } from "@/lib/notion";
import { buildDayEntriesFromProgram, unitLabelsFor } from "@/lib/program-nav";

import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { LearningHeader } from "@/components/learning/LearningHeader";
import { ActivityContent } from "@/components/learning/ActivityContent";
import { StepNavBar } from "@/components/learning/StepNavBar";
import { Blocks } from "@/components/notion/Blocks";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { CompleteActivityButton } from "@/components/lms/CompleteActivityButton";
import { ProgramResources } from "@/components/lms/ProgramResources";
import { LockedUnitScreen } from "@/components/lms/LockedUnitScreen";

export const revalidate = 0;

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; unitSlug: string }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const { slug, unitSlug } = await params;
  const tree = await getProgramTree(slug);
  if (!tree) return notFound();

  const { meta: programMeta, units } = tree;
  const currentEntry = units.find((u) => u.meta.slug === unitSlug);
  if (!currentEntry) return notFound();
  const currentUnit = currentEntry.meta;
  const stepsForUnit = currentEntry.steps;

  // Gate draft
  if (programMeta.publishingStatus === 'draft') {
    const session = await auth();
    if (session?.user?.role !== 'admin') return notFound();
  }

  // Gate paywall : si programme payant ET user pas acheté → redirect vers la page programme
  // (où il verra le bouton "Acheter pour X€"). L'admin contourne.
  if (programMeta.price && programMeta.price > 0) {
    const sessionAuthEarly = await auth();
    const isAdmin = sessionAuthEarly?.user?.role === 'admin';
    if (!isAdmin) {
      const userId = sessionAuthEarly?.user?.id;
      const owns = userId
        ? await hasActivePurchase({ userId, programSlug: slug })
        : false;
      if (!owns) {
        redirect(`/programs/${slug}?paywall=1`);
      }
    }
  }

  // Gate private
  if (programMeta.visibility === 'private' && programMeta.password) {
    const sp = (await searchParams?.catch(() => undefined)) || undefined;
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = (sp?.key ?? sp?.token) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = programMeta.password.trim();
    if (!key) redirect(`/gate?next=/programs/${slug}/${unitSlug}`);
    if (password && key !== password) redirect(`/gate?next=/programs/${slug}/${unitSlug}&e=1`);
  }

  // LMS enrollment + completion
  const sessionAuth = await auth();
  let userIsEnrolled = false;
  let unitCompleted = false;
  let enrolledAt: Date | null = null;
  let completedUnitIds = new Set<string>();
  if (sessionAuth?.user?.id) {
    userIsEnrolled = await isEnrolled({
      userId: sessionAuth.user.id,
      programType: programMeta.type,
      programSlug: slug,
    });
    if (userIsEnrolled) {
      const [enrollment, progress] = await Promise.all([
        getEnrollment({
          userId: sessionAuth.user.id,
          programType: programMeta.type,
          programSlug: slug,
        }),
        getProgramProgress({
          userId: sessionAuth.user.id,
          programType: programMeta.type,
          programSlug: slug,
        }),
      ]);
      enrolledAt = enrollment?.startedAt ?? enrollment?.enrolledAt ?? null;
      completedUnitIds = new Set(
        progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
      );
      unitCompleted = completedUnitIds.has(currentUnit.notionId);
    }
  }

  // Sidebar data — pas de "navigation" (les units sont déjà dans releasedDays pour éviter le doublon)
  const basePrefix = `programs/${slug}`;
  const days = buildDayEntriesFromProgram({
    tree,
    enrolledAt,
    basePath: basePrefix,
    completedUnitIds,
  });
  const labels = unitLabelsFor(programMeta.type);

  // Unit body blocks viennent directement du tree (sans callout ⚙️ ni child_pages)
  const sections = splitBlocksIntoSections(currentEntry.bodyBlocks as NotionBlock[]);

  // Step wizard (query ?step=N)
  const spAll = (await searchParams?.catch(() => undefined)) || undefined;
  const stepIndexRaw = Number(spAll?.step ?? "1");
  const stepIdx = Number.isFinite(stepIndexRaw) && stepIndexRaw >= 1 ? stepIndexRaw - 1 : 0;
  const currentStepEntry = stepsForUnit[stepIdx] ?? stepsForUnit[0] ?? null;
  const currentStep = currentStepEntry?.meta ?? null;
  const currentStepBlocks = (currentStepEntry?.bodyBlocks ?? []) as NotionBlock[];
  const unitBasePath = `/programs/${slug}/${unitSlug}`;

  // Prev / next unit
  const currentIndex = units.findIndex((u) => u.meta.slug === unitSlug);
  const prevUnit = currentIndex > 0 ? units[currentIndex - 1] : null;
  const nextUnit =
    currentIndex >= 0 && currentIndex < units.length - 1 ? units[currentIndex + 1] : null;

  const sidebarProps = {
    parentTitle: programMeta.title,
    parentSlug: basePrefix,
    parentIcon: null,
    navigation: [],
    isHub: true,
    hubDescription: programMeta.description ?? null,
    releasedDays: days,
    learningKind: labels.kind,
    unitLabelSingular: labels.singular,
    unitLabelPlural: labels.plural,
    actionsSlot: <ProgramResources resources={tree.pinnedResources} programSlug={slug} />,
    fullHeight: true,
  };

  // Gate drip : si la unit est verrouillée (date future), on affiche un écran "verrouillé"
  // au lieu du contenu.
  // Exceptions :
  //   - Admin : peut tout voir pour éditer
  //   - User qui a déjà complété la unit : peut toujours la relire (même si techniquement
  //     unlock dans le futur, ex: cas où on a force-completed via admin)
  const isAdmin = sessionAuth?.user?.role === 'admin';
  const currentDay = days.find((d) => d.id === currentUnit.notionId);
  const isUnitLocked = !isAdmin && !unitCompleted && Boolean(
    currentDay?.state && /verrou/i.test(currentDay.state),
  );

  if (isUnitLocked) {
    return (
      <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar {...sidebarProps} />
        </div>
        <div className="lg:hidden">
          <PageSidebar {...sidebarProps} />
        </div>
        <section className="flex-1 min-w-0 hub-content">
          <PageSection variant="content" size="wide">
            <LockedUnitScreen
              unitLabel={labels.singular}
              unitOrder={currentUnit.order}
              unitTitle={currentUnit.title}
              programSlug={slug}
              programTitle={programMeta.title}
              unlockDateIso={currentDay?.unlockDate ?? null}
            />
          </PageSection>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar {...sidebarProps} />
      </div>

      <div className="lg:hidden">
        <PageSidebar {...sidebarProps} />
      </div>

      <section className="flex-1 min-w-0 hub-content">
        {/* Header */}
        <PageSection variant="content" size="wide">
          <LearningHeader
            unitLabel={labels.singular}
            unitNumber={currentUnit.order}
            title={currentUnit.title}
            summary={currentUnit.summary ?? null}
            currentStep={stepsForUnit.length ? stepIdx + 1 : null}
            totalSteps={stepsForUnit.length || null}
            completed={unitCompleted}
          />
        </PageSection>

        {/* Complete banner — only if enrolled and no steps (when steps exist, completion is in StepNavBar) */}
        {userIsEnrolled && stepsForUnit.length === 0 ? (
          <PageSection variant="content" size="wide" paddingY="tight">
            <div className="flex items-center justify-between gap-[var(--space-md)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                  Progression
                </span>
                <span className="text-[0.9rem] text-[color:var(--text-secondary)]">
                  {unitCompleted
                    ? `Tu as terminé ${labels.singular.toLowerCase()} ${String(currentUnit.order).padStart(2, "0")}`
                    : `Marque ${labels.singular.toLowerCase()} ${String(currentUnit.order).padStart(2, "0")} comme terminé${labels.singular === 'Module' ? '' : 'e'}`}
                </span>
              </div>
              <CompleteActivityButton
                programType={programMeta.type}
                programSlug={slug}
                activityNotionId={currentUnit.notionId}
                activitySlug={unitSlug}
                alreadyCompleted={unitCompleted}
                label="Marquer terminé"
                labelCompleted="Terminé ✓"
                className="btn btn-primary"
              />
            </div>
          </PageSection>
        ) : null}

        {/* Unit body — Notion blocks de la page unit.
            ➜ Affiché UNIQUEMENT si pas de steps (sinon on répète l'intro à chaque étape).
            Quand il y a des steps, tout le contenu utile est dans le step wizard. */}
        {stepsForUnit.length === 0 && sections.length > 0
          ? sections.map((section, idx) => {
              const tone = idx % 2 === 0 ? "default" : "alt";
              return (
                <PageSection
                  key={section.id}
                  variant="content"
                  tone={tone}
                  size="wide"
                >
                  <div className="content-panel section-band w-full">
                    <Blocks
                      blocks={section.blocks}
                      currentSlug={`${basePrefix}/${unitSlug}`}
                      navigation={[]}
                    />
                  </div>
                </PageSection>
              );
            })
          : null}

        {/* Steps wizard */}
        {stepsForUnit.length > 0 && currentStep ? (
          <div className="space-y-[var(--space-m)]" id="steps">
            <PageSection variant="content" size="wide">
              <ActivityContent
                activityId={currentStep.notionId}
                baseSlug={unitBasePath}
                renderMode="day"
                blocks={currentStepBlocks}
              />
            </PageSection>
            <StepNavBar
              basePath={unitBasePath}
              currentIndex={stepIdx}
              total={stepsForUnit.length}
              currentStepId={currentStep.notionId}
              completion={{
                programType: programMeta.type,
                programSlug: slug,
                cohortSlug: null,
                unitNotionId: currentUnit.notionId,
                unitSlug,
                returnTo: `/programs/${slug}`,
                alreadyCompleted: unitCompleted,
                label: `Terminer ${labels.singular.toLowerCase()}`,
                labelCompleted: 'Terminé ✓',
              }}
            />
          </div>
        ) : null}

        {/* Prev / next unit — UNIQUEMENT si pas de steps (sinon le StepNavBar gère la nav).
            Évite la superposition visuelle entre le StepNavBar sticky et ce lien. */}
        {stepsForUnit.length === 0 && (prevUnit || nextUnit) && (
          <PageSection variant="content" size="wide" paddingY="tight">
            <div className="flex items-center justify-between gap-2">
              {prevUnit ? (
                <Link
                  href={`/programs/${slug}/${prevUnit.meta.slug}`}
                  className="btn btn-secondary"
                  style={{ height: 36, padding: '0 14px', fontSize: 13 }}
                >
                  ← {prevUnit.meta.title}
                </Link>
              ) : <span />}
              {nextUnit ? (
                <Link
                  href={`/programs/${slug}/${nextUnit.meta.slug}`}
                  className="btn btn-primary"
                  style={{ height: 36, padding: '0 14px', fontSize: 13 }}
                >
                  {nextUnit.meta.title} →
                </Link>
              ) : <span />}
            </div>
          </PageSection>
        )}
      </section>
    </div>
  );
}
