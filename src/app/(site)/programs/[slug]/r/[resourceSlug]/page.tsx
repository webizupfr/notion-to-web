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
import { Heading } from "@/components/ui/Heading";
import { Blocks } from "@/components/notion/Blocks";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { ProgramResources } from "@/components/lms/ProgramResources";

export const revalidate = 0;

/**
 * Page Ressource — rend une child_page Notion (du callout 📌) nativement
 * sur la plateforme.
 *
 *   URL : /programs/[slug]/r/[resourceSlug]
 *
 * - Toujours accessible (pas de drip, pas de gating temporel)
 * - Sidebar identique aux pages programme/unit
 * - Pas de step wizard (juste une page de contenu pure)
 */
export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; resourceSlug: string }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const { slug, resourceSlug } = await params;
  const tree = await getProgramTree(slug);
  if (!tree) return notFound();

  const resource = tree.pinnedResources.find(
    (r) => r.kind === 'internal' && r.slug === resourceSlug,
  );
  if (!resource) return notFound();

  const { meta: programMeta } = tree;

  // Gate draft (admin contourne)
  if (programMeta.publishingStatus === 'draft') {
    const session = await auth();
    if (session?.user?.role !== 'admin') return notFound();
  }

  // Gate paywall (idem unit page)
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
    if (!key) redirect(`/gate?next=/programs/${slug}/r/${resourceSlug}`);
    if (password && key !== password) redirect(`/gate?next=/programs/${slug}/r/${resourceSlug}&e=1`);
  }

  // Données sidebar (mêmes que page programme)
  const sessionAuth = await auth();
  let enrolledAt: Date | null = null;
  let completedUnitIds = new Set<string>();
  if (sessionAuth?.user?.id) {
    const userIsEnrolled = await isEnrolled({
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
    }
  }

  const basePrefix = `programs/${slug}`;
  const days = buildDayEntriesFromProgram({
    tree,
    enrolledAt,
    basePath: basePrefix,
    completedUnitIds,
  });
  const labels = unitLabelsFor(programMeta.type);

  // Body de la ressource (pré-fetché dans le tree)
  const bodyBlocks = (resource.bodyBlocks ?? []) as NotionBlock[];
  const sections = splitBlocksIntoSections(bodyBlocks);

  // En mode "modules" (sync/event), la sidebar utilise moduleQuickGroups.
  const moduleQuickGroups =
    labels.kind === 'modules'
      ? [
          {
            label: labels.plural,
            items: days.map((day) => ({
              id: day.id,
              title: day.title,
              slug: day.slug,
              order: day.order,
              state: day.state,
              unlockDate: day.unlockDate,
              completed: day.completed,
            })),
          },
        ]
      : undefined;

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
    moduleQuickGroups,
    actionsSlot: <ProgramResources resources={tree.pinnedResources} programSlug={slug} />,
    fullHeight: true,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10" data-hub="1">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar {...sidebarProps} />
      </div>
      <div className="lg:hidden">
        <PageSidebar {...sidebarProps} />
      </div>

      <section className="flex-1 min-w-0 hub-content">
        <PageSection variant="content" size="fluid">
          <header className="border-b border-[color:var(--border-subtle)] pb-[var(--space-md)] mb-[var(--space-lg)]">
            <span className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              Ressource · {programMeta.title}
            </span>
            <Heading level={1} className="mt-[var(--space-sm)]">
              {resource.label}
            </Heading>
          </header>
        </PageSection>

        {sections.length > 0 ? (
          sections.map((section, idx) => {
            const tone = idx % 2 === 0 ? "default" : "alt";
            return (
              <PageSection
                key={section.id}
                variant="content"
                tone={tone}
                size="fluid"
              >
                <div className="content-panel section-band w-full">
                  <Blocks
                    blocks={section.blocks}
                    currentSlug={`${basePrefix}/r/${resourceSlug}`}
                    navigation={[]}
                  />
                </div>
              </PageSection>
            );
          })
        ) : (
          <PageSection variant="content" size="fluid">
            <p className="text-[color:var(--text-secondary)]">
              Cette ressource n&apos;a pas encore de contenu. Re-sync le programme depuis l&apos;admin
              pour récupérer les dernières modifications de Notion.
            </p>
          </PageSection>
        )}
      </section>
    </div>
  );
}
